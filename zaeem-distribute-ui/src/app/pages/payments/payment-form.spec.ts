import { describe, expect, it } from 'vitest';
import { checkPayment } from './payment-form';
import { receiptTime } from './payments.component';

describe('checkPayment', () => {
  it('blocks an overpayment and names the balance', () => {
    expect(checkPayment(12500, 20000)).toMatchObject({ valid: false, amountError: 'This is more than the $12,500.00 balance due.' });
  });

  it('previews the balance after a valid payment', () => {
    expect(checkPayment(12500, 5000)).toEqual({ amountError: null, balanceAfter: 7500, valid: true });
    expect(checkPayment(16070.75, 16070.75)).toEqual({ amountError: null, balanceAfter: 0, valid: true });
  });

  it('rejects zero, negative and sub-cent amounts', () => {
    expect(checkPayment(100, 0).amountError).toBe('Enter an amount greater than $0.00.');
    expect(checkPayment(100, -5).amountError).toBe('Enter an amount greater than $0.00.');
    expect(checkPayment(100, 10.005).amountError).toBe('Use at most two decimal places.');
    expect(checkPayment(200, 100.5).valid).toBe(true);
  });

  it('asks for an amount, and refuses payments from clients without a balance', () => {
    expect(checkPayment(100, null)).toMatchObject({ valid: false, amountError: 'Enter the amount received.' });
    expect(checkPayment(-606.5, 10)).toMatchObject({ valid: false, amountError: 'This client has no balance due.' });
    expect(checkPayment(null, 10)).toEqual({ amountError: null, balanceAfter: null, valid: false });
  });
});

describe('receiptTime', () => {
  it('reads API timestamps without a zone as UTC', () => {
    expect(receiptTime('2026-10-16T17:44:31.6854201')).toBe(Date.UTC(2026, 9, 16, 17, 44, 31, 685));
  });

  it('keeps explicit zones (demo data uses toISOString)', () => {
    expect(receiptTime('2026-10-16T17:44:31.000Z')).toBe(Date.UTC(2026, 9, 16, 17, 44, 31));
    expect(receiptTime('2026-10-16T21:44:31+04:00')).toBe(Date.UTC(2026, 9, 16, 17, 44, 31));
  });
});
