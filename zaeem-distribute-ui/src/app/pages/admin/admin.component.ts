import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService, CompanyResponseDto, ActiveRental } from '../../services/company';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
              <label>Paying Client / Partner</label>
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
              ✅ Record Payment from Client
            </button>
          </form>
        </section>
      </div>
    </div>

    <!-- Receipt Modal -->
    <div class="modal-backdrop" *ngIf="showReceiptModal">
      <div class="polished-card modal-card" style="max-width: 440px; text-align: center;">
        <header class="card-header" style="justify-content: center;">
          <h3 style="font-size: 1.5rem;">Payment Received</h3>
        </header>
        
        <div class="invoice-badge" style="background: #ecfdf5; color: #065f46; border-color: #a7f3d0;">
          {{ receiptId }}
        </div>
        <p class="text-muted" style="margin-bottom: 2rem;">Payment of <strong>{{ lastPaymentAmount | currency }}</strong> from <strong>{{ lastPaymentCompany?.companyName }}</strong> recorded.</p>
        
        <div class="modal-actions">
          <button class="btn-premium action" (click)="generateReceiptExcel()">
             📊 Download Excel Receipt
          </button>
          <button class="btn-premium primary" (click)="generateReceiptPDF()">
             📄 Download PDF Receipt
          </button>
          <button class="btn-text" (click)="showReceiptModal = false" style="margin-top: 1rem;">
            Dismiss
          </button>
        </div>
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

    .admin-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.5rem;
      background: rgba(30, 41, 59, 0.65); /* Glassmorphic dark overlay */
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      box-sizing: border-box;
    }
    .admin-form .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .admin-form .form-group label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8; /* Light slate text for dark form */
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .admin-form select, .admin-form input {
      height: 44px;
      padding: 0 1rem;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.6) !important; /* Slate 900 translucent */
      color: #ffffff !important;
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    .admin-form select:focus, .admin-form input:focus {
      border-color: #0284c7 !important;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.3) !important;
      background: rgba(15, 23, 42, 0.8) !important;
    }
    .admin-form option {
      background: #1e293b;
      color: #ffffff;
    }
    .admin-form .btn-premium {
      height: 44px;
      padding: 0 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #0284c7, #0369a1) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
    }
    .admin-form .btn-premium:hover:not(:disabled) {
      background: linear-gradient(135deg, #0369a1, #075985) !important;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(2, 132, 199, 0.45);
    }
    .admin-form .btn-premium:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private companyService = inject(CompanyService);
  
  companies: CompanyResponseDto[] = [];
  rentals: ActiveRental[] = [];
  selectedAdminCompanyId: number = 0;
  paymentAmount: number = 0;

  showReceiptModal: boolean = false;
  receiptId: string = '';
  lastPaymentCompany?: CompanyResponseDto;
  lastPaymentAmount: number = 0;

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
    const company = this.companies.find(c => c.companyId === Number(this.selectedAdminCompanyId));

    this.companyService.recordPayment(Number(this.selectedAdminCompanyId), this.paymentAmount).subscribe(response => {
      if (response && response.result === 'SUCCESS') {
        this.receiptId = response.receiptId || 'REC-PENDING';
        this.lastPaymentCompany = company;
        this.lastPaymentAmount = this.paymentAmount;
        this.showReceiptModal = true;
        
        this.paymentAmount = 0;
        this.loadData();
      }
    });
  }

  async generateReceiptExcel(): Promise<void> {
    if (!this.lastPaymentCompany) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Payment Receipt');
      
      worksheet.getCell('A1').value = 'ZAEEM DISTRIBUTE';
      worksheet.getCell('A1').font = { bold: true, size: 16 };
      worksheet.getCell('A2').value = 'OFFICIAL PAYMENT RECEIPT';
      
      worksheet.getCell('A4').value = 'RECEIPT NO:';
      worksheet.getCell('B4').value = this.receiptId;
      worksheet.getCell('A5').value = 'DATE:';
      worksheet.getCell('B5').value = new Date().toLocaleDateString();
      
      worksheet.getCell('A7').value = 'RECEIVED FROM:';
      worksheet.getCell('B7').value = this.lastPaymentCompany.companyName;
      worksheet.getCell('A8').value = 'AMOUNT PAID:';
      worksheet.getCell('B8').value = this.lastPaymentAmount;
      worksheet.getCell('B8').numFmt = '"$"#,##0.00';
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Receipt_${this.receiptId}_${this.lastPaymentCompany.companyName.replace(/\s+/g, '_')}.xlsx`;
      anchor.click();
    } catch (e) { console.error(e); }
  }

  async generateReceiptPDF(): Promise<void> {
    if (!this.lastPaymentCompany) return;
    try {
      const doc = new jsPDF();
      
      // Header Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text('ZAEEM LOGISTICS HUB', 14, 25);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text('Official Payment Receipt & Financial Statement', 14, 32);
      
      // Receipt Meta Details (Margins/Alignments)
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.text(`Receipt Reference: ${this.receiptId}`, 14, 45);
      doc.text(`Transaction Date: ${new Date().toLocaleString()}`, 14, 50);
      doc.text(`Status: Completed / Paid`, 14, 55);

      // Create a neat structure table for transaction line items
      const body = [
        ["Paying Client / Partner", this.lastPaymentCompany.companyName],
        ["Ledger Account ID", `#${this.lastPaymentCompany.companyId}`],
        ["Transaction Amount", `$${this.lastPaymentAmount.toFixed(2)}`],
        ["Remaining Outstanding Balance", `$${this.lastPaymentCompany.outstandingBalance.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: 65,
        head: [["Financial Category", "Transaction Details"]],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 100 }
        },
        styles: { cellPadding: 6 }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 120;

      // Footer disclaimer & signature
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text("Thank you for your business. For any billing queries, contact finance@zaeem.com.", 14, finalY + 20);
      
      // Save Receipt
      doc.save(`Receipt_${this.receiptId}_${this.lastPaymentCompany.companyName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { console.error(e); }
  }
}
