import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CompanyService, CompanyResponseDto, Machinery } from '../../services/company';
import { ToastService } from '../../services/toast';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface OrderLineItem {
  machineId: number;
  machineName: string;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyRate: number;
  discount: number;
  lineTotal: number;
  plateNumber: string;
  taxType: string;
  taxPercent: number;
}

@Component({
  selector: 'app-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="premium-grid">
      <!-- Order Form Card -->
      <section class="polished-card order-section">
        <header class="card-header">
          <h3>Machinery Selection</h3>
        </header>
        
        <form (submit)="$event.preventDefault(); addToOrder()" class="order-form">
          <div class="form-group">
            <label>Client / Partner</label>
            <select [(ngModel)]="selectedCompanyId" (change)="onCompanyChange()" name="companyId" required [disabled]="cart.length > 0">
              <option value="0" disabled selected>Select a client...</option>
              <option *ngFor="let c of companies" [value]="c.companyId">
                {{ c.companyName }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Machinery Type</label>
            <select [(ngModel)]="selectedMachineId" (change)="onFormChange()" name="machineId" required>
              <option value="0" disabled selected>Choose equipment...</option>
              <option *ngFor="let m of machinery" [value]="m.id">
                {{ m.name }} ({{ m.dailyRate | currency }}/day)
              </option>
            </select>
          </div>

          <div class="premium-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0; padding: 0;">
            <div class="form-group">
              <label>Start Date</label>
              <input type="date" [(ngModel)]="startDate" (change)="onFormChange()" name="startDate" [min]="minDate" required />
            </div>
            <div class="form-group">
              <label>End Date</label>
              <input type="date" [(ngModel)]="endDate" (change)="onFormChange()" name="endDate" [min]="startDate || minDate" required [class.invalid]="!isEndDateValid" />
            </div>
          </div>

          <div class="form-group">
            <label>Plate Number</label>
            <input type="text" [(ngModel)]="plateNumber" name="plateNumber" placeholder="e.g. DX-7728" required />
          </div>

          <div class="premium-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0; padding: 0;">
            <div class="form-group">
              <label>Tax Type</label>
              <select [(ngModel)]="taxType" name="taxType" required>
                <option value="VAT">VAT</option>
                <option value="GST">GST</option>
                <option value="Sales Tax">Sales Tax</option>
                <option value="None">None</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tax (%)</label>
              <input type="number" [(ngModel)]="taxPercent" (change)="onFormChange()" name="taxPercent" min="0" max="100" required />
            </div>
          </div>

          <div class="form-group">
            <label>Trade Discount (%)</label>
            <input type="number" [(ngModel)]="discountOverride" (change)="onFormChange()" name="discount" placeholder="0" min="0" max="100" />
          </div>

          <div class="cost-summary-box" *ngIf="previewTotal > 0">
             <div class="summary-line">
               <span>Duration:</span>
               <strong>{{ previewDays }} Days</strong>
             </div>
             <div class="summary-line" *ngIf="discountOverride > 0">
               <span>Applied Discount:</span>
               <strong class="text-success">{{ discountOverride }}% Off</strong>
             </div>
             <div class="summary-line">
               <span>Estimate (incl. Tax):</span>
               <strong class="text-success">{{ previewTotal | currency }}</strong>
             </div>
          </div>

          <button type="submit" class="btn-premium action" [disabled]="!canAddToOrder || isProcessing">
            Add to Order
          </button>
        </form>
      </section>

      <!-- Cart Summary Card -->
      <section class="polished-card cart-section" *ngIf="cart.length > 0">
        <header class="card-header" style="margin-bottom: 0.5rem; border-bottom: none; padding-bottom: 0;">
          <h3>Order Summary</h3>
          <span class="badge">{{ cart.length }} Item(s)</span>
        </header>
        <div class="locked-company-header" style="padding: 0 0 1rem 0; font-weight: 700; color: #0f172a; font-size: 0.9rem; border-bottom: 1px solid rgba(226, 232, 240, 0.6); margin-bottom: 1rem;">
          Target Client: {{ lockedCompanyName }}
        </div>

        <div class="ledger-table-container mini-table">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th class="text-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of cart; let i = index">
                <td>
                  <div class="font-medium">{{ item.machineName }} ({{ item.plateNumber }})</div>
                  <div class="text-muted small">
                    {{ item.rentalDays }} days 
                    <span *ngIf="item.discount > 0">({{ item.discount }}% disc.)</span>
                    <span> - {{ item.taxType }} ({{ item.taxPercent }}%)</span>
                  </div>
                </td>
                <td class="text-right font-mono">{{ item.lineTotal | currency }}</td>
                <td class="text-right">
                  <button class="btn-premium danger" (click)="removeItem(i)" [disabled]="isProcessing" style="height: 32px; padding: 0 1rem; font-size: 0.85rem;">Remove</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="cart-summary-footer">
          <div class="grand-total-row">
            <span>Cart Total:</span>
            <span class="total-value">{{ cartGrandTotal | currency }}</span>
          </div>
          <button class="btn-premium primary" (click)="processBulkOrder()" [disabled]="isProcessing">
            Process Bulk Order
          </button>
        </div>
      </section>
    </div>

    <!-- Export Modal -->
    <div class="modal-backdrop" *ngIf="showExportModal">
      <div class="polished-card modal-card" style="max-width: 440px; text-align: center;">
        <header class="card-header" style="justify-content: center;">
          <h3 style="font-size: 1.5rem;">Order Complete</h3>
        </header>
        
        <div class="invoice-badge">{{ invoiceId }}</div>
        <p class="text-muted" style="margin-bottom: 2rem;">Please choose your distribution format:</p>
        
        <div class="modal-actions">
          <button class="btn-premium action" (click)="generateInvoice(lastProcessedCompany!)">
             Download Excel Spreadsheet
          </button>
          <button class="btn-premium primary" (click)="generatePDF(lastProcessedCompany!)">
             Download PDF Document
          </button>
          <button class="btn-premium secondary" (click)="closeExportModal()" style="margin-top: 1rem; width: 100%;">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .premium-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 2rem;
      padding: 1rem 0;
      animation: fadeIn 0.4s ease-out;
    }
    @media (max-width: 1024px) {
      .premium-grid {
        grid-template-columns: 1fr;
      }
    }
    .polished-card {
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.45);
      border-radius: 16px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
      padding: 2rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-header {
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(226, 232, 240, 0.6);
      padding-bottom: 0.75rem;
    }
    .card-header h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0f172a;
    }
    .order-form {
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
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .form-group select, .form-group input {
      height: 44px;
      padding: 0 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #334155;
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    .form-group select:focus, .form-group input:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }
    .btn-premium {
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
    }
    .btn-premium.action {
      background: linear-gradient(135deg, #0284c7, #0369a1) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
    }
    .btn-premium.action:hover:not(:disabled) {
      background: linear-gradient(135deg, #0369a1, #075985) !important;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(2, 132, 199, 0.35);
    }
    .btn-premium.primary {
      background: linear-gradient(135deg, #10b981, #059669) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    .btn-premium.primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669, #047857) !important;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
    }
    .btn-premium.danger {
      background: linear-gradient(135deg, #ef4444, #dc2626) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
    }
    .btn-premium.danger:hover:not(:disabled) {
      background: linear-gradient(135deg, #dc2626, #b91c1c) !important;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35);
    }
    .btn-premium.secondary {
      background: #f1f5f9 !important;
      color: #475569 !important;
      border: 1px solid #cbd5e1;
      box-shadow: none;
    }
    .btn-premium.secondary:hover:not(:disabled) {
      background: #e2e8f0 !important;
      color: #0f172a !important;
    }
    .btn-premium:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
    .cost-summary-box {
      background: rgba(248, 250, 252, 0.8);
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    .summary-line span {
      color: #64748b;
    }
    .summary-line strong {
      font-weight: 700;
      color: #0f172a;
    }
    .text-success { color: #10b981; }
    .text-muted { color: #64748b; }
    .invalid { border-color: #ef4444 !important; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ClientPortalComponent implements OnInit, OnDestroy {
  private companyService = inject(CompanyService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  companies: CompanyResponseDto[] = [];
  machinery: Machinery[] = [];
  isProcessing: boolean = false;
  
  selectedCompanyId: number = 0;
  selectedMachineId: number = 0;
  discountOverride: number = 0;
  startDate: string = '';
  endDate: string = '';
  minDate: string = '';
  plateNumber: string = '';
  taxType: string = 'VAT';
  taxPercent: number = 5;

  previewTotal: number = 0;
  previewDays: number = 0;

  cart: OrderLineItem[] = [];
  cartGrandTotal: number = 0;

  showExportModal: boolean = false;
  lastProcessedCompany?: CompanyResponseDto;
  invoiceId: string = '';
  
  completedOrderItems: OrderLineItem[] = [];
  completedOrderTotal: number = 0;

  ngOnInit(): void {
    this.companyService.getCompanies().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => this.companies = data,
      error: () => this.toastService.show('Failed to fetch clients.', true)
    });
    this.companyService.getMachinery().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => this.machinery = data,
      error: () => this.toastService.show('Failed to fetch machinery.', true)
    });
    this.minDate = new Date().toISOString().split('T')[0];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCompanyChange(): void {
    const company = this.companies.find(c => c.companyId === Number(this.selectedCompanyId));
    this.discountOverride = company?.defaultDiscount || 0;
    this.onFormChange();
  }

  onFormChange(): void {
    if (this.selectedMachineId && this.startDate && this.endDate) {
      const machine = this.machinery.find(m => m.id === Number(this.selectedMachineId));
      
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);

      if (end > start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        this.previewDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const subtotal = this.previewDays * (machine?.dailyRate || 0);
        const discounted = subtotal * (1 - (this.discountOverride / 100));
        this.previewTotal = discounted * (1 + (this.taxPercent / 100));
      } else {
        this.previewDays = 0;
        this.previewTotal = 0;
      }
    } else {
      this.previewTotal = 0;
      this.previewDays = 0;
    }
  }

  get lockedCompanyName(): string {
    const company = this.companies.find(c => c.companyId === Number(this.selectedCompanyId));
    return company ? company.companyName : 'Pending Selection...';
  }

  get isEndDateValid(): boolean {
    if (!this.startDate || !this.endDate) return true;
    return new Date(this.endDate) > new Date(this.startDate);
  }

  get canAddToOrder(): boolean {
    return (
      this.selectedMachineId > 0 &&
      !!this.startDate &&
      !!this.endDate &&
      this.isEndDateValid &&
      !!this.plateNumber
    );
  }

  addToOrder(): void {
    if (!this.canAddToOrder) return;
    const machine = this.machinery.find(m => m.id === Number(this.selectedMachineId));
    if (!machine) return;

    if (this.cart.some(item => item.machineId === machine.id)) {
      this.toastService.show('Scheduling Conflict: This specific machinery is already in your active order.', true);
      return;
    }

    this.cart.push({
      machineId: machine.id,
      machineName: machine.name,
      startDate: this.startDate,
      endDate: this.endDate,
      rentalDays: this.previewDays,
      dailyRate: machine.dailyRate,
      discount: this.discountOverride,
      lineTotal: this.previewTotal,
      plateNumber: this.plateNumber,
      taxType: this.taxType,
      taxPercent: this.taxPercent
    });
    this.updateGrandTotal();
    this.resetFormSelection();
  }

  updateGrandTotal(): void {
    this.cartGrandTotal = this.cart.reduce((sum, item) => sum + item.lineTotal, 0);
  }

  removeItem(index: number): void {
    this.cart.splice(index, 1);
    this.updateGrandTotal();
  }

  processBulkOrder(): void {
    if (this.cart.length === 0 || this.selectedCompanyId === 0) return;
    const company = this.companies.find(c => c.companyId === Number(this.selectedCompanyId));
    if (!company) return;

    this.isProcessing = true;

    // Cache the cart items so they can be exported after we clear the cart
    const exportedCart = [...this.cart];
    const exportedTotal = this.cartGrandTotal;

    this.companyService.placeBulkOrder({
      companyId: Number(this.selectedCompanyId),
      orderTotal: this.cartGrandTotal,
      items: this.cart
    }).subscribe({
      next: (response: any) => {
        this.isProcessing = false;
        if (response && response.result === 'SUCCESS') {
          this.invoiceId = (response.invoiceId && response.invoiceId !== 'INV-PENDING') ? response.invoiceId : `INV-${new Date().getTime()}`;
          this.lastProcessedCompany = company;
          
          this.completedOrderItems = exportedCart;
          this.completedOrderTotal = exportedTotal;
          
          this.cart = [];
          this.cartGrandTotal = 0;
          
          this.showExportModal = true;
          this.toastService.show('Bulk Order Processed Successfully');
        } else {
          this.toastService.show('Transaction failed', true);
        }
      },
      error: (err: any) => {
        this.isProcessing = false;
        console.error('Portal validation checkout failed:', err);
        this.toastService.show('Transaction failed', true);
      }
    });
  }

  async generateInvoice(company: CompanyResponseDto): Promise<void> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Invoice');
      worksheet.views = [{ showGridLines: true }];

      worksheet.columns = [
        { key: 'itemNum', width: 8 },
        { key: 'machineName', width: 25 },
        { key: 'plateNumber', width: 15 },
        { key: 'rentalPeriod', width: 25 },
        { key: 'totalDays', width: 12 },
        { key: 'dailyRate', width: 15 },
        { key: 'discount', width: 10 },
        { key: 'taxType', width: 12 },
        { key: 'taxPercent', width: 10 },
        { key: 'lineAmount', width: 15 }
      ];

      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'ZAEEM DISTRIBUTE';
      titleCell.font = { name: 'Arial Black', size: 20, bold: true, color: { argb: '1E293B' } };

      const invoiceLabelCell = worksheet.getCell('J1');
      invoiceLabelCell.value = 'INVOICE';
      invoiceLabelCell.font = { size: 24, bold: true };
      invoiceLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };

      worksheet.getCell('A6').value = 'BILL TO:';
      worksheet.getCell('A6').font = { bold: true };
      worksheet.getCell('A7').value = company.companyName;

      worksheet.getCell('I6').value = 'INVOICE DATE:';
      worksheet.getCell('J6').value = new Date().toLocaleDateString();
      worksheet.getCell('H7').value = 'INVOICE NO:';
      worksheet.getCell('H7').font = { bold: true };
      worksheet.getCell('I7').value = this.invoiceId;

      const headerRow = worksheet.getRow(10);
      headerRow.values = ['Item #', 'Machinery Name', 'Plate Number', 'Rental Period', 'Total Days', 'Daily Rate', 'Disc %', 'Tax Type', 'Tax %', 'Line Amount'];
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate Brand Header
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
      });

      this.completedOrderItems.forEach((item, i) => {
        const currentRowNum = 11 + i;
        const row = worksheet.getRow(currentRowNum);
        row.values = {
          itemNum: i + 1,
          machineName: item.machineName,
          plateNumber: item.plateNumber,
          rentalPeriod: `${new Date(item.startDate).toLocaleDateString()} to ${new Date(item.endDate).toLocaleDateString()}`,
          totalDays: item.rentalDays,
          dailyRate: item.dailyRate,
          discount: item.discount + '%',
          taxType: item.taxType,
          taxPercent: item.taxPercent + '%',
          lineAmount: item.lineTotal
        };
        row.getCell('dailyRate').numFmt = '"$"#,##0.00';
        row.getCell('lineAmount').numFmt = '"$"#,##0.00';

        // Alternating Zebra striping using soft slate #F1F5F9
        const isAlternate = i % 2 === 1;
        const bgColor = isAlternate ? 'FFF1F5F9' : 'FFFFFFFF';
        row.eachCell((cell) => {
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
        });
        row.commit();
      });

      const lastItemRow = 10 + this.completedOrderItems.length;
      const subtotalRowIndex = lastItemRow + 2;
      const subtotalRow = worksheet.getRow(subtotalRowIndex);
      subtotalRow.getCell(9).value = 'TOTAL DUE:';
      subtotalRow.getCell(9).font = { bold: true };
      subtotalRow.getCell(10).value = this.completedOrderTotal;
      subtotalRow.getCell(10).numFmt = '"$"#,##0.00';

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
          column.width = maxLength < 10 ? 12 : maxLength + 4;
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Invoice_${company.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.click();
    } catch (e) {
      console.error(e);
      this.toastService.show('Failed to generate document.', true);
    }
  }

  async generatePDF(company: CompanyResponseDto): Promise<void> {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text('ZAEEM DISTRIBUTE', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`BILL TO: ${company.companyName}`, 14, 35);
      doc.text(`DATE: ${new Date().toLocaleDateString()}`, 14, 40);
      doc.text(`INVOICE NO: ${this.invoiceId}`, 14, 45);

      const body = this.completedOrderItems.map((item, index) => [
        index + 1,
        item.machineName,
        item.plateNumber,
        `${new Date(item.startDate).toLocaleDateString()} to ${new Date(item.endDate).toLocaleDateString()}`,
        item.rentalDays,
        `$${item.dailyRate.toFixed(2)}`,
        `${item.discount}%`,
        item.taxType,
        `${item.taxPercent}%`,
        `$${item.lineTotal.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [["Item #", "Machinery Name", "Plate Number", "Rental Period", "Total Days", "Daily Rate", "Disc %", "Tax Type", "Tax %", "Line Amount"]],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`TOTAL DUE: $${this.completedOrderTotal.toFixed(2)}`, 140, finalY + 10);

      doc.save(`Invoice_${company.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
      this.toastService.show('Failed to generate document.', true);
    }
  }

  closeExportModal(): void {
    this.showExportModal = false;
    this.completedOrderItems = [];
    this.completedOrderTotal = 0;
  }

  private resetFormSelection(): void {
    this.selectedMachineId = 0;
    this.discountOverride = 0;
    this.startDate = '';
    this.endDate = '';
    this.previewTotal = 0;
    this.previewDays = 0;
    this.plateNumber = '';
    this.taxType = 'VAT';
    this.taxPercent = 5;
  }
}
