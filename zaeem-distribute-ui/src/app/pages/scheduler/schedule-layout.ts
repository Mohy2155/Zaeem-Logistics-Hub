import { Booking, toLocalDay } from '../../services/rental-dates';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `from` to `to` (both local midnights); rounding absorbs DST hours. */
const dayIndex = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);

export const WINDOW_DAYS = 14;

/** The days shown, starting at local midnight of `start`. */
export function windowDays(start: Date, days: number = WINDOW_DAYS): Date[] {
  const first = toLocalDay(start);
  return Array.from({ length: days }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
}

/**
 * Design D6: sort by start date, then put each booking in the first lane whose last booking ended
 * before it starts (end dates are inclusive, so a booking starting the day another ends needs a new lane).
 * Returns the lane index for each booking, in input order, and the number of lanes used.
 */
export function packLanes<T extends Booking>(bookings: readonly T[]): { lanes: number[]; laneCount: number } {
  const order = bookings
    .map((booking, index) => ({ index, start: toLocalDay(booking.startDate).getTime(), end: toLocalDay(booking.endDate).getTime() }))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.index - b.index);

  const laneEnds: number[] = [];
  const lanes = new Array<number>(bookings.length);
  for (const item of order) {
    let lane = laneEnds.findIndex(end => end < item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    lanes[item.index] = lane;
  }
  return { lanes, laneCount: laneEnds.length };
}

export interface PlacedBooking<T> {
  booking: T;
  lane: number;
  /** 0-based index of the first visible day. */
  startColumn: number;
  /** Number of visible days the bar covers. */
  span: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export interface RowLayout<T> {
  /** At least 1, so empty rows keep their height. */
  laneCount: number;
  bars: PlacedBooking<T>[];
}

/** Lays out one machine type's bookings in the window: cancelled ones are dropped, the rest clipped and packed. */
export function layoutRow<T extends Booking>(bookings: readonly T[], days: readonly Date[]): RowLayout<T> {
  if (days.length === 0) return { laneCount: 1, bars: [] };
  const first = days[0];
  const last = days[days.length - 1];

  const visible = bookings.filter(b =>
    b.status !== 'Cancelled' && toLocalDay(b.endDate) >= first && toLocalDay(b.startDate) <= last);
  const { lanes, laneCount } = packLanes(visible);

  const bars = visible.map((booking, i) => {
    const start = toLocalDay(booking.startDate);
    const end = toLocalDay(booking.endDate);
    const clippedStart = start < first ? first : start;
    const clippedEnd = end > last ? last : end;
    return {
      booking,
      lane: lanes[i],
      startColumn: dayIndex(first, clippedStart),
      span: dayIndex(clippedStart, clippedEnd) + 1,
      continuesBefore: start < first,
      continuesAfter: end > last,
    };
  });
  return { laneCount: Math.max(1, laneCount), bars };
}
