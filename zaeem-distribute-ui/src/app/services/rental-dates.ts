const DAY_MS = 24 * 60 * 60 * 1000;

export type RentalStatus = 'Pending' | 'Active' | 'Completed' | 'Cancelled';

export interface Booking {
  plateNumber?: string;
  startDate: string;
  endDate: string;
  status?: string;
}

/**
 * Local-midnight Date for a rental date. 'YYYY-MM-DD' (from <input type="date">) is parsed as a
 * local calendar day; `new Date('YYYY-MM-DD')` would parse it as UTC and shift the day west of GMT.
 */
export function toLocalDay(value: string | Date): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** 'YYYY-MM-DD' from local calendar fields (toISOString() would use the UTC day). */
export function toIsoDay(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Billable days between start and end; 0 when the range is empty or inverted. */
export function rentalDays(start: string, end: string): number {
  // Math.round absorbs the 23h/25h days around DST switches.
  return Math.max(0, Math.round((toLocalDay(end).getTime() - toLocalDay(start).getTime()) / DAY_MS));
}

/** Status derived from the dates; the stored status only matters once a rental is cancelled. */
export function rentalStatus(rental: Booking, today: Date = new Date()): RentalStatus {
  if (rental.status === 'Cancelled') return 'Cancelled';
  const day = toLocalDay(today);
  if (day < toLocalDay(rental.startDate)) return 'Pending';
  if (day > toLocalDay(rental.endDate)) return 'Completed';
  return 'Active';
}

export function normalizePlate(plate?: string): string {
  return (plate ?? '').trim().toUpperCase();
}

/** First non-cancelled booking of the same plate whose dates overlap (end dates inclusive). */
export function findBookingConflict<T extends Booking>(candidate: Booking, existing: T[]): T | undefined {
  const plate = normalizePlate(candidate.plateNumber);
  const start = toLocalDay(candidate.startDate);
  const end = toLocalDay(candidate.endDate);
  return existing.find(b =>
    b.status !== 'Cancelled' &&
    normalizePlate(b.plateNumber) === plate &&
    start <= toLocalDay(b.endDate) &&
    end >= toLocalDay(b.startDate)
  );
}
