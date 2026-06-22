import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

/**
 * Standalone Mock Interceptor
 * 
 * Logic: 
 * 1. Checks if the environment is NOT localhost (e.g., GitHub Pages).
 * 2. If in production, it intercepts specific API routes to provide mock data.
 * 3. If in development (localhost), it passes requests through to the actual .NET API.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Defensive Pass-through: If on localhost, do not touch the request.
  if (isLocalhost) {
    return next(req);
  }

  // Production Mocking Strategy
  // Targets both absolute localhost URLs and relative /api/ paths
  const isApiRequest = req.url.includes('localhost:5234') || req.url.includes('/api/');

  if (isApiRequest) {
    console.warn(`[Production-Mock] Intercepting request to: ${req.url}`);

    let mockBody: any = {};

    // Pattern Matching for Endpoint Redirection
    const url = req.url.toLowerCase();

    if (url.includes('companies') && req.method === 'GET') {
      mockBody = [
        { companyId: 1, companyName: 'Build-It Corp', outstandingBalance: 12500, totalBilledToDate: 45000, defaultDiscount: 10 },
        { companyId: 2, companyName: 'Swift Logistics', outstandingBalance: 85000, totalBilledToDate: 120000, defaultDiscount: 15 },
        { companyId: 3, companyName: 'Mega Structures', outstandingBalance: 0, totalBilledToDate: 25000, defaultDiscount: 5 }
      ];
    } else if (url.includes('orders/rentals') && req.method === 'GET') {
      mockBody = [
        { rentalItemId: 101, machineId: 101, machineName: 'Excavator X3000', companyName: 'Build-It Corp', plateNumber: 'DX-7728', startDate: new Date(Date.now() - 2*24*60*60*1000).toISOString(), endDate: new Date(Date.now() + 5*24*60*60*1000).toISOString(), dailyRate: 450, discount: 10, totalAmount: 2025, status: 'Active' },
        { rentalItemId: 102, machineId: 102, machineName: 'Caterpillar Loader', companyName: 'Swift Logistics', plateNumber: 'PL-4491', startDate: new Date(Date.now() - 1*24*60*60*1000).toISOString(), endDate: new Date(Date.now() + 6*24*60*60*1000).toISOString(), dailyRate: 320, discount: 15, totalAmount: 1904, status: 'Active' }
      ];
    } else if (url.includes('place-bulk-order')) {
      // Catching any variation of the bulk order endpoint
      mockBody = { result: 'SUCCESS', orderId: Math.floor(Math.random() * 10000), invoiceId: 'INV-2026-XXXX' };
    } else if (url.includes('payments/record')) {
      mockBody = { result: 'SUCCESS', receiptId: 'REC-' + Math.floor(Math.random() * 1000) };
    } else if (url.includes('payments/receipts') && req.method === 'GET') {
      mockBody = [
        { receiptId: 'REC-1001', companyId: 1, companyName: 'Build-It Corp', amount: 5000, paymentDate: new Date(Date.now() - 24*60*60*1000).toISOString() },
        { receiptId: 'REC-1002', companyId: 2, companyName: 'Swift Logistics', amount: 15000, paymentDate: new Date(Date.now() - 12*24*60*60*1000).toISOString() }
      ];
    } else if (url.includes('/orders/cancel/')) {
      mockBody = { message: 'Order cancelled successfully' };
    } else {
      // Generic success for any other potential API calls (e.g. Payments, etc)
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
