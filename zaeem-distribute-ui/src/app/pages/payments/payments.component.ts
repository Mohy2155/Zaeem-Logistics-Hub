import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService, CompanyResponseDto } from '../../services/company';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payments-container">
      <header class="content-header">
        <div class="breadcrumb">Executive Dashboard / Ledger</div>
        <h2>Payment Records</h2>
      </header>

      <div class="payments-layout">
        <!-- Partner Ledger Card -->
        <section class="glass-card ledger-card">
          <div class="card-header">
            <h3>Corporate Partner Balances</h3>
          </div>
          <div class="table-scroll-container">
            <table class="glass-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th class="text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of companies">
                  <td class="company-name-cell">{{ c.companyName }}</td>
                  <td class="text-right font-mono" [class.text-danger]="c.outstandingBalance > 50000" [class.text-success]="c.outstandingBalance === 0">
                    {{ c.outstandingBalance | currency }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </div>

      <!-- Receipt Log Table -->
      <section class="glass-card receipts-log-card">
        <div class="card-header">
          <h3>Payment Receipt History</h3>
          <span class="badge">{{ receipts.length }} Receipts</span>
        </div>
        <div class="table-scroll-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Receipt ID</th>
                <th>Client Partner</th>
                <th class="text-right">Amount Paid</th>
                <th>Received Date</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of receipts">
                <td class="font-mono">{{ r.receiptId }}</td>
                <td>{{ r.companyName }}</td>
                <td class="text-right font-mono text-success">{{ r.amount | currency }}</td>
                <td>{{ r.paymentDate | date:'medium' }}</td>
              </tr>
              <tr *ngIf="receipts.length === 0">
                <td colspan="4" class="empty-state-row">
                  No payment receipts recorded in current ledger.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .payments-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 1rem 0;
      animation: fadeIn 0.4s ease-out;
    }

    .content-header {
      margin-bottom: 0.5rem;
    }

    .breadcrumb {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 0.25rem;
    }

    h2 {
      font-size: 2rem;
      font-weight: 700;
      color: #0f172a;
    }

    .payments-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    @media (max-width: 768px) {
      .payments-layout {
        grid-template-columns: 1fr;
      }
    }

    .glass-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.45);
      border-radius: 16px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
      padding: 1.5rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      padding-bottom: 0.75rem;
    }

    .card-header h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #1e293b;
    }

    .badge {
      background: rgba(226, 232, 240, 0.8);
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
    }

    .table-scroll-container {
      overflow-x: auto;
      border-radius: 12px;
    }

    .glass-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .glass-table th {
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 2px solid rgba(226, 232, 240, 0.8);
    }

    .glass-table td {
      padding: 1rem;
      font-size: 0.875rem;
      border-bottom: 1px solid rgba(226, 232, 240, 0.5);
      color: #334155;
    }

    .company-name-cell {
      font-weight: 600;
      color: #0f172a;
    }

    .payment-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
    }

    .form-group select, .form-group input {
      padding: 0.75rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #334155;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-group select:focus, .form-group input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .btn-premium {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .btn-premium.primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #ffffff;
    }

    .btn-premium.primary:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
    }

    .btn-premium:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .text-right {
      text-align: right;
    }

    .text-danger {
      color: #ef4444;
    }

    .text-success {
      color: #10b981;
    }

    .empty-state-row {
      text-align: center;
      padding: 3rem !important;
      color: #64748b;
      font-style: italic;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class PaymentsComponent implements OnInit {
  private companyService = inject(CompanyService);

  companies: CompanyResponseDto[] = [];
  receipts: any[] = [];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.companyService.getCompanies().subscribe(data => this.companies = data);
    this.companyService.getReceipts().subscribe(data => this.receipts = data);
  }
}
