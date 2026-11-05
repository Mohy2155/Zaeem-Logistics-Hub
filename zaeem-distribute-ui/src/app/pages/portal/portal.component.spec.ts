import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CompanyResponseDto, CompanyService, OrderResult } from '../../services/company';
import { UiDialogService } from '../../ui/dialog';
import { OrderConfirmationData } from './order-confirmation.component';
import { OrderLineItem } from './order-pricing';
import { ClientPortalComponent } from './portal.component';

const client: CompanyResponseDto = { companyId: 1, companyName: 'Build-It Corp', outstandingBalance: 0, totalBilledToDate: 0 };

// 5 days at $33.33 less 10% is exactly $149.985: the server bills $149.99, the cart's floating point estimate $149.98.
const cartLine: OrderLineItem = {
  machineId: 101, machineName: 'Excavator X3000', plateNumber: 'DX-1', startDate: '2030-11-01', endDate: '2030-11-06',
  rentalDays: 5, dailyRate: 33.33, discount: 10, taxType: 'VAT', taxPercent: 0, lineTotal: 149.98,
};

const billed: OrderResult = {
  orderId: 7, result: 'SUCCESS', amountBilled: 149.99, outstandingBalance: 149.99,
  lines: [{ plateNumber: 'DX-1', amount: 149.99 }],
};

const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const overlay = () => document.querySelector('.cdk-overlay-container') as HTMLElement | null;

describe('ClientPortalComponent placing an order', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    overlay()?.remove();
  });

  it('confirms and invoices the amounts the server billed, not the cart estimate', async () => {
    TestBed.configureTestingModule({
      providers: [{
        provide: CompanyService,
        useValue: { loadCompanies: () => of({ companies: [client], totalOutstanding: 0 }), loadRentals: () => of([]), placeBulkOrder: () => of(billed) },
      }],
    });
    // Only the order logic is under test here, not the page's form and cart markup.
    TestBed.overrideTemplate(ClientPortalComponent, '');
    const dialogs = TestBed.inject(UiDialogService);
    const open = vi.spyOn(dialogs, 'open');

    const fixture = TestBed.createComponent(ClientPortalComponent);
    const portal = fixture.componentInstance as unknown as {
      companies: { set(v: CompanyResponseDto[]): void };
      clientId: { set(v: number): void };
      cart: { set(v: OrderLineItem[]): void };
      placeOrder(): void;
    };
    portal.companies.set([client]);
    portal.clientId.set(1);
    portal.cart.set([cartLine]);

    portal.placeOrder();
    await settle();

    const data = open.mock.calls[0][1]!.data as OrderConfirmationData;
    expect(data.order.total).toBe(149.99);
    expect(data.order.items.map(i => i.lineTotal)).toEqual([149.99]);

    const shown = overlay()!.textContent ?? '';
    expect(shown).toContain('$149.99');
    expect(shown).not.toContain('$149.98');
  });
});
