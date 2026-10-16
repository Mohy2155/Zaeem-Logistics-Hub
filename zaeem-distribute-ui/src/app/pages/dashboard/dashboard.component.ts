import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { CompanyService } from '../../services/company';
import { loadState } from '../../ui/load-state';
import { UiAsyncView, UiReady } from '../../ui/async-view';
import { UiPageHeader } from '../../ui/page-header';
import { UiStatCard } from '../../ui/stat-card';
import { UiCard } from '../../ui/card';
import { UiButton } from '../../ui/button';
import { UiBadge } from '../../ui/badge';
import { UiEmptyState } from '../../ui/empty-state';
import { SortState, TableColumn, UiCell, UiDataTable } from '../../ui/data-table';
import { DeploymentRow, summarizeDashboard } from './dashboard-summary';
import { toLocalDay } from '../../services/rental-dates';

// Landing page: fleet activity and receivables, computed only from live rental and client data.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AsyncPipe, CurrencyPipe, DatePipe, RouterLink,
    UiAsyncView, UiReady, UiPageHeader, UiStatCard, UiCard, UiButton, UiBadge, UiEmptyState, UiDataTable, UiCell,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly companyService = inject(CompanyService);

  protected readonly summary = loadState(
    () => forkJoin({ rentals: this.companyService.loadRentals(), clients: this.companyService.loadCompanies() })
      .pipe(map(({ rentals, clients }) => summarizeDashboard(rentals, clients))),
    () => false, // Zero figures are still figures; the deployments panel has its own empty state.
  );

  protected readonly columns: TableColumn<DeploymentRow>[] = [
    { key: 'machine', label: 'Machine', sortable: true, sortValue: r => r.machineName },
    { key: 'companyName', label: 'Client', sortable: true },
    { key: 'period', label: 'Rental period', sortable: true, sortValue: r => toLocalDay(r.startDate).getTime() },
    { key: 'totalAmount', label: 'Amount', align: 'end', sortable: true, firstDirection: 'desc' },
    { key: 'status', label: 'Status' },
  ];

  protected sort: SortState | null = { key: 'period', direction: 'asc' };
  protected readonly trackRental = (row: DeploymentRow) => row.id;
}
