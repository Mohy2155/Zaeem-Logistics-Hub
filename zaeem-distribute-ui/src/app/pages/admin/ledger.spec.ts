import { describe, expect, it } from 'vitest';
import { CompanyResponseDto } from '../../services/company';
import { sortRows } from '../../ui/data-table';
import { LEDGER_COLUMNS, balanceKind, filterClients, formatBalance, ledgerTotals } from './ledger';

const clients: CompanyResponseDto[] = [
  { companyId: 1, companyName: 'Build-It Corp', outstandingBalance: 12500, totalBilledToDate: 45000, defaultDiscount: 10 },
  { companyId: 2, companyName: 'Swift Logistics', outstandingBalance: 85000, totalBilledToDate: 120000, defaultDiscount: 15 },
  { companyId: 3, companyName: 'Mega Structures', outstandingBalance: -606.5, totalBilledToDate: 9000, defaultDiscount: 5 },
  { companyId: 4, companyName: 'acme Haulage', outstandingBalance: 0, totalBilledToDate: 0 },
];

const column = (key: string) => LEDGER_COLUMNS.find(c => c.key === key)!;
const names = (rows: CompanyResponseDto[]) => rows.map(r => r.companyName);

describe('ledger sorting', () => {
  it('sorts by client name, case-insensitively', () => {
    expect(names(sortRows(clients, column('companyName'), 'asc')))
      .toEqual(['acme Haulage', 'Build-It Corp', 'Mega Structures', 'Swift Logistics']);
  });

  it('sorts by balance due, largest first when descending, with credits last', () => {
    expect(names(sortRows(clients, column('outstandingBalance'), 'desc')))
      .toEqual(['Swift Logistics', 'Build-It Corp', 'acme Haulage', 'Mega Structures']);
  });

  it('sorts by lifetime billed', () => {
    expect(names(sortRows(clients, column('totalBilledToDate'), 'asc')))
      .toEqual(['acme Haulage', 'Mega Structures', 'Build-It Corp', 'Swift Logistics']);
  });

  it('sorts by default discount, treating a missing discount as 0%', () => {
    expect(names(sortRows(clients, column('defaultDiscount'), 'desc')))
      .toEqual(['Swift Logistics', 'Build-It Corp', 'Mega Structures', 'acme Haulage']);
  });

  it('starts balance and billing columns descending', () => {
    expect(column('outstandingBalance').firstDirection).toBe('desc');
    expect(column('totalBilledToDate').firstDirection).toBe('desc');
  });
});

describe('filterClients', () => {
  it('matches part of the name, ignoring case and surrounding spaces', () => {
    expect(names(filterClients(clients, '  SWIFT '))).toEqual(['Swift Logistics']);
    expect(names(filterClients(clients, 'ac'))).toEqual(['acme Haulage']);
  });

  it('keeps everyone for a blank query and no one for a miss', () => {
    expect(filterClients(clients, '   ')).toHaveLength(4);
    expect(filterClients(clients, 'zzz')).toEqual([]);
  });
});

describe('balances', () => {
  it('shows a negative balance as a credit in the client\'s favour', () => {
    expect(formatBalance(-606.5)).toBe('$606.50 credit');
    expect(balanceKind(-606.5)).toBe('credit');
  });

  it('formats amounts due and settled balances', () => {
    expect(formatBalance(12500)).toBe('$12,500.00');
    expect(formatBalance(0)).toBe('$0.00');
    expect(formatBalance(-0.001)).toBe('$0.00');
    expect(balanceKind(0.001)).toBe('settled');
  });

  it('totals only positive balances as receivables', () => {
    expect(ledgerTotals(clients)).toEqual({ clients: 4, balanceDue: 97500, lifetimeBilled: 174000, withBalance: 2 });
  });
});
