import { describe, expect, it } from 'vitest';
import { findBookingConflict, rentalDays, rentalStatus, toLocalDay, toIsoDay } from './rental-dates';

describe('toLocalDay', () => {
  it('parses a date-input value as local midnight, not UTC', () => {
    const d = toLocalDay('2026-10-16');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 16, 0]);
  });

  it('truncates a backend timestamp to its local day', () => {
    const d = toLocalDay('2026-10-16T15:30:00');
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([16, 0, 0]);
  });
});

describe('toIsoDay', () => {
  it('formats using local calendar fields', () => {
    expect(toIsoDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('rentalDays', () => {
  it('counts whole days between start and end', () => {
    expect(rentalDays('2026-10-16', '2026-10-19')).toBe(4);
  });

  it('returns 0 when end is not after start', () => {
    expect(rentalDays('2026-10-16', '2026-10-16')).toBe(0);
    expect(rentalDays('2026-10-16', '2026-10-10')).toBe(0);
  });
});

describe('rentalStatus', () => {
  const today = new Date(2026, 9, 16, 14, 0);
  const r = (startDate: string, endDate: string, status?: string) => ({ startDate, endDate, status });

  it('keeps Cancelled regardless of dates', () => {
    expect(rentalStatus(r('2026-10-10', '2026-10-20', 'Cancelled'), today)).toBe('Cancelled');
  });

  it('derives Pending / Active / Completed from the dates, ignoring a stale stored status', () => {
    expect(rentalStatus(r('2026-10-17', '2026-10-20', 'Active'), today)).toBe('Pending');
    expect(rentalStatus(r('2026-10-16', '2026-10-16', 'Active'), today)).toBe('Active');
    expect(rentalStatus(r('2026-10-01', '2026-10-15', 'Active'), today)).toBe('Completed');
  });
});

describe('findBookingConflict', () => {
  const existing = [
    { plateNumber: 'DX-7728', startDate: '2026-10-10', endDate: '2026-10-15', status: 'Active' },
    { plateNumber: 'PL-4491', startDate: '2026-10-10', endDate: '2026-10-15', status: 'Cancelled' }
  ];

  it('flags an overlapping booking for the same plate (case/whitespace-insensitive)', () => {
    const hit = findBookingConflict({ plateNumber: ' dx-7728 ', startDate: '2026-10-14', endDate: '2026-10-18' }, existing);
    expect(hit).toBe(existing[0]);
  });

  it('treats the end date as booked (inclusive overlap)', () => {
    expect(findBookingConflict({ plateNumber: 'DX-7728', startDate: '2026-10-15', endDate: '2026-10-17' }, existing)).toBeDefined();
  });

  it('allows the same plate on non-overlapping dates', () => {
    expect(findBookingConflict({ plateNumber: 'DX-7728', startDate: '2026-10-16', endDate: '2026-10-20' }, existing)).toBeUndefined();
  });

  it('ignores cancelled bookings and other plates', () => {
    expect(findBookingConflict({ plateNumber: 'PL-4491', startDate: '2026-10-11', endDate: '2026-10-12' }, existing)).toBeUndefined();
    expect(findBookingConflict({ plateNumber: 'ZZ-0001', startDate: '2026-10-11', endDate: '2026-10-12' }, existing)).toBeUndefined();
  });
});
