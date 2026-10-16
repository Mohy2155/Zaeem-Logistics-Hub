import { formatCurrency } from '@angular/common';
import { CompanyResponseDto } from '../../services/company';
import { TableColumn } from '../../ui/data-table';

export type BalanceKind = 'due' | 'credit' | 'settled';

/** Amounts under half a cent count as settled, so float noise never shows as "$0.00 credit". */
export function balanceKind(balance: number): BalanceKind {
  if (balance >= 0.005) return 'due';
  if (balance <= -0.005) return 'credit';
  return 'settled';
}

/** "$12,500.00", or "$606.50 credit" for a negative balance (money owed to the client). */
export function formatBalance(balance: number): string {
  const kind = balanceKind(balance);
  const amount = formatCurrency(kind === 'settled' ? 0 : Math.abs(balance), 'en-US', '$', 'USD');
  return kind === 'credit' ? `${amount} credit` : amount;
}

/** Case-insensitive match on the client name; a blank query keeps everyone. */
export function filterClients<T extends Pick<CompanyResponseDto, 'companyName'>>(clients: readonly T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  return needle ? clients.filter(c => c.companyName.toLowerCase().includes(needle)) : [...clients];
}

export interface LedgerTotals {
  clients: number;
  /** Sum of positive balances only: credits are money we owe, not receivables. */
  balanceDue: number;
  lifetimeBilled: number;
  withBalance: number;
}

export function ledgerTotals(clients: readonly CompanyResponseDto[]): LedgerTotals {
  return clients.reduce<LedgerTotals>((t, c) => ({
    clients: t.clients + 1,
    balanceDue: t.balanceDue + Math.max(0, c.outstandingBalance || 0),
    lifetimeBilled: t.lifetimeBilled + (c.totalBilledToDate || 0),
    withBalance: t.withBalance + (balanceKind(c.outstandingBalance || 0) === 'due' ? 1 : 0),
  }), { clients: 0, balanceDue: 0, lifetimeBilled: 0, withBalance: 0 });
}

export const LEDGER_COLUMNS: TableColumn<CompanyResponseDto>[] = [
  { key: 'companyName', label: 'Client', sortable: true, width: '32%' },
  { key: 'defaultDiscount', label: 'Default discount', align: 'end', sortable: true, firstDirection: 'desc', sortValue: c => c.defaultDiscount ?? 0 },
  { key: 'outstandingBalance', label: 'Balance due', align: 'end', sortable: true, firstDirection: 'desc' },
  { key: 'totalBilledToDate', label: 'Lifetime billed', align: 'end', sortable: true, firstDirection: 'desc' },
  { key: 'actions', label: 'Actions', align: 'end', width: '11rem' },
];
