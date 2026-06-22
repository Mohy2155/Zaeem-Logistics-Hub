import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

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
      { rentalItemId: 101, machineId: 101, machineName: 'Excavator X3000', companyName: 'Build-It Corp', plateNumber: 'DX-7728', startDate: new Date(Date.now() - 2*24*60*60*1000).toISOString(), endDate: new Date(Date.now() + 5*24*60*60*1000).toISOString(), dailyRate: 450, discount: 10, totalAmount: 2025, status: 'Active' },
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
 * Standalone Mock Interceptor
 * 
 * Logic: 
 * 1. Checks if the environment is NOT localhost (e.g., GitHub Pages).
 * 2. If in production, it intercepts specific API routes to provide localStorage persistence.
 * 3. If in development (localhost), it passes requests through to the actual .NET API.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Defensive Pass-through: If on localhost, do not touch the request.
  if (isLocalhost) {
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
      mockBody = JSON.parse(localStorage.getItem('zaeem_companies') || '[]');
    } else if (url.includes('orders/rentals') && req.method === 'GET') {
      mockBody = JSON.parse(localStorage.getItem('zaeem_rentals') || '[]');
    } else if (url.includes('place-bulk-order')) {
      const payload: any = req.body;
      const companies = JSON.parse(localStorage.getItem('zaeem_companies') || '[]');
      const company = companies.find((c: any) => c.companyId === Number(payload.companyId));
      if (company) {
        company.outstandingBalance += payload.orderTotal;
        company.totalBilledToDate += payload.orderTotal;
        localStorage.setItem('zaeem_companies', JSON.stringify(companies));

        // Add items to rentals
        if (payload.items && payload.items.length > 0) {
          const rentals = JSON.parse(localStorage.getItem('zaeem_rentals') || '[]');
          const newRentals = payload.items.map((item: any) => ({
            rentalItemId: Math.floor(Math.random() * 10000) + 1000,
            machineId: item.machineId,
            machineName: item.machineName,
            companyName: company.companyName,
            plateNumber: item.plateNumber || 'DX-' + Math.floor(Math.random() * 9000 + 1000),
            startDate: item.startDate,
            endDate: item.endDate,
            dailyRate: item.dailyRate,
            discount: item.discount,
            totalAmount: item.lineTotal,
            status: 'Active',
            taxType: item.taxType,
            taxPercent: item.taxPercent
          }));
          localStorage.setItem('zaeem_rentals', JSON.stringify([...rentals, ...newRentals]));
        }
      }
      mockBody = { result: 'SUCCESS', orderId: Math.floor(Math.random() * 10000), invoiceId: 'INV-' + Math.floor(Math.random() * 9000 + 1000) };
    } else if (url.includes('payments/record')) {
      const payload: any = req.body;
      const companies = JSON.parse(localStorage.getItem('zaeem_companies') || '[]');
      const company = companies.find((c: any) => c.companyId === Number(payload.companyId));
      if (company) {
        company.outstandingBalance = Math.max(0, company.outstandingBalance - payload.amount);
        localStorage.setItem('zaeem_companies', JSON.stringify(companies));

        const receipts = JSON.parse(localStorage.getItem('zaeem_receipts') || '[]');
        const receipt = {
          receiptId: 'REC-' + (Math.floor(Math.random() * 9000) + 1000),
          companyId: company.companyId,
          companyName: company.companyName,
          amount: payload.amount,
          paymentDate: new Date().toISOString()
        };
        receipts.unshift(receipt);
        localStorage.setItem('zaeem_receipts', JSON.stringify(receipts));
        mockBody = { result: 'SUCCESS', receiptId: receipt.receiptId };
      } else {
        mockBody = { result: 'SUCCESS', receiptId: 'REC-' + Math.floor(Math.random() * 1000) };
      }
    } else if (url.includes('payments/receipts') && req.method === 'GET') {
      mockBody = JSON.parse(localStorage.getItem('zaeem_receipts') || '[]');
    } else if (url.includes('orders/rentals') && req.method === 'DELETE') {
      const parts = url.split('/');
      const rentalItemId = Number(parts[parts.length - 1]);
      
      const rentals = JSON.parse(localStorage.getItem('zaeem_rentals') || '[]');
      const rentalIndex = rentals.findIndex((r: any) => r.rentalItemId === rentalItemId || r.id === rentalItemId.toString());
      
      if (rentalIndex !== -1) {
        const rental = rentals[rentalIndex];
        
        // Remove from list
        rentals.splice(rentalIndex, 1);
        localStorage.setItem('zaeem_rentals', JSON.stringify(rentals));

        // Deduct order total from the company outstanding balance
        const companies = JSON.parse(localStorage.getItem('zaeem_companies') || '[]');
        const company = companies.find((c: any) => c.companyName === rental.companyName);
        if (company) {
          company.outstandingBalance = Math.max(0, company.outstandingBalance - rental.totalAmount);
          localStorage.setItem('zaeem_companies', JSON.stringify(companies));
        }
      }
      mockBody = { message: 'Rental item cancelled and removed successfully' };
    } else if (url.includes('/orders/cancel/')) {
      // Fetch associated rental to modify state
      const parts = url.split('/');
      const orderId = Number(parts[parts.length - 1]);
      // Optional: find and cancel the rental in mock store
      const rentals = JSON.parse(localStorage.getItem('zaeem_rentals') || '[]');
      const rental = rentals.find((r: any) => r.orderId === orderId || r.rentalItemId === orderId);
      if (rental) {
        rental.status = 'Cancelled';
        localStorage.setItem('zaeem_rentals', JSON.stringify(rentals));
      }
      mockBody = { message: 'Order cancelled successfully' };
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
