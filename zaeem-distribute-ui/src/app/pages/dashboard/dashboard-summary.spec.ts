import { describe, expect, it } from 'vitest';
import { ActiveRental, CompaniesSnapshot } from '../../services/company';
import { summarizeDashboard } from './dashboard-summary';

const today = new Date(2026, 9, 16); // Oct 16, 2026

const rental = (id: string, machineName: string, startDate: string, endDate: string, extra: Partial<ActiveRental> = {}): ActiveRental => ({
  id, machineName, startDate, endDate, companyName: 'Build-It Corp', dailyRate: 100, discount: 0, totalAmount: 700, ...extra,
});

const clients: CompaniesSnapshot = {
  companies: [
    { companyId: 1, companyName: 'Build-It Corp', outstandingBalance: 12500, totalBilledToDate: 20000 },
    { companyId: 2, companyName: 'Swift Logistics', outstandingBalance: 85000, totalBilledToDate: 90000 },
    { companyId: 3, companyName: 'Mega Structures', outstandingBalance: 0, totalBilledToDate: 5000 },
  ],
  totalOutstanding: 97500,
};

describe('summarizeDashboard', () => {
  it('lists current and upcoming rentals by start date, excluding completed and cancelled', () => {
    const summary = summarizeDashboard([
      rental('upcoming', 'Bulldozer D9', '2026-10-20', '2026-10-25'),
      rental('completed', 'Excavator X3000', '2026-10-01', '2026-10-10'),
      rental('active', 'Excavator X3000', '2026-10-14', '2026-10-21'),
      rental('cancelled', 'Tower Crane T1', '2026-10-15', '2026-10-30', { status: 'Cancelled' }),
      rental('ends-today', 'Asphalt Paver', '2026-10-12', '2026-10-16'),
    ], clients, undefined, today);

    expect(summary.deployments.map(r => r.id)).toEqual(['ends-today', 'active', 'upcoming']);
    expect(summary.deployments.map(r => r.status)).toEqual(['Active', 'Active', 'Pending']);
    expect(summary.onHire).toBe(2);
    expect(summary.upcoming).toBe(1);
  });

  it('computes utilisation against the fleet size ("3 of 19 units on hire" is 16%)', () => {
    const summary = summarizeDashboard([
      rental('a', 'Excavator X3000', '2026-10-14', '2026-10-21'),
      rental('b', 'Caterpillar Loader', '2026-10-15', '2026-10-22'),
      rental('c', 'Bulldozer D9', '2026-10-16', '2026-10-18'),
    ], clients, undefined, today);

    expect(summary.fleetSize).toBe(19);
    expect(summary.onHire).toBe(3);
    expect(summary.utilisation).toBe(16);
  });

  it('breaks utilisation down per machine type ("1 of 5" is a 20% bar)', () => {
    const summary = summarizeDashboard([rental('a', 'Excavator X3000', '2026-10-14', '2026-10-21')], clients, undefined, today);
    expect(summary.byType.find(t => t.name === 'Excavator X3000')).toEqual({ name: 'Excavator X3000', onHire: 1, total: 5, percent: 20 });
    expect(summary.byType.find(t => t.name === 'Tower Crane T1')).toEqual({ name: 'Tower Crane T1', onHire: 0, total: 2, percent: 0 });
  });

  it('caps a bar at 100% when more rentals than units are recorded', () => {
    const summary = summarizeDashboard(
      [1, 2, 3].map(n => rental(`c${n}`, 'Tower Crane T1', '2026-10-14', '2026-10-21')), clients, undefined, today);
    expect(summary.byType.find(t => t.name === 'Tower Crane T1')).toMatchObject({ onHire: 3, total: 2, percent: 100 });
  });

  it('takes receivables from the API total and counts clients from real data', () => {
    const summary = summarizeDashboard([
      rental('a', 'Excavator X3000', '2026-10-14', '2026-10-21'),
      rental('b', 'Caterpillar Loader', '2026-10-20', '2026-10-22', { companyName: 'Swift Logistics' }),
      rental('c', 'Bulldozer D9', '2026-10-15', '2026-10-30'),
    ], clients, undefined, today);

    expect(summary.receivables).toBe(97500);
    expect(summary.clientsWithBalance).toBe(2);
    expect(summary.activeClients).toBe(2);
    expect(summary.totalClients).toBe(3);
  });

  it('handles an empty system without dividing by zero', () => {
    const summary = summarizeDashboard([], { companies: [], totalOutstanding: 0 }, {}, today);
    expect(summary).toMatchObject({ deployments: [], onHire: 0, fleetSize: 0, utilisation: 0, activeClients: 0 });
  });
});
