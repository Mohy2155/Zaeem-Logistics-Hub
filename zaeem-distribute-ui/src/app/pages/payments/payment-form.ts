import { formatCurrency } from '@angular/common';
import { roundCents } from '../portal/order-pricing';

const money = (n: number) => formatCurrency(n, 'en-US', '$', 'USD');

export interface PaymentCheck {
  /** Inline message for the amount field, or null when the amount is acceptable. */
  amountError: string | null;
  /** Balance after the payment, when an amount is entered. */
  balanceAfter: number | null;
  valid: boolean;
}

/** Validates a payment against the client's balance due: positive, whole cents, and no more than the balance. */
export function checkPayment(balance: number | null, amount: number | null): PaymentCheck {
  if (balance === null) return { amountError: null, balanceAfter: null, valid: false };
  if (amount === null || Number.isNaN(amount)) return { amountError: 'Enter the amount received.', balanceAfter: null, valid: false };

  let amountError: string | null = null;
  if (amount <= 0) amountError = 'Enter an amount greater than $0.00.';
  else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) amountError = 'Use at most two decimal places.';
  else if (balance <= 0) amountError = 'This client has no balance due.';
  else if (amount > roundCents(balance) + 1e-9) amountError = `This is more than the ${money(balance)} balance due.`;

  return { amountError, balanceAfter: roundCents(balance - amount), valid: amountError === null };
}
