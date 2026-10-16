import { ActiveRental, Machinery } from '../../services/company';
import { findBookingConflict, normalizePlate, rentalDays } from '../../services/rental-dates';

export interface OrderLineItem {
  machineId: number;
  machineName: string;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyRate: number;
  discount: number;
  lineTotal: number;
  plateNumber: string;
  taxType: string;
  taxPercent: number;
}

export const roundCents = (value: number) => Math.round(value * 100) / 100;

export interface LinePrice {
  days: number;
  /** Days × daily rate, before discount. */
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  /** What the line bills; the authoritative amount, rounded to cents. */
  total: number;
}

/**
 * Price of one line: discount first, then tax on the discounted amount, billed in whole cents.
 * The discount and tax amounts are derived so that subtotal − discount + tax = total exactly.
 */
export function priceLine(days: number, dailyRate: number, discountPercent: number, taxPercent: number): LinePrice {
  const subtotal = days * dailyRate;
  const discounted = subtotal * (1 - (discountPercent || 0) / 100);
  const total = roundCents(discounted * (1 + (taxPercent || 0) / 100));
  const discountAmount = roundCents(subtotal - discounted);
  return { days, subtotal: roundCents(subtotal), discountAmount, taxAmount: roundCents(total - roundCents(subtotal) + discountAmount), total };
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  tax: number;
  /** Sum of the line amounts. */
  grandTotal: number;
}

export function cartTotals(items: readonly OrderLineItem[]): CartTotals {
  let subtotal = 0;
  let discount = 0;
  for (const item of items) {
    const price = priceLine(item.rentalDays, item.dailyRate, item.discount, item.taxPercent);
    subtotal += price.subtotal;
    discount += price.discountAmount;
  }
  const grandTotal = roundCents(items.reduce((sum, item) => sum + item.lineTotal, 0));
  subtotal = roundCents(subtotal);
  discount = roundCents(discount);
  return { subtotal, discount, tax: roundCents(grandTotal - subtotal + discount), grandTotal };
}

/** The fields of the order form, as entered. */
export interface OrderDraft {
  clientId: number;
  machineId: number;
  startDate: string;
  endDate: string;
  plateNumber: string;
  taxType: string;
  taxPercent: number | null;
  discount: number | null;
}

export type DraftField = 'client' | 'machine' | 'startDate' | 'endDate' | 'plate' | 'taxPercent' | 'discount';

export interface BookingConflict {
  startDate: string;
  endDate: string;
  source: 'booking' | 'cart';
}

export interface DraftCheck {
  /** One message per field with a problem; required-field messages are included too. */
  errors: Partial<Record<DraftField, string>>;
  /** Fields whose only problem is that nothing was entered yet. */
  missing: DraftField[];
  conflict: BookingConflict | null;
  /** Line price once machine and a valid period are known. */
  preview: LinePrice | null;
  valid: boolean;
}

/** Validates the draft line and prices it; the add action is allowed only when `valid`. */
export function checkDraft(
  draft: OrderDraft,
  machinery: readonly Machinery[],
  cart: readonly OrderLineItem[],
  rentals: readonly ActiveRental[],
): DraftCheck {
  const errors: Partial<Record<DraftField, string>> = {};
  const machine = machinery.find(m => m.id === Number(draft.machineId));
  const discount = draft.discount ?? 0;
  const tax = draft.taxPercent ?? 0;

  const missing: DraftField[] = [];
  const require = (field: DraftField, present: boolean, message: string) => {
    if (present) return;
    errors[field] = message;
    missing.push(field);
  };

  const plate = normalizePlate(draft.plateNumber);
  require('client', Number(draft.clientId) > 0, 'Select the client this order is for.');
  require('machine', !!machine, 'Choose a machine type.');
  require('startDate', !!draft.startDate, 'Enter a start date.');
  require('endDate', !!draft.endDate, 'Enter an end date.');
  require('plate', !!plate, 'Enter the plate number of the unit.');
  if (draft.startDate && draft.endDate && rentalDays(draft.startDate, draft.endDate) <= 0) {
    errors.endDate = 'The end date must be after the start date.';
  }
  if (discount < 0 || discount > 100) errors.discount = 'Enter a discount between 0 and 100%.';
  if (tax < 0) errors.taxPercent = 'Tax cannot be negative.';
  else if (tax > 100) errors.taxPercent = 'Tax cannot be more than 100%.';

  let conflict: BookingConflict | null = null;
  if (plate && draft.startDate && draft.endDate && !errors.endDate) {
    const candidate = { plateNumber: plate, startDate: draft.startDate, endDate: draft.endDate };
    const inCart = findBookingConflict(candidate, cart);
    const booked = inCart ? undefined : findBookingConflict(candidate, rentals);
    const hit = inCart ?? booked;
    if (hit) conflict = { startDate: hit.startDate, endDate: hit.endDate, source: inCart ? 'cart' : 'booking' };
  }

  const preview = machine && draft.startDate && draft.endDate && !errors.endDate
    ? priceLine(rentalDays(draft.startDate, draft.endDate), machine.dailyRate, Math.min(Math.max(discount, 0), 100), Math.max(tax, 0))
    : null;

  return { errors, missing, conflict, preview, valid: Object.keys(errors).length === 0 && !conflict };
}
