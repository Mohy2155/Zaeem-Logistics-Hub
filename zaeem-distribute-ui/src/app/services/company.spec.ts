import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderLineItem } from '../pages/portal/order-pricing';
import { CompanyService } from './company';

describe('CompanyService.placeBulkOrder', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('posts each line without the cart preview\'s line total or day count', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(CompanyService);
    const http = TestBed.inject(HttpTestingController);
    const cartLine: OrderLineItem = {
      machineId: 101, machineName: 'Excavator X3000', plateNumber: 'DX-7728', startDate: '2030-11-01', endDate: '2030-11-08',
      rentalDays: 7, dailyRate: 450, discount: 10, taxType: 'VAT', taxPercent: 0, lineTotal: 2835,
    };

    service.placeBulkOrder({ companyId: 1, items: [cartLine] }).subscribe();

    const request = http.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/orders/place-bulk-order'));
    const posted = request.request.body;
    expect(posted.items[0]).not.toHaveProperty('lineTotal');
    expect(posted.items[0]).not.toHaveProperty('rentalDays');
    expect(posted).toEqual({
      companyId: 1,
      items: [{
        machineId: 101, machineName: 'Excavator X3000', plateNumber: 'DX-7728', startDate: '2030-11-01', endDate: '2030-11-08',
        dailyRate: 450, discount: 10, taxType: 'VAT', taxPercent: 0,
      }],
    });
  });
});
