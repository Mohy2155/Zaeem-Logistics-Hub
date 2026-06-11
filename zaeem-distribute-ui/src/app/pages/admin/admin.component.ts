import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService, CompanyResponseDto, ActiveRental } from '../../services/company';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="premium-grid" style="grid-template-columns: 1fr; gap: 2rem;">
      <!-- Corporate Ledger Card -->
      <section class="polished-card inventory-section">
        <header class="card-header">
          <h3>Corporate Partner Ledger</h3>
          <span class="badge">{{ companies.length }} Active Partners</span>
        </header>
        
        <div class="ledger-table-container">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Partner ID</th>
                <th>Company Name</th>
                <th class="text-right">Balance Due</th>
                <th class="text-right">Lifetime Billed</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let company of companies">
                <td class="font-mono">#{{ company.companyId }}</td>
                <td style="font-weight: 600;">{{ company.companyName }}</td>
                <td class="text-right font-mono" [class.text-danger]="company.outstandingBalance > 100000">
                  {{ company.outstandingBalance | currency }}
                </td>
                <td class="text-right font-mono text-success">
                  {{ company.totalBilledToDate | currency }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="premium-grid" style="grid-template-columns: 1.2fr 0.8fr; gap: 2rem; align-items: start;">
        <!-- Equipment Rental Tracker -->
        <section class="polished-card">
          <header class="card-header">
            <h3>Active Equipment Rentals</h3>
            <span class="badge">{{ rentals.length }} Deployments</span>
          </header>

          <div class="ledger-table-container">
            <table class="premium-table">
              <thead>
                <tr>
                  <th>Equipment / Client</th>
                  <th>Rental Period</th>
                  <th>Status</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let rental of rentals">
                  <td>
                    <div style="font-weight: 600;">{{ rental.machineName }}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">{{ rental.companyName }}</div>
                  </td>
                  <td>
                    <div style="font-size: 0.8rem;">{{ rental.startDate | date:'shortDate' }} - {{ rental.endDate | date:'shortDate' }}</div>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="getRentalStatus(rental.endDate).toLowerCase().replace('/','-')">
                      {{ getRentalStatus(rental.endDate) }}
                    </span>
                  </td>
                  <td class="text-right font-mono">{{ rental.totalAmount | currency }}</td>
                </tr>
                <tr *ngIf="rentals.length === 0">
                  <td colspan="4" style="text-align: center; padding: 2rem;" class="text-muted italic">
                    No active equipment rentals tracked in system.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Admin Actions Card -->
        <section class="polished-card admin-section">
          <header class="card-header">
            <h3>Payment Management</h3>
          </header>
          
          <form (submit)="$event.preventDefault(); recordPayment()" class="admin-form">
            <div class="form-group">
              <label>Receiving Entity</label>
              <select [(ngModel)]="selectedAdminCompanyId" name="adminCompanyId" required>
                <option value="0" disabled selected>Select partner company...</option>
                <option *ngFor="let c of companies" [value]="c.companyId">
                  {{ c.companyName }} ({{ c.outstandingBalance | currency }})
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Transaction Amount ($)</label>
              <input type="number" [(ngModel)]="paymentAmount" name="paymentAmount" placeholder="0.00" min="1" required />
            </div>

            <button type="submit" class="btn-premium action" [disabled]="selectedAdminCompanyId === 0 || paymentAmount <= 0">
              ✅ Record Received Payment
            </button>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-badge.active { background-color: #dcfce7; color: #166534; }
    .status-badge.returned-overdue { background-color: #fee2e2; color: #991b1b; }
    .italic { font-style: italic; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private companyService = inject(CompanyService);
  
  companies: CompanyResponseDto[] = [];
  rentals: ActiveRental[] = [];
  selectedAdminCompanyId: number = 0;
  paymentAmount: number = 0;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.companyService.getCompanies().subscribe(data => this.companies = data);
    this.companyService.getRentals().subscribe(data => this.rentals = data);
  }

  getRentalStatus(endDate: string): string {
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(0,0,0,0);

    return today <= end ? 'Active' : 'Overdue/Returned';
  }

  recordPayment(): void {
    if (this.selectedAdminCompanyId === 0 || this.paymentAmount <= 0) return;

    this.companyService.recordPayment(Number(this.selectedAdminCompanyId), this.paymentAmount).subscribe(success => {
      if (success) {
        this.paymentAmount = 0;
        this.loadData();
      }
    });
  }
}
