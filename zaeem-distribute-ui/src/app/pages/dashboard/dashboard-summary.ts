import { ActiveRental, CompaniesSnapshot } from '../../services/company';
import { FLEET_INVENTORY } from '../../services/fleet';
import { RentalStatus, rentalStatus, toLocalDay } from '../../services/rental-dates';
import { ledgerTotals } from '../admin/ledger';

export interface DeploymentRow extends Omit<ActiveRental, 'status'> {
  status: RentalStatus;
}

export interface TypeUtilisation {
  name: string;
  onHire: number;
  total: number;
  /** Bar fill, 0–100. */
  percent: number;
}

export interface DashboardSummary {
  /** Current and upcoming rentals, earliest start first. */
  deployments: DeploymentRow[];
  onHire: number;
  upcoming: number;
  fleetSize: number;
  utilisation: number;
  byType: TypeUtilisation[];
  /** Same figure as the Client Ledger's balance due: credits are not netted against it. */
  receivables: number;
  clientsWithBalance: number;
  activeClients: number;
  totalClients: number;
}

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);

/** Every dashboard figure, computed only from the loaded rentals and clients. */
export function summarizeDashboard(
  rentals: ActiveRental[],
  { companies }: CompaniesSnapshot,
  inventory: Readonly<Record<string, number>> = FLEET_INVENTORY,
  today: Date = new Date(),
): DashboardSummary {
  const deployments = rentals
    .map((r): DeploymentRow => ({ ...r, status: rentalStatus(r, today) }))
    .filter(r => r.status === 'Active' || r.status === 'Pending')
    .sort((a, b) => toLocalDay(a.startDate).getTime() - toLocalDay(b.startDate).getTime());

  const active = deployments.filter(r => r.status === 'Active');
  const onHireByType = new Map<string, number>();
  for (const r of active) onHireByType.set(r.machineName, (onHireByType.get(r.machineName) ?? 0) + 1);

  const byType = Object.entries(inventory).map(([name, total]) => {
    const onHire = onHireByType.get(name) ?? 0;
    return { name, onHire, total, percent: percentOf(onHire, total) };
  });
  const fleetSize = byType.reduce((sum, t) => sum + t.total, 0);
  const balances = ledgerTotals(companies);

  return {
    deployments,
    onHire: active.length,
    upcoming: deployments.length - active.length,
    fleetSize,
    utilisation: percentOf(active.length, fleetSize),
    byType,
    receivables: balances.balanceDue,
    clientsWithBalance: balances.withBalance,
    activeClients: new Set(deployments.map(r => r.companyName)).size,
    totalClients: companies.length,
  };
}
