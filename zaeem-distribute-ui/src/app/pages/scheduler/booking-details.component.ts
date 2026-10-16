import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ActiveRental } from '../../services/company';
import { rentalDays, rentalStatus } from '../../services/rental-dates';
import { UiDialog } from '../../ui/dialog';
import { UiButton } from '../../ui/button';
import { UiBadge } from '../../ui/badge';

export interface BookingDetailsData {
  rental: ActiveRental;
  titleId: string;
}

/** Read-only details of one booking, opened from a bar on the Fleet Schedule. */
@Component({
  selector: 'app-booking-details',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, UiDialog, UiButton, UiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let r = data.rental;
    <ui-dialog [title]="r.machineName + (r.plateNumber ? ' · ' + r.plateNumber : '')" [titleId]="data.titleId">
      <dl class="facts">
        <div><dt>Status</dt><dd><ui-badge [status]="status" /></dd></div>
        <div><dt>Client</dt><dd>{{ r.companyName }}</dd></div>
        <div><dt>Machine</dt><dd>{{ r.machineName }}</dd></div>
        <div><dt>Plate</dt><dd class="num">{{ r.plateNumber || '—' }}</dd></div>
        <div><dt>Start</dt><dd>{{ r.startDate | date: 'mediumDate' }}</dd></div>
        <div><dt>End</dt><dd>{{ r.endDate | date: 'mediumDate' }}</dd></div>
        <div><dt>Days</dt><dd class="num">{{ days }}</dd></div>
        <div><dt>Amount</dt><dd class="num amount">{{ r.totalAmount | currency }}</dd></div>
      </dl>
      <div dialog-actions>
        <button ui-button variant="primary" (click)="ref.close()">Close</button>
      </div>
    </ui-dialog>
  `,
  styles: `
    :host { display: block; }
    .facts { display: grid; gap: var(--space-3); margin: 0; }
    .facts div { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); }
    .facts dt { color: var(--color-text-muted); }
    .facts dd { margin: 0; font-weight: var(--weight-medium); text-align: end; }
    .amount { font-size: var(--text-lg); font-weight: var(--weight-semibold); }
  `,
})
export class BookingDetailsComponent {
  protected readonly data = inject<BookingDetailsData>(DIALOG_DATA);
  protected readonly ref = inject(DialogRef);
  protected readonly status = rentalStatus(this.data.rental);
  protected readonly days = rentalDays(this.data.rental.startDate, this.data.rental.endDate);
}
