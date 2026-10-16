import { Component, ElementRef, computed, inject, input, model, output, viewChild } from '@angular/core';
import { CurrencyPipe, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ActiveRental, CompanyResponseDto, Machinery } from '../../services/company';
import { normalizePlate, toIsoDay } from '../../services/rental-dates';
import { UiFormField, UiControl } from '../../ui/form-field';
import { UiButton } from '../../ui/button';
import { DraftField, OrderDraft, OrderLineItem, checkDraft } from './order-pricing';

export const TAX_TYPES = ['VAT', 'GST', 'Sales Tax', 'None'] as const;
const DEFAULT_TAX = { taxType: 'VAT', taxPercent: 5 };

/**
 * Builds one order line at a time: client, machine and period, pricing. Validates as the user
 * goes, previews the line price, and emits the line when it is added.
 */
@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, UiFormField, UiControl, UiButton],
  templateUrl: './order-form.component.html',
  styleUrl: './order-form.component.scss',
})
export class OrderFormComponent {
  private readonly announcer = inject(LiveAnnouncer);

  readonly companies = input.required<CompanyResponseDto[]>();
  readonly machinery = input.required<Machinery[]>();
  readonly rentals = input.required<ActiveRental[]>();
  readonly cart = input.required<OrderLineItem[]>();
  readonly busy = input(false);
  /** Selected client; locked while the cart has items. */
  readonly clientId = model(0);
  readonly add = output<OrderLineItem>();

  protected readonly taxTypes = TAX_TYPES;
  protected readonly minDate = toIsoDay();
  protected readonly locked = computed(() => this.cart().length > 0);
  protected readonly clientName = computed(() => this.companies().find(c => c.companyId === this.clientId())?.companyName ?? '');

  protected draft: OrderDraft = this.emptyDraft(0);
  /** Fields the user has left; required-field messages wait until then so an untouched form isn't red. */
  private readonly touched = new Set<DraftField>();

  private readonly clientSelect = viewChild<ElementRef<HTMLSelectElement>>('clientSelect');
  private readonly machineSelect = viewChild.required<ElementRef<HTMLSelectElement>>('machineSelect');

  protected get check() {
    return checkDraft({ ...this.draft, clientId: this.clientId() }, this.machinery(), this.cart(), this.rentals());
  }

  /** Message for a field: value problems show at once, missing values once the field was visited. */
  protected errorFor(field: DraftField): string | null {
    const check = this.check;
    const message = check.errors[field];
    if (!message) return null;
    return check.missing.includes(field) && !this.touched.has(field) ? null : message;
  }

  protected get plateError(): string | null {
    const conflict = this.check.conflict;
    if (conflict) {
      const range = `${this.formatDay(conflict.startDate)} to ${this.formatDay(conflict.endDate)}`;
      const plate = normalizePlate(this.draft.plateNumber);
      return conflict.source === 'cart'
        ? `${plate} is already in this order for ${range}. Pick other dates or another unit.`
        : `${plate} is already booked from ${range}. Pick other dates or another unit.`;
    }
    return this.errorFor('plate');
  }

  protected touch(field: DraftField): void {
    // Tabbing through an untouched line (e.g. right after adding one) shouldn't flag it as incomplete.
    const d = this.draft;
    const lineStarted = !!(Number(d.machineId) || d.startDate || d.endDate || d.plateNumber.trim());
    if (field === 'client' || lineStarted) this.touched.add(field);
  }

  protected selectedClientDiscount(): number {
    return this.companies().find(c => c.companyId === this.clientId())?.defaultDiscount || 0;
  }

  protected onClientChange(id: number | string): void {
    this.clientId.set(Number(id));
    this.draft.discount = this.selectedClientDiscount();
    this.touch('client');
  }

  protected onTaxTypeChange(): void {
    if (this.draft.taxType === 'None') this.draft.taxPercent = 0;
  }

  protected submit(): void {
    for (const field of ['client', 'machine', 'startDate', 'endDate', 'plate'] as DraftField[]) this.touched.add(field);
    const check = this.check;
    const machine = this.machinery().find(m => m.id === Number(this.draft.machineId));
    if (!check.valid || !check.preview || !machine || this.busy()) return;

    const item: OrderLineItem = {
      machineId: machine.id,
      machineName: machine.name,
      startDate: this.draft.startDate,
      endDate: this.draft.endDate,
      rentalDays: check.preview.days,
      dailyRate: machine.dailyRate,
      discount: this.draft.discount || 0,
      lineTotal: check.preview.total,
      plateNumber: normalizePlate(this.draft.plateNumber),
      taxType: this.draft.taxType,
      taxPercent: this.draft.taxPercent || 0,
    };
    this.add.emit(item);
    this.announcer.announce(`${item.machineName}, plate ${item.plateNumber}, added to the order.`);

    // The client and their default discount carry over to the next line.
    this.draft = this.emptyDraft(this.selectedClientDiscount());
    this.touched.clear();
    this.machineSelect().nativeElement.focus();
  }

  /** Back to an empty form for a new order (called by the page after an order is placed). */
  reset(): void {
    this.draft = this.emptyDraft(this.selectedClientDiscount());
    this.touched.clear();
    this.clientSelect()?.nativeElement.focus();
  }

  /** Puts focus on the first field of the next line (the client stays selected). */
  focusNextLine(): void {
    this.machineSelect().nativeElement.focus();
  }

  private emptyDraft(discount: number): OrderDraft {
    return { clientId: 0, machineId: 0, startDate: '', endDate: '', plateNumber: '', discount, ...DEFAULT_TAX };
  }

  private formatDay(value: string): string {
    return formatDate(value.slice(0, 10), 'mediumDate', 'en-US');
  }
}
