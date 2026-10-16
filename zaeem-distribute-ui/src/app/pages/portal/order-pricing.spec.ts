import { describe, expect, it } from 'vitest';
import { ActiveRental } from '../../services/company';
import { MACHINERY_CATALOG } from '../../services/fleet';
import { rentalDays } from '../../services/rental-dates';
import { OrderDraft, OrderLineItem, cartTotals, checkDraft, priceLine } from './order-pricing';

/** The portal's pre-overhaul line calculation, kept verbatim as the reference. */
function legacyLineTotal(days: number, dailyRate: number, discountOverride: number, taxPercent: number): number {
  const subtotal = days * (dailyRate || 0);
  const discounted = subtotal * (1 - ((discountOverride || 0) / 100));
  const total = discounted * (1 + ((taxPercent || 0) / 100));
  return Math.round(total * 100) / 100;
}

const line = (days: number, dailyRate: number, discount: number, taxPercent: number, extra: Partial<OrderLineItem> = {}): OrderLineItem => ({
  machineId: 101, machineName: 'Excavator X3000', startDate: '2026-10-20', endDate: '2026-10-27', rentalDays: days,
  dailyRate, discount, taxPercent, taxType: taxPercent ? 'VAT' : 'None', plateNumber: 'DX-9001',
  lineTotal: legacyLineTotal(days, dailyRate, discount, taxPercent), ...extra,
});

describe('priceLine', () => {
  const cases: [string, number, number, number, number][] = [
    ['no discount, 5% VAT', 7, 450, 0, 5],
    ['10% discount, 5% VAT', 7, 450, 10, 5],
    ['tax "None" (0%)', 3, 850, 0, 0],
    ['fractional discount and tax', 3, 333.33, 12.5, 7.25],
    ['rounding at half a cent', 1, 10.005, 0, 0],
    ['100% discount', 4, 550, 100, 5],
  ];

  it.each(cases)('matches the previous portal calculation: %s', (_label, days, rate, discount, tax) => {
    expect(priceLine(days, rate, discount, tax).total).toBe(legacyLineTotal(days, rate, discount, tax));
  });

  it('breaks the line down so that subtotal − discount + tax = total', () => {
    const price = priceLine(7, 450, 10, 5);
    expect(price).toEqual({ days: 7, subtotal: 3150, discountAmount: 315, taxAmount: 141.75, total: 2976.75 });
  });

  it('gives zero tax for tax type "None"', () => {
    expect(priceLine(3, 850, 0, 0)).toMatchObject({ taxAmount: 0, total: 2550 });
  });
});

describe('cartTotals', () => {
  it('sums the lines and keeps the grand total equal to the sum of line amounts', () => {
    const items = [line(7, 450, 10, 5), line(3, 333.33, 12.5, 7.25), line(2, 320, 0, 0)];
    const totals = cartTotals(items);
    const sumOfLines = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;

    expect(totals.grandTotal).toBe(sumOfLines);
    expect(Math.round((totals.subtotal - totals.discount + totals.tax) * 100) / 100).toBe(totals.grandTotal);
    expect(totals.subtotal).toBe(4789.99);
  });

  it('is all zeros for an empty cart', () => {
    expect(cartTotals([])).toEqual({ subtotal: 0, discount: 0, tax: 0, grandTotal: 0 });
  });
});

describe('checkDraft', () => {
  const booked: ActiveRental[] = [{
    id: '1', companyName: 'Build-It Corp', machineName: 'Excavator X3000', plateNumber: 'DX-7728',
    startDate: '2026-10-14T00:00:00', endDate: '2026-10-21T00:00:00', dailyRate: 450, discount: 10, totalAmount: 2835,
  }];
  const draft = (overrides: Partial<OrderDraft> = {}): OrderDraft => ({
    clientId: 1, machineId: 101, startDate: '2026-10-22', endDate: '2026-10-25', plateNumber: 'dx-9001 ',
    taxType: 'VAT', taxPercent: 5, discount: 10, ...overrides,
  });

  it('accepts a complete draft and previews the line price', () => {
    const check = checkDraft(draft(), MACHINERY_CATALOG, [], booked);
    expect(check.valid).toBe(true);
    expect(check.preview).toMatchObject({ days: 3, total: legacyLineTotal(3, 450, 10, 5) });
  });

  it('reports an end date that is not after the start date', () => {
    const check = checkDraft(draft({ endDate: '2026-10-20' }), MACHINERY_CATALOG, [], booked);
    expect(check.errors.endDate).toBe('The end date must be after the start date.');
    expect(check.valid).toBe(false);
    expect(check.preview).toBeNull();
  });

  it('reports a missing client, out-of-range discount and negative tax', () => {
    const check = checkDraft(draft({ clientId: 0, discount: 120, taxPercent: -1 }), MACHINERY_CATALOG, [], booked);
    expect(Object.keys(check.errors).sort()).toEqual(['client', 'discount', 'taxPercent']);
  });

  it('finds a conflict with an existing booking and says where it comes from', () => {
    const check = checkDraft(draft({ plateNumber: ' dx-7728', startDate: '2026-10-17', endDate: '2026-10-19' }), MACHINERY_CATALOG, [], booked);
    expect(check.conflict).toEqual({ startDate: '2026-10-14T00:00:00', endDate: '2026-10-21T00:00:00', source: 'booking' });
    expect(check.valid).toBe(false);
  });

  it('finds a conflict with a line already in the cart', () => {
    const inCart = line(rentalDays('2026-10-22', '2026-10-25'), 450, 0, 5, { startDate: '2026-10-22', endDate: '2026-10-25' });
    const check = checkDraft(draft({ startDate: '2026-10-24', endDate: '2026-10-28' }), MACHINERY_CATALOG, [inCart], booked);
    expect(check.conflict).toMatchObject({ source: 'cart', startDate: '2026-10-22', endDate: '2026-10-25' });
  });
});
