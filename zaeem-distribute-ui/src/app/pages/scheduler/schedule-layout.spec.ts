import { describe, expect, it } from 'vitest';
import { Booking } from '../../services/rental-dates';
import { layoutRow, packLanes, windowDays } from './schedule-layout';

const b = (startDate: string, endDate: string, extra: Partial<Booking> = {}): Booking => ({ startDate, endDate, ...extra });

describe('packLanes', () => {
  it('puts overlapping bookings in separate lanes', () => {
    expect(packLanes([b('2026-10-14', '2026-10-21'), b('2026-10-17', '2026-10-19')])).toEqual({ lanes: [0, 1], laneCount: 2 });
  });

  it('keeps back-to-back bookings in the same lane', () => {
    expect(packLanes([b('2026-10-14', '2026-10-21'), b('2026-10-22', '2026-10-25')])).toEqual({ lanes: [0, 0], laneCount: 1 });
  });

  it('treats end dates as inclusive: starting on the day another ends is an overlap', () => {
    expect(packLanes([b('2026-10-14', '2026-10-21'), b('2026-10-21', '2026-10-25')]).laneCount).toBe(2);
  });

  it('places a booking contained in another in its own lane and reuses freed lanes', () => {
    const result = packLanes([
      b('2026-10-10', '2026-10-30'), // long
      b('2026-10-12', '2026-10-14'), // inside the long one
      b('2026-10-15', '2026-10-18'), // after the short one ends: reuses lane 1
      b('2026-10-16', '2026-10-17'), // overlaps both: lane 2
    ]);
    expect(result).toEqual({ lanes: [0, 1, 1, 2], laneCount: 3 });
  });

  it('is independent of input order', () => {
    const late = b('2026-10-22', '2026-10-25');
    const early = b('2026-10-14', '2026-10-21');
    expect(packLanes([late, early])).toEqual({ lanes: [0, 0], laneCount: 1 });
  });
});

describe('layoutRow', () => {
  const days = windowDays(new Date(2026, 9, 16)); // Oct 16 – Oct 29, 2026

  it('builds a 14-day window from local midnight', () => {
    expect(days).toHaveLength(14);
    expect(days[0]).toEqual(new Date(2026, 9, 16));
    expect(days[13]).toEqual(new Date(2026, 9, 29));
  });

  it('clips bookings to the window and flags continuation on both sides', () => {
    const { bars } = layoutRow([b('2026-10-14T00:00:00', '2026-10-21T00:00:00'), b('2026-10-27', '2026-11-03')], days);
    expect(bars[0]).toMatchObject({ startColumn: 0, span: 6, continuesBefore: true, continuesAfter: false });
    expect(bars[1]).toMatchObject({ startColumn: 11, span: 3, continuesBefore: false, continuesAfter: true });
  });

  it('drops cancelled bookings and bookings outside the window', () => {
    const { bars, laneCount } = layoutRow([
      b('2026-10-17', '2026-10-19', { status: 'Cancelled' }),
      b('2026-10-01', '2026-10-15'),
      b('2026-10-30', '2026-11-02'),
    ], days);
    expect(bars).toEqual([]);
    expect(laneCount).toBe(1);
  });

  it('packs only the visible bookings into lanes', () => {
    const { bars, laneCount } = layoutRow([b('2026-10-14', '2026-10-21'), b('2026-10-17', '2026-10-19'), b('2026-10-23', '2026-10-24')], days);
    expect(bars.map(x => x.lane)).toEqual([0, 1, 0]);
    expect(laneCount).toBe(2);
  });
});
