import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyResponseDto } from '../../services/company';
import { UiFormField, UiControl } from '../../ui/form-field';
import { UiButton } from '../../ui/button';
import { formatBalance } from '../admin/ledger';
import { checkPayment } from './payment-form';

export interface PaymentRequest {
  client: CompanyResponseDto;
  amount: number;
  balanceAfter: number;
}

/** Record Payment form: client, amount, live balance preview. The page confirms and submits. */
@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, UiFormField, UiControl, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.scss',
})
export class PaymentFormComponent {
  readonly clients = input.required<CompanyResponseDto[]>();
  /** Client to select when the form opens (from `/payments?client=<id>`). */
  readonly initialClientId = input<number | null>(null);
  readonly busy = input(false);
  readonly submitted = output<PaymentRequest>();

  private readonly clientSelect = viewChild.required<ElementRef<HTMLSelectElement>>('clientSelect');
  private readonly amountInput = viewChild<ElementRef<HTMLInputElement>>('amountInput');

  protected readonly clientId = signal<number | null>(null);
  protected readonly amount = signal<number | null>(null);
  protected readonly amountTouched = signal(false);

  protected readonly client = computed(() => this.clients().find(c => c.companyId === this.clientId()) ?? null);
  protected readonly balance = computed(() => this.client()?.outstandingBalance ?? null);
  protected readonly hasBalance = computed(() => (this.balance() ?? 0) >= 0.005);
  protected readonly check = computed(() => checkPayment(this.balance(), this.amount()));
  protected readonly amountError = computed(() => {
    const check = this.check();
    // "Enter the amount" waits until the field was visited; real problems with a typed amount show at once.
    if (this.amount() === null) return this.amountTouched() && this.client() && this.hasBalance() ? check.amountError : null;
    return check.amountError;
  });
  protected readonly formatBalance = formatBalance;

  constructor() {
    // Apply the preselected client once the client list has arrived.
    effect(() => {
      const id = this.initialClientId();
      if (id !== null && this.clientId() === null && this.clients().some(c => c.companyId === id)) this.clientId.set(id);
    });
  }

  protected onClientChange(id: number | null): void {
    this.clientId.set(id === null ? null : Number(id));
    this.amountTouched.set(false);
    // An amount typed for another client is kept but rechecked against the new balance.
  }

  protected onAmountChange(value: number | string | null): void {
    this.amount.set(value === null || value === '' ? null : Number(value));
  }

  protected payFullBalance(): void {
    const balance = this.balance();
    if (balance === null || balance <= 0) return;
    this.amount.set(Math.round(balance * 100) / 100);
    this.amountInput()?.nativeElement.focus();
  }

  protected submit(): void {
    const client = this.client();
    const amount = this.amount();
    const check = this.check();
    this.amountTouched.set(true);
    if (!client || amount === null || !check.valid || check.balanceAfter === null || this.busy()) return;
    this.submitted.emit({ client, amount, balanceAfter: check.balanceAfter });
  }

  focus(): void {
    this.clientSelect().nativeElement.focus();
  }
}
