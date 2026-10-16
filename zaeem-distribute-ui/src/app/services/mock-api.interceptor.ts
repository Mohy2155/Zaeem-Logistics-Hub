import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, throwError, timer } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Booking, findBookingConflict, normalizePlate, rentalDays } from './rental-dates';

/** Fails the request the way the real API would, after the same simulated latency. */
const mockError = (status: number, message: string) =>
  timer(600).pipe(mergeMap(() => throwError(() => new HttpErrorResponse({ status, error: { message } }))));

/** Persistent sequential id, so mock ids never collide the way random ones did. */
const nextId = (key: string, start: number): number => {
  const id = Number(localStorage.getItem(key)) || start;
  localStorage.setItem(key, (id + 1).toString());
  return id;
};

/**
 * Initialize localStorage helper
 */
const initLocalStorage = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('zaeem_companies')) {
    const defaultCompanies = [
      { companyId: 1, companyName: 'Build-It Corp', outstandingBalance: 12500, totalBilledToDate: 45000, defaultDiscount: 10 },
      { companyId: 2, companyName: 'Swift Logistics', outstandingBalance: 85000, totalBilledToDate: 120000, defaultDiscount: 15 },
      { companyId: 3, companyName: 'Mega Structures', outstandingBalance: 0, totalBilledToDate: 25000, defaultDiscount: 5 }
    ];
    localStorage.setItem('zaeem_companies', JSON.stringify(defaultCompanies));
  }

  if (!localStorage.getItem('zaeem_rentals')) {
    const defaultRentals = [
      { rentalItemId: 101, machineId: 101, machineName: 'Excavator X3000', companyName: 'Build-It Corp', plateNumber: 'DX-7728', startDate: new Date(Date.now() - 2*24*60*60*1000).toISOString(), endDate: new Date(Date.now() + 5*24*60*60*1000).toISOString(), dailyRate: 450, discount: 10, totalAmount: 2835, status: 'Active' },
      { rentalItemId: 102, machineId: 102, machineName: 'Caterpillar Loader', companyName: 'Swift Logistics', plateNumber: 'PL-4491', startDate: new Date(Date.now() - 1*24*60*60*1000).toISOString(), endDate: new Date(Date.now() + 6*24*60*60*1000).toISOString(), dailyRate: 320, discount: 15, totalAmount: 1904, status: 'Active' }
    ];
    localStorage.setItem('zaeem_rentals', JSON.stringify(defaultRentals));
  }

  if (!localStorage.getItem('zaeem_receipts')) {
    const defaultReceipts = [
      { receiptId: 'REC-1001', companyId: 1, companyName: 'Build-It Corp', amount: 5000, paymentDate: new Date(Date.now() - 24*60*60*1000).toISOString() },
      { receiptId: 'REC-1002', companyId: 2, companyName: 'Swift Logistics', amount: 15000, paymentDate: new Date(Date.now() - 12*24*60*60*1000).toISOString() }
    ];
    localStorage.setItem('zaeem_receipts', JSON.stringify(defaultReceipts));
  }
};

/**
 * Safe JSON parser to prevent unhandled interceptor crashes.
 */
const safeJsonParse = (key: string, fallback: any = []) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`[SafeParse] Corrupted payload detected for key: ${key}. Purging cache.`);
    localStorage.removeItem(key);
    return fallback;
  }
};

/**
 * Standalone Mock Interceptor
 * 
 * Logic: 
 * 1. Checks if the environment is NOT localhost (e.g., GitHub Pages).
 * 2. If in production, it intercepts specific API routes to provide localStorage persistence.
 * 3. If in development (localhost), it passes requests through to the actual .NET API.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockData) {
    return next(req);
  }

  // Ensure state is initialized
  initLocalStorage();

  // Production Mocking Strategy
  // Targets both absolute localhost URLs and relative /api/ paths
  const isApiRequest = req.url.includes('localhost:5234') || req.url.includes('/api/');

  if (isApiRequest) {
    console.warn(`[Production-Mock] Intercepting request to: ${req.url}`);

    let mockBody: any = {};

    // Pattern Matching for Endpoint Redirection
    const url = req.url.toLowerCase();

    if (url.includes('companies') && req.method === 'GET') {
      const companiesArray = safeJsonParse('zaeem_companies', []);
      const totalOutstanding = companiesArray.reduce((sum: number, c: any) => sum + (c.outstandingBalance || 0), 0);
      mockBody = { items: companiesArray, totalSystemOutstanding: totalOutstanding };
    } else if (url.includes('orders/rentals') && req.method === 'GET') {
      mockBody = safeJsonParse('zaeem_rentals', []);
    } else if (url.includes('place-bulk-order')) {
      // Mirrors OrdersController.PlaceBulkOrder: double-booking check, then bill from the line items
      const payload: any = req.body || {};
      const items: any[] = Array.isArray(payload.items) ? payload.items : [];
      const companies = safeJsonParse('zaeem_companies', []);
      const company = companies.find((c: any) => c.companyId === Number(payload.companyId));
      if (!company) return mockError(404, 'Company not found.');
      if (items.length === 0) return mockError(400, 'Order must contain at least one item.');

      const rentals = safeJsonParse('zaeem_rentals', []);
      const booked: Booking[] = [...rentals];
      for (const item of items) {
        if (rentalDays(item.startDate, item.endDate) <= 0) {
          return mockError(400, `End date must be after start date for plate ${normalizePlate(item.plateNumber)}.`);
        }
        if (findBookingConflict(item, booked)) {
          return mockError(409, `Scheduling conflict: plate ${normalizePlate(item.plateNumber)} is already booked during ${item.startDate} to ${item.endDate}.`);
        }
        booked.push(item);
      }

      const orderTotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
      company.outstandingBalance += orderTotal;
      company.totalBilledToDate += orderTotal;
      localStorage.setItem('zaeem_companies', JSON.stringify(companies));

      const orderId = nextId('zaeem_order_seq', 1);
      let rentalId = Math.max(1000, ...rentals.map((r: any) => Number(r.rentalItemId) || 0));
      const newRentals = items.map((item: any) => ({
        rentalItemId: ++rentalId,
        bulkOrderId: orderId,
        machineId: item.machineId,
        machineName: item.machineName,
        companyName: company.companyName,
        plateNumber: normalizePlate(item.plateNumber),
        startDate: item.startDate,
        endDate: item.endDate,
        dailyRate: item.dailyRate || 0,
        discount: item.discount || 0,
        totalAmount: item.lineTotal || 0,
        status: 'Active',
        taxType: item.taxType || 'VAT',
        taxPercent: item.taxPercent || 0
      }));
      localStorage.setItem('zaeem_rentals', JSON.stringify([...rentals, ...newRentals]));

      mockBody = { result: 'SUCCESS', orderId, amountBilled: orderTotal, outstandingBalance: company.outstandingBalance };
    } else if (url.includes('payments/record')) {
      // Mirrors CompaniesController.RecordPayment validation
      const payload: any = req.body || {};
      const amount = Number(payload.amount);
      const companies = safeJsonParse('zaeem_companies', []);
      const company = companies.find((c: any) => c.companyId === Number(payload.companyId));
      if (!(amount > 0)) return mockError(400, 'Payment amount must be greater than zero.');
      if (!company) return mockError(404, 'Company not found.');
      if (amount > company.outstandingBalance) {
        return mockError(400, `Payment exceeds the outstanding balance of ${company.outstandingBalance.toFixed(2)}.`);
      }

      company.outstandingBalance -= amount;
      localStorage.setItem('zaeem_companies', JSON.stringify(companies));

      const receipts = safeJsonParse('zaeem_receipts', []);
      const receipt = {
        receiptId: 'REC-' + nextId('zaeem_receipt_seq', 1003),
        companyId: company.companyId,
        companyName: company.companyName,
        amount,
        paymentDate: new Date().toISOString()
      };
      receipts.unshift(receipt);
      localStorage.setItem('zaeem_receipts', JSON.stringify(receipts));
      mockBody = { result: 'SUCCESS', receiptId: receipt.receiptId };
    } else if (url.includes('payments/receipts') && req.method === 'GET') {
      mockBody = safeJsonParse('zaeem_receipts', []);
    } else {
      mockBody = { result: 'SUCCESS', status: 200 };
    }

    // Short-circuit the request and return a fabricated HttpResponse
    return of(new HttpResponse({ 
      status: 200, 
      body: mockBody 
    })).pipe(delay(600)); // Latency simulation for realistic UI behavior
  }

  // Pass non-API assets (styles, assets) through normally
  return next(req);
};
