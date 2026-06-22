import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, delay, catchError } from 'rxjs/operators';

export interface CompanyResponseDto {
  companyId: number;
  companyName: string;
  outstandingBalance: number;
  totalBilledToDate: number;
  defaultDiscount?: number; // Added field
}

export interface ActiveRental {
  id: string;
  orderId?: number; // Added to link to backend order
  companyName: string;
  machineName: string;
  plateNumber?: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  discount: number;
  totalAmount: number;
  status?: string;
}

export interface OrderRequestDto {
  companyId: number;
  orderTotal: number;
  items?: any[]; // Optional items for local tracking
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

  // State management for offline-mode simulation
  private companiesSubject = new BehaviorSubject<CompanyResponseDto[]>([]);
  companies$ = this.companiesSubject.asObservable();

  private machinerySubject = new BehaviorSubject<Machinery[]>(this.machineryCatalog);
  machinery$ = this.machinerySubject.asObservable();

  private rentalsSubject = new BehaviorSubject<ActiveRental[]>([]);
  rentals$ = this.rentalsSubject.asObservable();

  private companiesUrl = 'http://localhost:5234/api/Companies'; 
  private ordersUrl = 'http://localhost:5234/api/orders';
  private paymentsUrl = 'http://localhost:5234/api/payments';

  constructor(private http: HttpClient) {
    // Initial load from "API"
    this.fetchInitialCompanies();
  }

  private fetchInitialCompanies(): void {
    // In a real scenario, we'd fetch from HttpClient. 
    // For this mock/offline exercise, if the API fails, we use fallback data.
    this.http.get<CompanyResponseDto[]>(this.companiesUrl).subscribe({
      next: (data) => this.companiesSubject.next(data),
      error: () => {
        // Fallback mock data if API is not running
        this.companiesSubject.next([
          { companyId: 1, companyName: 'Build-It Corp', outstandingBalance: 12500, totalBilledToDate: 45000 },
          { companyId: 2, companyName: 'Swift Logistics', outstandingBalance: 85000, totalBilledToDate: 120000 },
          { companyId: 3, companyName: 'Mega Structures', outstandingBalance: 0, totalBilledToDate: 25000 }
        ]);
      }
    });
  }

  getCompanies(): Observable<CompanyResponseDto[]> {
    return this.companies$.pipe(delay(500));
  }

  getMachinery(): Observable<Machinery[]> {
    return this.machinery$.pipe(delay(500));
  }

  getRentals(): Observable<ActiveRental[]> {
    return this.http.get<any[]>(`${this.ordersUrl}/rentals`).pipe(
      map(items => items.map(item => ({
        id: item.rentalItemId.toString(),
        orderId: item.rentalItemId,
        companyName: item.companyName,
        machineName: item.machineName,
        plateNumber: item.plateNumber,
        startDate: item.startDate,
        endDate: item.endDate,
        dailyRate: item.dailyRate,
        discount: item.discount,
        totalAmount: item.totalAmount,
        status: item.status
      }))),
      tap(data => this.rentalsSubject.next(data)),
      catchError(() => {
        return this.rentals$;
      })
    );
  }

  // Increases balance and total billed for post-paid B2B simulation
  placeBulkOrder(payload: OrderRequestDto): Observable<any> {
    const currentCompanies = this.companiesSubject.value;
    const companyIndex = currentCompanies.findIndex(c => c.companyId === payload.companyId);

    if (companyIndex !== -1) {
      const company = currentCompanies[companyIndex];
      
      // In a real scenario, we'd call the API:
      return this.http.post<any>(`${this.ordersUrl}/place-bulk-order`, payload).pipe(
        tap(result => {
          // Update local state - No upper limit block on checkout anymore
          const updatedCompanies = [...currentCompanies];
          updatedCompanies[companyIndex] = {
            ...company,
            outstandingBalance: company.outstandingBalance + payload.orderTotal,
            totalBilledToDate: company.totalBilledToDate + payload.orderTotal
          };
          this.companiesSubject.next(updatedCompanies);

          // Add to rentals if items are present
          if (payload.items && payload.items.length > 0) {
            const newRentals: ActiveRental[] = payload.items.map(item => ({
              id: Math.random().toString(36).substr(2, 9),
              orderId: result?.orderId,
              companyName: company.companyName,
              machineName: item.machineName,
              plateNumber: item.plateNumber, // Mapped for validation
              startDate: item.startDate,
              endDate: item.endDate,
              dailyRate: item.dailyRate,
              discount: item.discount,
              totalAmount: item.lineTotal
            }));
            this.rentalsSubject.next([...this.rentalsSubject.value, ...newRentals]);
          }
        })
      );
    }
    return of(false).pipe(delay(500));
  }

  // New method to cancel a processed order
  cancelOrder(orderId: number, rentalId: string): Observable<any> {
    return this.http.post(`${this.ordersUrl}/cancel/${orderId}`, {}).pipe(
      tap(() => {
        // Find the rental to update its status locally and adjust company balance
        const rentals = this.rentalsSubject.value;
        const rental = rentals.find(r => r.id === rentalId);
        
        if (rental) {
          const updatedRentals = rentals.map(r => 
            r.id === rentalId ? { ...r, status: 'Cancelled' } : r
          );
          this.rentalsSubject.next(updatedRentals);

          // Also update the company's outstanding balance
          const companies = this.companiesSubject.value;
          const companyIndex = companies.findIndex(c => c.companyName === rental.companyName);
          if (companyIndex !== -1) {
            const updatedCompanies = [...companies];
            updatedCompanies[companyIndex].outstandingBalance -= rental.totalAmount;
            this.companiesSubject.next(updatedCompanies);
          }
        }
      })
    );
  }

  // Deducts from outstandingBalance
  recordPayment(companyId: number, amount: number): Observable<any> {
    const payload = { companyId, amount };
    return this.http.post<any>(`${this.paymentsUrl}/record`, payload).pipe(
      tap(result => {
        if (result && result.result === 'SUCCESS') {
          const currentCompanies = this.companiesSubject.value;
          const companyIndex = currentCompanies.findIndex(c => c.companyId === companyId);
          if (companyIndex !== -1) {
            const company = currentCompanies[companyIndex];
            const updatedCompanies = [...currentCompanies];
            updatedCompanies[companyIndex] = {
              ...company,
              outstandingBalance: Math.max(0, company.outstandingBalance - amount)
            };
            this.companiesSubject.next(updatedCompanies);
          }
        }
      })
    );
  }

  getReceipts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.paymentsUrl}/receipts`).pipe(
      catchError(() => {
        return of([
          { receiptId: 'REC-1001', companyId: 1, companyName: 'Build-It Corp', amount: 5000, paymentDate: new Date(Date.now() - 24*60*60*1000).toISOString() },
          { receiptId: 'REC-1002', companyId: 2, companyName: 'Swift Logistics', amount: 15000, paymentDate: new Date(Date.now() - 12*24*60*60*1000).toISOString() }
        ]);
      })
    );
  }
}
