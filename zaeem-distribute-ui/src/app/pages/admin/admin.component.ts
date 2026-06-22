import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService, CompanyResponseDto, ActiveRental } from '../../services/company';
import { ToastService } from '../../services/toast';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="premium-grid" style="grid-template-columns: 1.5fr 1fr; gap: 2rem; align-items: start;">
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
                <th style="width: 15%;">Partner ID</th>
                <th style="width: 45%;">Company Name</th>
                <th style="width: 20%; text-align: right;">Balance Due</th>
                <th style="width: 20%; text-align: right;">Lifetime Billed</th>
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
            Record Payment from Client
          </button>
        </form>
      </section>
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
             Download Excel Receipt
          </button>
          <button class="btn-premium primary" (click)="generateReceiptPDF()">
             Download PDF Receipt
          </button>
          <button class="btn-text" (click)="showReceiptModal = false" style="margin-top: 1rem;">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .polished-card {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 16px;
      box-shadow: 0 4px 20px 0 rgba(15, 23, 42, 0.05);
      padding: 2rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .polished-card:hover {
      box-shadow: 0 8px 30px 0 rgba(15, 23, 42, 0.08);
    }
    .card-header {
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      padding-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-header h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }
    .premium-table {
      width: 100%;
      border-collapse: collapse;
    }
    .premium-table th {
      background-color: #f8fafc;
      padding: 0.75rem 1rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 2px solid #e2e8f0;
      text-align: left;
    }
    .premium-table td {
      padding: 1.25rem 1rem;
      font-size: 0.85rem;
      border-bottom: 1px solid #f1f5f9;
      color: #0f172a;
    }
    .premium-table tr:hover {
      background-color: rgba(248, 250, 252, 0.5);
    }
    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
    }
    .status-badge.pending { background-color: #fef9c3; color: #a16207; }
    .status-badge.active { background-color: #dcfce7; color: #15803d; }
    .status-badge.expired { background-color: #fee2e2; color: #b91c1c; }
    
    .btn-cancel {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-cancel:hover {
      background: #fecaca;
      color: #7f1d1d;
      border-color: #f87171;
    }
    
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
  private toastService = inject(ToastService);
  
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

  cancelProcessedOrder(orderId: number, rentalId: string): void {
    this.companyService.cancelOrder(orderId, rentalId).subscribe({
      next: () => {
        this.toastService.show('Deployment order cancelled and balance recalculated.');
        this.loadData();
      },
      error: (err) => {
        this.toastService.show('Failed to cancel deployment: ' + (err.error?.message || err.message), true);
      }
    });
  }

  getRentalStatus(startDate: string, endDate: string): string {
    const today = new Date('2026-06-22T00:00:00');
    today.setHours(0,0,0,0);
    
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    
    const end = new Date(endDate);
    end.setHours(0,0,0,0);

    if (today < start) {
      return 'Pending';
    } else if (today >= start && today <= end) {
      return 'Active';
    } else {
      return 'Expired';
    }
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
      
      // Force grid lines visibility
      worksheet.views = [{ showGridLines: true }];

      // ZAEEM LOGISTICS HUB header row
      const titleRow = worksheet.addRow(['ZAEEM LOGISTICS HUB']);
      titleRow.font = { name: 'Arial', family: 2, size: 16, bold: true, color: { argb: 'FFF8FAFC' } };
      
      const cellA1 = worksheet.getCell('A1');
      cellA1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Dark Slate '#1E293B'
      };
      
      // Subtitle
      const subtitleRow = worksheet.addRow(['Official Payment Receipt & Statement']);
      subtitleRow.font = { name: 'Arial', family: 2, size: 10, italic: true, color: { argb: 'FF64748B' } };
      
      worksheet.addRow([]); // Blank row
      
      // Metadata headers
      const metaHeader = worksheet.addRow(['Financial Category', 'Transaction Details']);
      metaHeader.font = { name: 'Arial', family: 2, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      metaHeader.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' } // Dark Slate '#1E293B'
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' }
        };
      });

      // Data Rows
      const rowsData = [
        ['Receipt Reference', this.receiptId],
        ['Transaction Date', new Date().toLocaleString()],
        ['Paying Client / Partner', this.lastPaymentCompany.companyName],
        ['Ledger Account ID', `#${this.lastPaymentCompany.companyId}`],
        ['Transaction Amount', this.lastPaymentAmount],
        ['Remaining Outstanding Balance', this.lastPaymentCompany.outstandingBalance]
      ];

      rowsData.forEach((data, index) => {
        const row = worksheet.addRow(data);
        row.font = { name: 'Arial', family: 2, size: 10 };
        
        // Zebra striping: use soft slate '#F1F5F9' for alternate rows
        const isAlternate = index % 2 === 1;
        const bgColor = isAlternate ? 'FFF1F5F9' : 'FFFFFFFF';
        
        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          // Explicit currency formatting for amount columns
          if (data[0] === 'Transaction Amount' || data[0] === 'Remaining Outstanding Balance') {
            if (colNumber === 2) {
              cell.numFmt = '$#,##0.00';
            }
          }
        });
      });

      worksheet.addRow([]); // Blank row
      
      const footerRow = worksheet.addRow(['Thank you for your business. For billing queries, contact finance@zaeem.com.']);
      footerRow.font = { name: 'Arial', family: 2, size: 9, italic: true, color: { argb: 'FF94A3B8' } };

      // Auto-fit columns dynamically at runtime using column max-length calculations plus safety padding
      worksheet.columns.forEach(column => {
        if (column && column.eachCell) {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const val = cell.value ? cell.value.toString() : '';
            if (val.length > maxLength) {
              maxLength = val.length;
            }
          });
          column.width = maxLength < 12 ? 15 : maxLength + 4; // Add safety padding
        }
      });

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
