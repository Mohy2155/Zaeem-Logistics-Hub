import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { map, tap } from 'rxjs';
import { CompanyResponseDto, CompanyService } from '../../services/company';
import { loadState } from '../../ui/load-state';
import { UiAsyncView, UiReady } from '../../ui/async-view';
import { UiPageHeader } from '../../ui/page-header';
import { UiCard } from '../../ui/card';
import { UiStatCard } from '../../ui/stat-card';
import { UiButton } from '../../ui/button';
import { UiBadge } from '../../ui/badge';
import { UiIcon } from '../../ui/icon';
import { UiEmptyState } from '../../ui/empty-state';
import { SortState, UiCell, UiDataTable, UiTableFooter } from '../../ui/data-table';
import { LEDGER_COLUMNS, balanceKind, filterClients, formatBalance, ledgerTotals } from './ledger';

// Client Ledger: every client's balance and lifetime billing. Payments are recorded on the Payments page.
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    AsyncPipe, CurrencyPipe, RouterLink, UiAsyncView, UiReady, UiPageHeader, UiCard, UiStatCard, UiButton, UiBadge, UiIcon,
    UiEmptyState, UiDataTable, UiCell, UiTableFooter,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminDashboardComponent {
  private readonly companyService = inject(CompanyService);

  private readonly clients = signal<CompanyResponseDto[]>([]);
  protected readonly data = loadState(() =>
    this.companyService.loadCompanies().pipe(map(s => s.companies), tap(c => this.clients.set(c))));

  protected readonly query = signal('');
  protected readonly visible = computed(() => filterClients(this.clients(), this.query()));
  protected readonly totals = computed(() => ledgerTotals(this.clients()));
  protected readonly visibleTotals = computed(() => ledgerTotals(this.visible()));

  protected readonly columns = LEDGER_COLUMNS;
  protected sort: SortState | null = { key: 'outstandingBalance', direction: 'desc' };
  protected readonly trackClient = (c: CompanyResponseDto) => c.companyId;

  protected readonly formatBalance = formatBalance;
  protected readonly balanceKind = balanceKind;
}
