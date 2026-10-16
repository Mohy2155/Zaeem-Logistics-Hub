import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe, formatDate } from '@angular/common';
import { tap } from 'rxjs';
import { ActiveRental, CompanyService } from '../../services/company';
import { MACHINERY_CATALOG } from '../../services/fleet';
import { RentalStatus, rentalStatus, toLocalDay } from '../../services/rental-dates';
import { loadState } from '../../ui/load-state';
import { UiAsyncView, UiReady } from '../../ui/async-view';
import { UiPageHeader } from '../../ui/page-header';
import { UiCard } from '../../ui/card';
import { UiButton, UiIconButton } from '../../ui/button';
import { UiIcon } from '../../ui/icon';
import { UiDialogService, nextDialogTitleId } from '../../ui/dialog';
import { BookingDetailsComponent, BookingDetailsData } from './booking-details.component';
import { PlacedBooking, WINDOW_DAYS, layoutRow, windowDays } from './schedule-layout';

interface ScheduleRow {
  name: string;
  category: string;
  laneCount: number;
  bars: (PlacedBooking<ActiveRental> & { status: RentalStatus })[];
}

/** Rows for every catalogue machine type, plus any type that only appears in bookings. */
export function buildRows(rentals: readonly ActiveRental[], days: readonly Date[], today: Date = new Date()): ScheduleRow[] {
  const types = MACHINERY_CATALOG.map(m => ({ name: m.name, category: m.category }));
  for (const r of rentals) {
    if (!types.some(t => t.name.toLowerCase() === r.machineName.toLowerCase())) types.push({ name: r.machineName, category: 'Other' });
  }
  return types.map(type => {
    const layout = layoutRow(rentals.filter(r => r.machineName.toLowerCase() === type.name.toLowerCase()), days);
    return { ...type, laneCount: layout.laneCount, bars: layout.bars.map(bar => ({ ...bar, status: rentalStatus(bar.booking, today) })) };
  });
}

// Fleet Schedule: a 14-day timeline of bookings per machine type, with overlapping bookings in lanes.
@Component({
  selector: 'app-scheduler',
  standalone: true,
  imports: [AsyncPipe, DatePipe, UiAsyncView, UiReady, UiPageHeader, UiCard, UiButton, UiIconButton, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scheduler.component.html',
  styleUrl: './scheduler.component.scss',
})
export class SchedulerComponent {
  private readonly companyService = inject(CompanyService);
  private readonly dialogs = inject(UiDialogService);

  private readonly today = toLocalDay(new Date());
  /** Window offset in whole windows from today. */
  protected readonly offset = signal(0);
  protected readonly days = computed(() =>
    windowDays(new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + this.offset() * WINDOW_DAYS)));
  protected readonly rangeLabel = computed(() => {
    const days = this.days();
    return `${formatDate(days[0], 'MMM d', 'en-US')} – ${formatDate(days[days.length - 1], 'MMM d, y', 'en-US')}`;
  });

  /** null until the first successful load, so the count isn't shown for data we don't have. */
  private readonly rentals = signal<ActiveRental[] | null>(null);
  protected readonly rows = computed(() => buildRows(this.rentals() ?? [], this.days(), this.today));
  protected readonly bookingsInView = computed(() =>
    this.rentals() === null ? null : this.rows().reduce((n, row) => n + row.bars.length, 0));

  protected readonly data = loadState(() => this.companyService.loadRentals().pipe(tap(r => this.rentals.set(r))), () => false);

  protected move(windows: number): void {
    this.offset.update(o => (windows === 0 ? 0 : o + windows));
  }

  protected isToday(day: Date): boolean {
    return day.getTime() === this.today.getTime();
  }

  protected isWeekend(day: Date): boolean {
    return day.getDay() === 0 || day.getDay() === 6;
  }

  protected barLabel(row: ScheduleRow, bar: ScheduleRow['bars'][number]): string {
    const r = bar.booking;
    const range = `${formatDate(r.startDate, 'mediumDate', 'en-US')} to ${formatDate(r.endDate, 'mediumDate', 'en-US')}`;
    const cues = [bar.continuesBefore ? 'starts before this period' : '', bar.continuesAfter ? 'continues after this period' : '']
      .filter(Boolean).join(', ');
    return `${r.companyName}, ${row.name}${r.plateNumber ? ' ' + r.plateNumber : ''}, ${range}, ${bar.status}${cues ? ', ' + cues : ''}`;
  }

  protected openDetails(rental: ActiveRental): void {
    const titleId = nextDialogTitleId();
    this.dialogs.open<void, BookingDetailsData>(BookingDetailsComponent, { data: { rental, titleId }, ariaLabelledBy: titleId });
  }
}
