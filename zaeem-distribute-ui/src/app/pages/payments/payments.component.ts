import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { AsyncPipe, CurrencyPipe, DatePipe, formatCurrency } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, forkJoin, map, tap } from 'rxjs';
import { CompanyResponseDto, CompanyService, PaymentReceipt } from '../../services/company';
import { ToastService } from '../../services/toast';
import { loadState } from '../../ui/load-state';
import { UiAsyncView, UiReady } from '../../ui/async-view';
import { UiPageHeader } from '../../ui/page-header';
import { UiCard } from '../../ui/card';
import { UiButton } from '../../ui/button';
import { UiIcon } from '../../ui/icon';
import { UiEmptyState } from '../../ui/empty-state';
import { ConfirmService } from '../../ui/dialog';
import { SortState, TableColumn, UiCell, UiDataTable } from '../../ui/data-table';
import { formatBalance } from '../admin/ledger';
import { PaymentFormComponent, PaymentRequest } from './payment-form.component';
import { ReceiptDocument, downloadReceiptExcel, downloadReceiptPdf } from './receipt-export';

const money = (n: number) => formatCurrency(n, 'en-US', '$', 'USD');

/** The API stores UTC without a zone marker; read such timestamps as UTC rather than local time. */
export function receiptTime(value: string): number {
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone || !value.includes('T') ? value : value + 'Z').getTime();
}

// Payments: record a client payment (confirmed first) and review the receipt history.
@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [
    AsyncPipe, CurrencyPipe, DatePipe, UiAsyncView, UiReady, UiPageHeader, UiCard, UiButton, UiIcon, UiEmptyState,
    UiDataTable, UiCell, PaymentFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent {
  private readonly companyService = inject(CompanyService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly injector = inject(Injector);
  private readonly form = viewChild(PaymentFormComponent);
  private readonly receiptPanel = viewChild<ElementRef<HTMLElement>>('receiptPanel');

  protected readonly initialClientId = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map(p => {
      const id = Number(p.get('client'));
      return Number.isInteger(id) && id > 0 ? id : null;
    })),
    { initialValue: null },
  );

  protected readonly clients = signal<CompanyResponseDto[]>([]);
  protected readonly receipts = signal<PaymentReceipt[]>([]);
  protected readonly data = loadState(() => this.fetch(), () => false);

  protected readonly busy = signal(false);
  /** The payment just recorded; replaces the form with the receipt view until dismissed. */
  protected readonly recorded = signal<ReceiptDocument | null>(null);

  protected readonly receiptClient = signal<number | null>(null);
  protected readonly receiptClients = computed(() => {
    const seen = new Map<number, string>();
    for (const r of this.receipts()) seen.set(r.companyId, r.companyName);
    return [...seen].map(([companyId, companyName]) => ({ companyId, companyName })).sort((a, b) => a.companyName.localeCompare(b.companyName));
  });
  protected readonly visibleReceipts = computed(() => {
    const id = this.receiptClient();
    return id === null ? this.receipts() : this.receipts().filter(r => r.companyId === id);
  });
  protected readonly receiptTotal = computed(() => this.visibleReceipts().reduce((sum, r) => sum + r.amount, 0));

  protected readonly receiptColumns: TableColumn<PaymentReceipt>[] = [
    { key: 'receiptId', label: 'Receipt' },
    { key: 'companyName', label: 'Client', sortable: true },
    { key: 'amount', label: 'Amount', align: 'end', sortable: true, firstDirection: 'desc' },
    { key: 'paymentDate', label: 'Received', sortable: true, firstDirection: 'desc', sortValue: r => receiptTime(r.paymentDate) },
  ];
  protected receiptSort: SortState | null = { key: 'paymentDate', direction: 'desc' };
  protected readonly trackReceipt = (r: PaymentReceipt) => r.receiptId;
  protected readonly receiptTime = receiptTime;
  protected readonly formatBalance = formatBalance;

  private fetch() {
    return forkJoin({ clients: this.companyService.loadCompanies(), receipts: this.companyService.loadReceipts() }).pipe(
      tap(({ clients, receipts }) => {
        this.clients.set(clients.companies);
        this.receipts.set(receipts);
      }),
    );
  }

  protected async record(request: PaymentRequest): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Record this payment?',
      message: 'The amount is taken off the client\'s balance and a receipt is issued.',
      details: [
        { label: 'Client', value: request.client.companyName },
        { label: 'Amount received', value: money(request.amount) },
        { label: 'Balance after payment', value: formatBalance(request.balanceAfter) },
      ],
      confirmLabel: 'Record payment',
    });
    if (!confirmed) return;

    this.busy.set(true);
    try {
      const response = await firstValueFrom(this.companyService.recordPayment(request.client.companyId, request.amount));
      if (response?.result !== 'SUCCESS') throw new Error('Payment could not be recorded.');
      const receipt: ReceiptDocument = {
        receiptId: response.receiptId || 'REC-PENDING',
        companyId: request.client.companyId,
        companyName: request.client.companyName,
        amount: request.amount,
        remainingBalance: request.balanceAfter,
      };
      this.recorded.set(receipt);
      // The form that had focus is replaced by the receipt view, so focus moves there.
      afterNextRender(() => this.receiptPanel()?.nativeElement.focus(), { injector: this.injector });
      this.toast.success(`Payment ${receipt.receiptId} recorded for ${receipt.companyName}.`);
      this.refresh();
    } catch (error) {
      const message = error instanceof HttpErrorResponse ? error.error?.message : error instanceof Error ? error.message : null;
      this.toast.error(message || 'Payment could not be recorded. Nothing was charged; try again.');
      // The balance may have changed elsewhere (the usual reason for a rejection), so the form rechecks fresh figures.
      this.fetch().subscribe({ error: () => undefined });
    } finally {
      this.busy.set(false);
    }
  }

  /** Reloads balances and receipts in place, without the loading skeleton. */
  private refresh(): void {
    this.fetch().subscribe({
      error: () => this.toast.error('The payment was recorded, but the lists could not refresh. Reload the page to see it.'),
    });
  }

  /** Back to the form (from the receipt view or the empty history), with focus on its first field. */
  protected showForm(): void {
    this.recorded.set(null);
    afterNextRender(() => this.form()?.focus(), { injector: this.injector });
  }

  protected downloadPdf(receipt: ReceiptDocument): void {
    void downloadReceiptPdf(receipt);
  }

  protected downloadExcel(receipt: ReceiptDocument): void {
    void downloadReceiptExcel(receipt);
  }
}
