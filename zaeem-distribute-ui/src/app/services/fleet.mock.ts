import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface CompanyResponseDto {
  companyId: number;
  companyName: string;
  outstandingBalance: number;
  totalBilledToDate: number;
  defaultDiscount?: number;
}

export interface ActiveRental {
  id: string;
  orderId?: number;
  companyName: string;
  machineName: string;
  plateNumber: string;
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
  items?: any[];
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
  private readonly machineryCatalog: Machinery[] = [
    { id: 101, name: 'Excavator X3000', category: 'Heavy Duty', dailyRate: 450 },
    { id: 102, name: 'Caterpillar Loader', category: 'Construction', dailyRate: 320 },
    { id: 103, name: 'Tower Crane T1', category: 'Cranes', dailyRate: 850 },
    { id: 104, name: 'Bulldozer D9', category: 'Earthmoving', dailyRate: 550 },
    { id: 105, name: 'Asphalt Paver', category: 'Roadwork', dailyRate: 400 }
  ];

  private companiesSubject = new BehaviorSubject<CompanyResponseDto[]>([
    { companyId: 1, companyName: 'Al Zaeem Plant Hire', outstandingBalance: 259237.60, totalBilledToDate: 500000, defaultDiscount: 15 },
    { companyId: 2, companyName: 'Desert Builders LLC', outstandingBalance: 69902.84, totalBilledToDate: 150000, defaultDiscount: 10 },
    { companyId: 3, companyName: 'TechFlow Logistics', outstandingBalance: 25300.00, totalBilledToDate: 80000, defaultDiscount: 5 }
  ]);
  companies$ = this.companiesSubject.asObservable();

  private machinerySubject = new BehaviorSubject<Machinery[]>(this.machineryCatalog);
  machinery$ = this.machinerySubject.asObservable();

  private rentalsSubject = new BehaviorSubject<ActiveRental[]>([]);
  rentals$ = this.rentalsSubject.asObservable();

  constructor() {}

  getCompanies(): Observable<CompanyResponseDto[]> {
    return this.companies$.pipe(delay(300));
  }

  getMachinery(): Observable<Machinery[]> {
    return this.machinery$.pipe(delay(300));
  }

  getRentals(): Observable<ActiveRental[]> {
    return this.rentals$.pipe(delay(300));
  }

  placeBulkOrder(payload: OrderRequestDto): Observable<any> {
    const currentCompanies = this.companiesSubject.value;
    const companyIndex = currentCompanies.findIndex(c => c.companyId === payload.companyId);

    if (companyIndex !== -1) {
      const company = currentCompanies[companyIndex];
      const orderId = Math.floor(Math.random() * 90000) + 10000;

      // Date Intersection Check (StartA <= EndB) && (EndA >= StartB)
      if (payload.items) {
        const existingRentals = this.rentalsSubject.value;
        const hasOverlap = payload.items.some(newItem => 
          existingRentals.some(existing => 
            existing.plateNumber === newItem.plateNumber &&
            existing.status !== 'Cancelled' &&
            new Date(newItem.startDate) <= new Date(existing.endDate) &&
            new Date(newItem.endDate) >= new Date(existing.startDate)
          )
        );

        if (hasOverlap) {
          // Emulate a conflict response similar to what the API would return
          return of({ result: 'CONFLICT: Asset already booked for these dates.' }).pipe(delay(500));
        }

        const newRentals: ActiveRental[] = payload.items.map(item => ({
          id: Math.random().toString(36).substr(2, 9),
          orderId: orderId,
          companyName: company.companyName,
          machineName: item.machineName,
          plateNumber: item.plateNumber,
          startDate: item.startDate,
          endDate: item.endDate,
          dailyRate: item.dailyRate,
          discount: item.discount,
          totalAmount: item.lineTotal,
          status: 'Active'
        }));

        this.rentalsSubject.next([...this.rentalsSubject.value, ...newRentals]);
      }

      const updatedCompanies = [...currentCompanies];
      updatedCompanies[companyIndex] = {
        ...company,
        outstandingBalance: company.outstandingBalance + payload.orderTotal,
        totalBilledToDate: company.totalBilledToDate + payload.orderTotal
      };
      this.companiesSubject.next(updatedCompanies);

      return of({ result: 'SUCCESS', orderId: orderId }).pipe(delay(500));
    }
    return of({ result: 'ERROR: Company not found' }).pipe(delay(500));
  }

  cancelOrder(orderId: number): Observable<any> {
    const rentals = this.rentalsSubject.value;
    const rental = rentals.find(r => r.orderId === orderId);

    if (rental) {
      const updatedRentals = rentals.map(r => 
        r.orderId === orderId ? { ...r, status: 'Cancelled' } : r
      );
      this.rentalsSubject.next(updatedRentals);

      const companies = this.companiesSubject.value;
      const companyIndex = companies.findIndex(c => c.companyName === rental.companyName);
      if (companyIndex !== -1) {
        const updatedCompanies = [...companies];
        updatedCompanies[companyIndex].outstandingBalance -= rental.totalAmount;
        this.companiesSubject.next(updatedCompanies);
      }
    }
    return of(true).pipe(delay(300));
  }

  recordPayment(companyId: number, amount: number): Observable<boolean> {
    const currentCompanies = this.companiesSubject.value;
    const companyIndex = currentCompanies.findIndex(c => c.companyId === companyId);

    if (companyIndex !== -1 && amount > 0) {
      const updatedCompanies = [...currentCompanies];
      updatedCompanies[companyIndex] = {
        ...updatedCompanies[companyIndex],
        outstandingBalance: Math.max(0, updatedCompanies[companyIndex].outstandingBalance - amount)
      };
      this.companiesSubject.next(updatedCompanies);
      return of(true).pipe(delay(300));
    }
    return of(false).pipe(delay(300));
  }
}
