import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService, CompanyResponseDto, Machinery, ActiveRental } from './services/company';
import { ToastService } from './services/toast';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

export interface OrderLineItem {
  machineId: number;
  companyName: string; // Added to map company name to pending cart
  machineName: string;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyRate: number;
  discount: number;
  taxPercent: number;
  taxType: string;
  plateNumber?: string;
  originalPrice: number;
  lineTotal: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private companyService = inject(CompanyService);
  private toastService = inject(ToastService);

  // Global State
  companies: CompanyResponseDto[] = [];
  machinery: Machinery[] = [];
  rentals: ActiveRental[] = [];
  
  // Portal State
  selectedCompanyId: number = 0;
  selectedCompany: string = ''; 
  activePlateNumber: string = '';
  selectedMachineId: number = 0;
  discountPercent: number = 0;
  taxPercent: number = 0;
  taxType: string = 'VAT';
  startDate: string = '';
  endDate: string = '';
  minDate: string = '';
  previewOriginalPrice: number = 0;
  previewTotal: number = 0;
  previewDays: number = 0;
  cart: OrderLineItem[] = [];
  cartGrandTotal: number = 0;

  // Admin State
  selectedAdminCompanyId: number = 0;
  paymentAmount: number = 0;

  // UI State
  isLoading: boolean = false;
  showModal: boolean = false;
  lastProcessedCompany?: CompanyResponseDto;
  currentInvoiceNumber: string = '';
  toast$ = this.toastService.toast$;

  ngOnInit(): void {
    this.loadData();
    this.minDate = new Date().toISOString().split('T')[0];
  }

  loadData(): void {
    this.isLoading = true;
    this.companyService.getCompanies().subscribe(data => {
      this.companies = data;
      this.isLoading = false;
    });
    this.companyService.getMachinery().subscribe(data => this.machinery = data);
    if (this.companyService.getRentals) {
      this.companyService.getRentals().subscribe(data => {
        this.rentals = data;
        this.evaluateDeploymentLifecycles();
      });
    }
  }

  evaluateDeploymentLifecycles(): void {
    const today = new Date('2026-06-22T00:00:00');
    today.setHours(0, 0, 0, 0); // Clear out time variances

    this.rentals.forEach(item => {
      if (item.status === 'Cancelled') return;

      const start = new Date(item.startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(item.endDate);
      end.setHours(0, 0, 0, 0);

      if (today < start) {
        item.status = 'Pending';
      } else if (today >= start && today <= end) {
        item.status = 'Active';
      } else {
        item.status = 'Expired';
      }
    });
  }

  // --- Temporal Comparator ---
  getRentalStatus(startDateStr: string, endDateStr: string, currentStatus?: string): string {
    if (currentStatus === 'Cancelled') return 'Cancelled';
    if (!startDateStr || !endDateStr) return 'Pending';

    const today = new Date('2026-06-22T00:00:00');
    today.setHours(0, 0, 0, 0); // Normalize time boundary

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);

    if (today < start) {
      return 'Pending';
    } else if (today >= start && today <= end) {
      return 'Active';
    } else {
      return 'Expired';
    }
  }

  // --- Portal Logic ---
  onCompanyChange(): void {
    const company = this.companies.find(c => c.companyId === Number(this.selectedCompanyId));
    this.discountPercent = (company as any)?.defaultDiscount || 0;
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
        this.previewOriginalPrice = this.previewDays * (machine?.dailyRate || 0);
        const discounted = this.previewOriginalPrice * (1 - (this.discountPercent / 100));
        this.previewTotal = discounted * (1 + (this.taxPercent / 100));
      } else {
        this.previewDays = 0;
        this.previewOriginalPrice = 0;
        this.previewTotal = 0;
      }
    } else {
      this.previewOriginalPrice = 0;
      this.previewTotal = 0;
      this.previewDays = 0;
    }
  }

  get isEndDateValid(): boolean {
    if (!this.startDate || !this.endDate) return true;
    return new Date(this.endDate) > new Date(this.startDate);
  }

  get canAddToOrder(): boolean {
    return (this.selectedMachineId > 0 && !!this.startDate && !!this.endDate && this.isEndDateValid && this.selectedCompanyId > 0);
  }

  addToOrder(): void {
    if (!this.canAddToOrder) return;
    const machine = this.machinery.find(m => m.id === Number(this.selectedMachineId));
    const company = this.companies.find(c => c.companyId === Number(this.selectedCompanyId));
    if (!machine || !company) return;

    // --- Scheduling Validation Guardrail ---
    const newPlate = this.activePlateNumber || 'N/A';
    const hasOverlap = [...this.cart, ...this.rentals].some((item: any) => 
      item.plateNumber === newPlate &&
      item.status !== 'Cancelled' &&
      new Date(this.startDate) <= new Date(item.endDate) &&
      new Date(this.endDate) >= new Date(item.startDate)
    );

    if (hasOverlap) {
      this.toastService.show(`Operational Conflict: Asset [Plate ${newPlate}] is already booked during this timeline.`, true);
      return; // Halt insertion thread
    }

    this.cart.push({
      machineId: machine.id,
      companyName: company.companyName, 
      machineName: machine.name,
      plateNumber: this.activePlateNumber || 'N/A',
      startDate: this.startDate,
      endDate: this.endDate,
      rentalDays: this.previewDays,
      dailyRate: machine.dailyRate,
      discount: this.discountPercent,
      taxPercent: this.taxPercent,
      taxType: this.taxType,
      originalPrice: this.previewDays * machine.dailyRate,
      lineTotal: this.previewTotal
    });
    this.updateGrandTotal();
    this.resetFormSelection();
  }

  updateGrandTotal(): void {
    this.cartGrandTotal = this.cart.reduce((sum, item) => sum + item.lineTotal, 0);
  }

  removeLineItem(itemToRemove: OrderLineItem): void {
    // Explicit instance isolation filter
    this.cart = this.cart.filter(item => item !== itemToRemove);
    
    // Symmetrically recalculate metrics on the new isolated collection
    this.updateGrandTotal();
  }

  cancelProcessedOrder(orderId: number, rentalId: string): void {
    if (!orderId) {
      this.toastService.show('Order ID is missing, cannot cancel.', true);
      return;
    }

    this.isLoading = true;
    this.companyService.cancelOrder(orderId, rentalId).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show('Order Cancelled Successfully');
        this.loadData(); // Reload balances symmetrically
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.show(err.error?.message || 'Cancellation failed.', true);
      }
    });
  }

  getCartOriginalTotal(): number {
    return this.cart.reduce((sum, item) => sum + item.originalPrice, 0);
  }

  getCartDiscountTotal(): number {
    return this.cart.reduce((sum, item) => sum + (item.originalPrice * item.discount / 100), 0);
  }

  getCartTaxTotal(): number {
    return this.cart.reduce((sum, item) => {
      const discounted = item.originalPrice * (1 - item.discount / 100);
      return sum + (discounted * item.taxPercent / 100);
    }, 0);
  }

  get cartTaxType(): string {
    return this.cart.length > 0 ? this.cart[0].taxType : this.taxType;
  }

  get cartTaxPercent(): number {
    return this.cart.length > 0 ? this.cart[0].taxPercent : this.taxPercent;
  }

  finalizeOrder(): void {
    try {
      console.log('Finalize button clicked. Processing cart state...', this.cart);

      if (!this.cart || this.cart.length === 0 || this.selectedCompanyId === 0) {
        this.toastService.show('Please select a client and add items.', true);
        return;
      }

      const company = this.companies.find(c => c.companyId === Number(this.selectedCompanyId));
      if (!company) {
        this.toastService.show('Invalid company selection.', true);
        return;
      }

      // Defensive mapping loop for plate/company state
      this.cart.forEach(item => {
        if (item) {
          (item as any).plateNumber = this.activePlateNumber || 'N/A';
          item.companyName = this.selectedCompany || company.companyName || 'Walk-In Client';
        }
      });

      this.isLoading = true;
      this.companyService.placeBulkOrder({
        companyId: Number(this.selectedCompanyId),
        orderTotal: this.cartGrandTotal,
        items: this.cart
      } as any).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          
          if (response && response.result && response.result.includes('SUCCESS')) {
            console.log('Order processed successfully in database.');
            
            // Re-fetch updated ledger balances symmetrically
            this.loadData(); 

            const year = new Date().getFullYear();
            const randomNum = Math.floor(Math.random() * 9000) + 1000;
            this.currentInvoiceNumber = `INV-${year}-${randomNum}`;
            this.lastProcessedCompany = company; // Essential for downloads

            // Reveal download console layout panels
            this.showModal = true;
            this.toastService.show('Bulk Order Processed Successfully');
          } else {
            const errorMsg = response?.result || 'Transaction failed.';
            this.toastService.show(errorMsg, true);
          }
        },
        error: (err) => {
          this.isLoading = false;
          console.error('API Sync Error: Checkout pipeline halted.', err);
          this.toastService.show('Server connection error. Please ensure the API is running.', true);
        }
      });

    } catch (error) {
      console.error('CRITICAL CHECKOUT THREAD CRASH BLOCKED:', error);
      this.isLoading = false;
      this.toastService.show('A critical frontend error occurred.', true);
    }
  }

  // --- Admin Logic ---
  recordPayment(): void {
    if (this.selectedAdminCompanyId === 0 || this.paymentAmount <= 0) return;

    this.isLoading = true;
    this.companyService.recordPayment(Number(this.selectedAdminCompanyId), this.paymentAmount).subscribe(success => {
      this.isLoading = false;
      if (success) {
        this.toastService.show(`Payment of ${this.paymentAmount.toLocaleString('en-US', {style:'currency', currency:'USD'})} Recorded`);
        this.paymentAmount = 0;
        this.loadData();
      }
    });
  }

  // --- Export Logic ---
  async downloadExcel(company: CompanyResponseDto): Promise<void> {
    if (!company) {
      this.toastService.show('Error: No company data found for export.', true);
      return;
    }
    try {
      // 1. Safe prompt handling with timestamped fallback
      const defaultName = `Rental_Invoice_${new Date().getTime()}`;
      const userInput = window.prompt("Enter a custom name for your invoice file:", defaultName);

      // 2. Strict defensive evaluation to prevent crashes
      const fileName = (userInput && userInput.trim().length > 0) ? userInput.trim() : defaultName;
      console.log('Safe Filename evaluated to:', fileName);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Invoice');
      
      const columnDefinitions = [
        { key: 'itemNo', width: 8 },
        { key: 'companyName', width: 22 },
        { key: 'machineName', width: 22 },
        { key: 'plateNumber', width: 15 },
        { key: 'rentalPeriod', width: 28 },
        { key: 'totalDays', width: 12 },
        { key: 'dailyRate', width: 14 },
        { key: 'originalPrice', width: 14 },
        { key: 'discount', width: 14 },
        { key: 'taxType', width: 12 },
        { key: 'taxAmount', width: 14 },
        { key: 'lineTotal', width: 14 }
      ];

      columnDefinitions.forEach((col, idx) => {
        const column = worksheet.getColumn(idx + 1);
        column.width = col.width;
        column.key = col.key;
      });

      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'ZAEEM DISTRIBUTE';
      titleCell.font = { name: 'Arial Black', size: 20, bold: true, color: { argb: '1E293B' } };
      worksheet.getCell('L1').value = 'INVOICE';
      worksheet.getCell('L1').font = { size: 24, bold: true };
      worksheet.getCell('L1').alignment = { vertical: 'middle', horizontal: 'right' };

      worksheet.getCell('A6').value = 'BILL TO:';
      worksheet.getCell('A6').font = { bold: true };
      worksheet.getCell('A7').value = company.companyName;
      worksheet.getCell('K6').value = 'INVOICE DATE:';
      worksheet.getCell('L6').value = new Date().toLocaleDateString();
      worksheet.getCell('J7').value = 'INVOICE NO:';
      worksheet.getCell('J7').font = { bold: true };
      worksheet.getCell('K7').value = this.currentInvoiceNumber;

      const headerRow = worksheet.getRow(10);
      headerRow.values = ['Item #', 'Company Name', 'Machinery Name', 'Plate Number', 'Rental Period', 'Total Days', 'Daily Rate', 'Original Price', 'Discount', 'Tax Type', 'Tax Amount', 'Line Total'];
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
      });

      this.cart.forEach((item, i) => {
        const rowNum = 11 + i;
        const row = worksheet.getRow(rowNum);
        row.values = {
          itemNo: i + 1,
          companyName: item.companyName,
          machineName: item.machineName,
          plateNumber: item.plateNumber || 'N/A',
          rentalPeriod: `${new Date(item.startDate).toLocaleDateString()} to ${new Date(item.endDate).toLocaleDateString()}`,
          totalDays: item.rentalDays,
          dailyRate: item.dailyRate,
          originalPrice: { formula: `F${rowNum}*G${rowNum}` },
          discount: { formula: `H${rowNum}*(${item.discount}/100)` },
          taxType: item.taxType,
          taxAmount: { formula: `(H${rowNum}-I${rowNum})*(${item.taxPercent}/100)` },
          lineTotal: { formula: `H${rowNum}-I${rowNum}+K${rowNum}` }
        };
        row.getCell('dailyRate').numFmt = '"$"#,##0.00';
        row.getCell('originalPrice').numFmt = '"$"#,##0.00';
        row.getCell('discount').numFmt = '"$"#,##0.00';
        row.getCell('taxAmount').numFmt = '"$"#,##0.00';
        row.getCell('lineTotal').numFmt = '"$"#,##0.00';
        row.commit();
      });

      const lastItemRow = 10 + this.cart.length;
      const subtotalRow = worksheet.getRow(lastItemRow + 2);
      subtotalRow.getCell(11).value = 'GRAND TOTAL:';
      subtotalRow.getCell(11).font = { bold: true };
      subtotalRow.getCell(12).value = { formula: `SUM(L11:L${lastItemRow})` };
      subtotalRow.getCell(12).numFmt = '"$"#,##0.00';
      subtotalRow.getCell(12).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${fileName}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error('Excel Download Error:', e); }
  }

  async downloadPDF(company: CompanyResponseDto): Promise<void> {
    if (!company) {
      this.toastService.show('Error: No company data found for export.', true);
      return;
    }
    try {
      // 1. Safe prompt handling with timestamped fallback
      const defaultName = `Rental_Invoice_${new Date().getTime()}`;
      const userInput = window.prompt("Enter a custom name for your invoice file:", defaultName);

      // 2. Strict defensive evaluation to prevent crashes
      const fileName = (userInput && userInput.trim().length > 0) ? userInput.trim() : defaultName;
      console.log('Safe Filename evaluated to:', fileName);

      const doc = new jsPDF('landscape');
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text('ZAEEM DISTRIBUTE', 14, 20);
      doc.setFontSize(10);
      doc.text(`BILL TO: ${company.companyName}`, 14, 35);
      doc.text(`DATE: ${new Date().toLocaleDateString()}`, 14, 40);
      doc.text(`INVOICE NO: ${this.currentInvoiceNumber}`, 14, 45);

      const tableHeaders = [['Item #', 'Machinery Name', 'Plate Number', 'Rental Period', 'Total Days', 'Daily Rate', 'Original Price', 'Discount', 'Line Amount']];
      
      const tableRows = this.cart.map((item, index) => {
        const discAmt = item.originalPrice * item.discount / 100;
        return [
          index + 1,
          item.machineName,
          item.plateNumber || 'N/A',
          `${new Date(item.startDate).toLocaleDateString()} to ${new Date(item.endDate).toLocaleDateString()}`,
          item.rentalDays,
          `$${Number(item.dailyRate).toFixed(2)}`,
          `$${Number(item.originalPrice).toFixed(2)}`,
          `-$${Number(Math.abs(discAmt)).toFixed(2)} (${item.discount}%)`,
          `$${Number(item.lineTotal).toFixed(2)}`
        ];
      });

      autoTable(doc, {
        startY: 50,
        head: tableHeaders,
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        styles: { fontSize: 7 }
      });

      doc.save(`${fileName}.pdf`);
    } catch (e) { console.error('PDF Download Error:', e); }
  }

  closeExportModal(): void {
    this.showModal = false;
    this.cart = [];
    this.cartGrandTotal = 0;
  }

  private resetFormSelection(): void {
    this.selectedMachineId = 0;
    this.discountPercent = 0;
    this.taxPercent = 0;
    this.taxType = 'VAT';
    this.startDate = '';
    this.endDate = '';
    this.previewTotal = 0;
    this.previewDays = 0;
  }
}
