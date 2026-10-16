import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { UiButton, UiIconButton } from '../../ui/button';
import { UiEmptyState } from '../../ui/empty-state';
import { OrderLineItem, cartTotals } from './order-pricing';

/** Cart for the order being built: line items on a shared grid, totals breakdown and Place Order. */
@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, UiButton, UiIconButton, UiEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-summary.component.html',
  styleUrl: './order-summary.component.scss',
})
export class OrderSummaryComponent {
  readonly items = input.required<OrderLineItem[]>();
  readonly clientName = input('');
  readonly busy = input(false);

  readonly remove = output<number>();
  readonly clear = output<void>();
  readonly place = output<void>();

  protected readonly totals = computed(() => cartTotals(this.items()));

  protected describe(item: OrderLineItem): string {
    return `${item.machineName} (${item.plateNumber})`;
  }
}
