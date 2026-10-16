import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, delay, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CompanyResponseDto {
  companyId: number;
  companyName: string;
  outstandingBalance: number;
  totalBilledToDate: number;
  defaultDiscount?: number; // Added field
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
  lineTotal: number;
}

// The order total is computed server-side from the line items.
export interface OrderRequestDto {
  companyId: number;
  items: OrderRequestItem[];
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
  // Mock Machinery Catalog
  private readonly machineryCatalog: Machinery[] = [
    { id: 101, name: 'Excavator X3000', category: 'Heavy Duty', dailyRate: 450 },
    { id: 102, name: 'Caterpillar Loader', category: 'Construction', dailyRate: 320 },
    { id: 103, name: 'Tower Crane T1', category: 'Cranes', dailyRate: 850 },
    { id: 104, name: 'Bulldozer D9', category: 'Earthmoving', dailyRate: 550 },
    { id: 105, name: 'Asphalt Paver', category: 'Roadwork', dailyRate: 400 }
  ];

  private companiesSubject = new BehaviorSubject<CompanyResponseDto[]>([]);
  companies$ = this.companiesSubject.asObservable();

  private totalOutstandingSubject = new BehaviorSubject<number>(0);
  totalOutstanding$ = this.totalOutstandingSubject.asObservable();

  private machinerySubject = new BehaviorSubject<Machinery[]>(this.machineryCatalog);
  machinery$ = this.machinerySubject.asObservable();

  private companiesUrl = `${environment.apiUrl}/api/Companies`;
  private ordersUrl = `${environment.apiUrl}/api/orders`;
  private paymentsUrl = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) {
    this.refreshCompanies();
  }

  // The API owns balances; re-read them after every mutation instead of patching local copies.
  private refreshCompanies(): void {
    this.http.get<any>(this.companiesUrl).subscribe({
      next: (data) => {
        if (data && data.items) {
          this.companiesSubject.next(data.items);
          this.totalOutstandingSubject.next(data.totalSystemOutstanding || 0);
        } else {
          this.companiesSubject.next(data);
          this.totalOutstandingSubject.next(data.reduce((acc: number, curr: any) => acc + (curr.outstandingBalance || 0), 0));
        }
      },
      error: (err) => {
        console.error('Failed to fetch data from the DB/API. Ensure the backend is running at', this.companiesUrl, err);
        // We're no longer falling back to mock data here to avoid confusion.
      }
    });
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

  getRentals(): Observable<ActiveRental[]> {
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
      }))),
      catchError(err => {
        console.error('Failed to fetch rentals from', this.ordersUrl, err);
        return of([]);
      })
    );
  }

  // Post-paid B2B: the API bills the order onto the company's outstanding balance
  placeBulkOrder(payload: OrderRequestDto): Observable<any> {
    return this.http.post<any>(`${this.ordersUrl}/place-bulk-order`, payload).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Deducts from outstandingBalance
  recordPayment(companyId: number, amount: number): Observable<any> {
    return this.http.post<any>(`${this.paymentsUrl}/record`, { companyId, amount }).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  getReceipts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.paymentsUrl}/receipts`).pipe(
      catchError(err => {
        console.error('Failed to fetch receipts from', this.paymentsUrl, err);
        return of([]);
      })
    );
  }
}
