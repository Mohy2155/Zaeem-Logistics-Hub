import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, delay, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MACHINERY_CATALOG } from './fleet';

export interface CompanyResponseDto {
  companyId: number;
  companyName: string;
  outstandingBalance: number;
  totalBilledToDate: number;
  defaultDiscount?: number; // Added field
}

export interface PaymentReceipt {
  receiptId: string;
  companyId: number;
  companyName: string;
  amount: number;
  paymentDate: string;
}

export interface PaymentResult {
  result: string;
  receiptId?: string;
}

export interface ActiveRental {
  id: string;
  orderId?: number; // Backend BulkOrderId; absent for rentals created before orders were linked
  machineId?: number;
  companyName: string;
  machineName: string;
  plateNumber?: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  discount: number;
  totalAmount: number;
  status?: string;
  taxType?: string;
  taxPercent?: number;
}

export interface OrderRequestItem {
  machineId: number;
  machineName: string;
  plateNumber: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  discount: number;
  taxType: string;
  taxPercent: number;
}

// The server prices every line, so the request carries no totals.
export interface OrderRequestDto {
  companyId: number;
  items: OrderRequestItem[];
}

/** What the server billed for one line of a placed order. */
export interface BilledLine {
  plateNumber: string;
  amount: number;
}

export interface OrderResult {
  orderId: number;
  result: string;
  amountBilled: number;
  outstandingBalance: number;
  /** One per request line, in the same order. */
  lines: BilledLine[];
}

export interface CompaniesSnapshot {
  companies: CompanyResponseDto[];
  totalOutstanding: number;
}

export interface Machinery {
  id: number;
  name: string;
  category: string;
  dailyRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private companiesSubject = new BehaviorSubject<CompanyResponseDto[]>([]);
  companies$ = this.companiesSubject.asObservable();

  private totalOutstandingSubject = new BehaviorSubject<number>(0);
  totalOutstanding$ = this.totalOutstandingSubject.asObservable();

  private machinerySubject = new BehaviorSubject<Machinery[]>(MACHINERY_CATALOG);
  machinery$ = this.machinerySubject.asObservable();

  private companiesUrl = `${environment.apiUrl}/api/Companies`;
  private ordersUrl = `${environment.apiUrl}/api/orders`;
  private paymentsUrl = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) {
    this.refreshCompanies();
  }

  // The API owns balances; re-read them after every mutation instead of patching local copies.
  private refreshCompanies(): void {
    this.loadCompanies().subscribe({
      error: (err) => {
        console.error('Failed to fetch data from the DB/API. Ensure the backend is running at', this.companiesUrl, err);
      }
    });
  }

  /** Fetches clients and the total receivable; errors reach the subscriber (for loading/error views). */
  loadCompanies(): Observable<CompaniesSnapshot> {
    return this.http.get<CompanyResponseDto[] | null>(this.companiesUrl).pipe(
      map((data): CompaniesSnapshot => {
        const companies = data ?? [];
        return { companies, totalOutstanding: companies.reduce((acc, curr) => acc + (curr.outstandingBalance || 0), 0) };
      }),
      tap(snapshot => {
        this.companiesSubject.next(snapshot.companies);
        this.totalOutstandingSubject.next(snapshot.totalOutstanding);
      })
    );
  }

  getCompanies(): Observable<CompanyResponseDto[]> {
    return this.companies$.pipe(delay(500));
  }

  getTotalOutstanding(): Observable<number> {
    return this.totalOutstanding$.pipe(delay(500));
  }

  getMachinery(): Observable<Machinery[]> {
    return this.machinery$.pipe(delay(500));
  }

  /** Rental line items; errors reach the subscriber (for loading/error views). */
  loadRentals(): Observable<ActiveRental[]> {
    return this.http.get<any[]>(`${this.ordersUrl}/rentals`).pipe(
      map(items => items.map(item => ({
        id: item.rentalItemId.toString(),
        orderId: item.bulkOrderId ?? undefined,
        machineId: item.machineId,
        companyName: item.companyName,
        machineName: item.machineName,
        plateNumber: item.plateNumber,
        startDate: item.startDate,
        endDate: item.endDate,
        dailyRate: item.dailyRate,
        discount: item.discount,
        totalAmount: item.totalAmount,
        status: item.status,
        taxType: item.taxType,
        taxPercent: item.taxPercent
      })))
    );
  }

  getRentals(): Observable<ActiveRental[]> {
    return this.loadRentals().pipe(
      catchError(err => {
        console.error('Failed to fetch rentals from', this.ordersUrl, err);
        return of([]);
      })
    );
  }

  // Post-paid B2B: the API bills the order onto the company's outstanding balance
  placeBulkOrder(order: OrderRequestDto): Observable<OrderResult> {
    // Only the request fields: cart lines also carry the preview's lineTotal and rentalDays.
    const items = order.items.map((item): OrderRequestItem => ({
      machineId: item.machineId,
      machineName: item.machineName,
      plateNumber: item.plateNumber,
      startDate: item.startDate,
      endDate: item.endDate,
      dailyRate: item.dailyRate,
      discount: item.discount,
      taxType: item.taxType,
      taxPercent: item.taxPercent,
    }));
    return this.http.post<OrderResult>(`${this.ordersUrl}/place-bulk-order`, { companyId: order.companyId, items }).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Deducts from outstandingBalance
  recordPayment(companyId: number, amount: number): Observable<PaymentResult> {
    return this.http.post<PaymentResult>(`${this.paymentsUrl}/record`, { companyId, amount }).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  /** Payment receipts; errors reach the subscriber (for loading/error views). */
  loadReceipts(): Observable<PaymentReceipt[]> {
    return this.http.get<PaymentReceipt[]>(`${this.paymentsUrl}/receipts`);
  }

  getReceipts(): Observable<PaymentReceipt[]> {
    return this.loadReceipts().pipe(
      catchError(err => {
        console.error('Failed to fetch receipts from', this.paymentsUrl, err);
        return of([]);
      })
    );
  }
}
