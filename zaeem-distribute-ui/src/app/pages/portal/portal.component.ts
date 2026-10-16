import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { AsyncPipe, CurrencyPipe } from '@angular/common';
import { forkJoin, tap } from 'rxjs';
import { ActiveRental, CompanyResponseDto, CompanyService } from '../../services/company';
import { MACHINERY_CATALOG } from '../../services/fleet';
import { ToastService } from '../../services/toast';
import { loadState } from '../../ui/load-state';
import { UiAsyncView, UiReady } from '../../ui/async-view';
import { UiPageHeader } from '../../ui/page-header';
import { UiCard } from '../../ui/card';
import { UiBadge } from '../../ui/badge';
import { UiButton } from '../../ui/button';
import { ConfirmService, UiDialogService, nextDialogTitleId } from '../../ui/dialog';
import { OrderFormComponent } from './order-form.component';
import { OrderSummaryComponent } from './order-summary.component';
import { OrderConfirmationComponent, OrderConfirmationData, OrderConfirmationResult } from './order-confirmation.component';
import { CompletedOrder } from './invoice-export';
import { OrderLineItem, cartTotals } from './order-pricing';

export type { OrderLineItem } from './order-pricing';

// New Rental Order workspace: the form builds lines into the cart; placing the order bills the client.
@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [
    AsyncPipe, CurrencyPipe, UiAsyncView, UiReady, UiPageHeader, UiCard, UiBadge, UiButton,
    OrderFormComponent, OrderSummaryComponent,
  ],
  templateUrl: './portal.component.html',
  styleUrl: './portal.component.scss',
})
export class ClientPortalComponent {
  private readonly companyService = inject(CompanyService);
  private readonly toasts = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly dialogs = inject(UiDialogService);

  protected readonly machinery = MACHINERY_CATALOG;
  protected readonly companies = signal<CompanyResponseDto[]>([]);
  /** Existing bookings, for the double-booking check. */
  protected readonly rentals = signal<ActiveRental[]>([]);
  protected readonly cart = signal<OrderLineItem[]>([]);
  protected readonly clientId = signal(0);
  protected readonly placing = signal(false);

  protected readonly total = computed(() => cartTotals(this.cart()).grandTotal);
  protected readonly client = computed(() => this.companies().find(c => c.companyId === this.clientId()));

  protected readonly data = loadState(
    () => forkJoin({ clients: this.companyService.loadCompanies(), rentals: this.companyService.loadRentals() }).pipe(
      tap(({ clients, rentals }) => {
        this.companies.set(clients.companies);
        this.rentals.set(rentals);
      }),
    ),
    () => false,
  );

  private readonly form = viewChild(OrderFormComponent);
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');

  protected addItem(item: OrderLineItem): void {
    this.cart.update(items => [...items, item]);
  }

  protected removeItem(index: number): void {
    const removed = this.cart()[index];
    this.cart.update(items => items.filter((_, i) => i !== index));
    if (removed) this.toasts.info(`Removed ${removed.machineName} (${removed.plateNumber}) from the order.`);
  }

  protected async clearCart(): Promise<void> {
    const count = this.cart().length;
    const confirmed = await this.confirmService.confirm({
      title: 'Clear the cart?',
      message: `All ${count} ${count === 1 ? 'item' : 'items'} will be removed from this order. Nothing has been billed yet.`,
      confirmLabel: 'Clear cart',
      tone: 'destructive',
    });
    if (!confirmed) return;
    this.cart.set([]);
    this.toasts.info('Cart cleared. You can now choose a different client.');
  }

  protected placeOrder(): void {
    const company = this.client();
    const items = this.cart();
    if (!company || items.length === 0 || this.placing()) return;

    this.placing.set(true);
    const total = this.total();
    this.companyService.placeBulkOrder({ companyId: company.companyId, items }).subscribe({
      next: (response: any) => {
        this.placing.set(false);
        if (!(response && response.result === 'SUCCESS')) {
          this.toasts.error('The order could not be placed. Nothing was billed; try again.');
          return;
        }
        const order: CompletedOrder = { invoiceId: this.invoiceIdFrom(response), company, items, total };
        this.cart.set([]);
        this.refreshRentals(); // New bookings must count in the next conflict check
        this.toasts.success(`Order ${order.invoiceId} placed for ${company.companyName}.`);
        this.showConfirmation(order);
      },
      error: (err: any) => {
        this.placing.set(false);
        console.error('Placing the order failed:', err);
        // Surface the API's reason (e.g. a 409 scheduling conflict); the cart stays as it was.
        this.toasts.error(err.error?.message || 'The order could not be placed. Nothing was billed; try again.');
        if (err.status === 409) this.refreshRentals();
      },
    });
  }

  protected scrollToSummary(): void {
    const target = this.summary()?.nativeElement;
    if (!target) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }

  private showConfirmation(order: CompletedOrder): void {
    const titleId = nextDialogTitleId();
    const ref = this.dialogs.open<OrderConfirmationResult, OrderConfirmationData>(OrderConfirmationComponent, {
      data: { order, titleId },
      ariaLabelledBy: titleId,
      width: 'min(30rem, calc(100vw - 2rem))',
      // The Place Order button that opened it is gone once the cart empties, so focus is placed here.
      restoreFocus: false,
    });
    ref.closed.subscribe(result => {
      if (result === 'new-order') this.form()?.reset();
      else this.form()?.focusNextLine();
    });
  }

  private refreshRentals(): void {
    this.companyService.loadRentals().subscribe({
      next: rentals => this.rentals.set(rentals),
      error: err => console.error('Could not refresh bookings', err),
    });
  }

  /** The API's invoice number, or a locally numbered one when the API has not assigned it yet. */
  private invoiceIdFrom(response: any): string {
    if (response.invoiceId && response.invoiceId !== 'INV-PENDING') return response.invoiceId;
    try {
      const next = parseInt(localStorage.getItem('zaeem_invoice_counter') || '1000');
      localStorage.setItem('zaeem_invoice_counter', (next + 1).toString());
      return `INV-${next}`;
    } catch {
      return 'INV-1000';
    }
  }
}
