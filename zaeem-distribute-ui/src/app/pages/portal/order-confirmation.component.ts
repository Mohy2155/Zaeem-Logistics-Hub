import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ToastService } from '../../services/toast';
import { UiDialog } from '../../ui/dialog';
import { UiButton } from '../../ui/button';
import { UiIcon } from '../../ui/icon';
import { CompletedOrder, downloadInvoiceExcel, downloadInvoicePdf } from './invoice-export';

export interface OrderConfirmationData {
  order: CompletedOrder;
  titleId: string;
}

/** Closes with 'new-order' when the user starts another order. */
export type OrderConfirmationResult = 'new-order' | undefined;

/** Success view after an order is placed: invoice number, client, total and invoice downloads. */
@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CurrencyPipe, UiDialog, UiButton, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog title="Order placed" [titleId]="data.titleId">
      <div class="success">
        <span class="success-icon"><ui-icon name="circle-check" [size]="28" /></span>
        <p>The order is billed to the client's account. Download the invoice to send it on.</p>
      </div>
      <dl class="facts">
        <div><dt>Invoice</dt><dd class="num">{{ data.order.invoiceId }}</dd></div>
        <div><dt>Client</dt><dd>{{ data.order.company.companyName }}</dd></div>
        <div><dt>Items</dt><dd class="num">{{ data.order.items.length }}</dd></div>
        <div><dt>Total</dt><dd class="num total">{{ data.order.total | currency }}</dd></div>
      </dl>
      <div class="downloads">
        <button ui-button icon="file-text" [busy]="downloading() === 'pdf'" (click)="download('pdf')">Download PDF</button>
        <button ui-button icon="file-spreadsheet" [busy]="downloading() === 'excel'" (click)="download('excel')">Download Excel</button>
      </div>
      <div dialog-actions>
        <button ui-button variant="ghost" (click)="ref.close()">Close</button>
        <button ui-button variant="primary" icon="plus" (click)="ref.close('new-order')">New order</button>
      </div>
    </ui-dialog>
  `,
  styles: `
    :host { display: block; }
    .success { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-5); color: var(--color-text-muted); }
    .success-icon {
      display: grid; flex-shrink: 0; place-items: center;
      width: 3rem; height: 3rem; border-radius: var(--radius-full);
      background: var(--color-success-soft); color: var(--color-success-text);
    }
    .facts { display: grid; gap: var(--space-2); margin: 0 0 var(--space-5); }
    .facts div { display: flex; justify-content: space-between; gap: var(--space-4); }
    .facts dt { color: var(--color-text-muted); }
    .facts dd { margin: 0; font-weight: var(--weight-medium); text-align: end; }
    .facts .total { font-size: var(--text-xl); font-weight: var(--weight-bold); }
    .downloads { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: var(--space-2); }
  `,
})
export class OrderConfirmationComponent {
  protected readonly data = inject<OrderConfirmationData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<OrderConfirmationResult>>(DialogRef);
  private readonly toasts = inject(ToastService);

  protected readonly downloading = signal<'pdf' | 'excel' | null>(null);

  protected async download(format: 'pdf' | 'excel'): Promise<void> {
    this.downloading.set(format);
    try {
      await (format === 'pdf' ? downloadInvoicePdf(this.data.order) : downloadInvoiceExcel(this.data.order));
    } catch (e) {
      console.error(e);
      this.toasts.error('The invoice could not be generated. Try again.');
    } finally {
      this.downloading.set(null);
    }
  }
}
