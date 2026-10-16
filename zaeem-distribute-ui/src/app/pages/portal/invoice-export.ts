import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyResponseDto } from '../../services/company';
import { toIsoDay, toLocalDay } from '../../services/rental-dates';
import { OrderLineItem } from './order-pricing';

/** A placed order, kept after the cart is cleared so its invoice can be downloaded. */
export interface CompletedOrder {
  invoiceId: string;
  company: CompanyResponseDto;
  items: OrderLineItem[];
  total: number;
}

// Invoice documents. The layout and content are unchanged from the original portal; a redesign is out of scope.

/** Builds and downloads the invoice as an .xlsx file. Throws if generation fails. */
export async function downloadInvoiceExcel(order: CompletedOrder): Promise<void> {
  const company = order.company;
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
  worksheet.getCell('I7').value = order.invoiceId;

  const headerRow = worksheet.getRow(10);
  headerRow.values = ['Item #', 'Machinery Name', 'Plate Number', 'Rental Period', 'Total Days', 'Daily Rate', 'Disc %', 'Tax Type', 'Tax %', 'Line Amount'];
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Slate Brand Header
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center' };
  });

  order.items.forEach((item, i) => {
    const currentRowNum = 11 + i;
    const row = worksheet.getRow(currentRowNum);
    row.values = {
      itemNum: i + 1,
      machineName: item.machineName,
      plateNumber: item.plateNumber,
      rentalPeriod: `${toLocalDay(item.startDate).toLocaleDateString()} to ${toLocalDay(item.endDate).toLocaleDateString()}`,
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

  const lastItemRow = 10 + order.items.length;
  const subtotalRowIndex = lastItemRow + 2;
  const subtotalRow = worksheet.getRow(subtotalRowIndex);
  subtotalRow.getCell(9).value = 'TOTAL DUE:';
  subtotalRow.getCell(9).font = { bold: true };
  subtotalRow.getCell(10).value = order.total;
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
  anchor.download = `Invoice_${company.companyName.replace(/\s+/g, '_')}_${toIsoDay()}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/** Builds and downloads the invoice as a PDF. Throws if generation fails. */
export async function downloadInvoicePdf(order: CompletedOrder): Promise<void> {
  const company = order.company;
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text('ZAEEM DISTRIBUTE', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`BILL TO: ${company.companyName}`, 14, 35);
  doc.text(`DATE: ${new Date().toLocaleDateString()}`, 14, 40);
  doc.text(`INVOICE NO: ${order.invoiceId}`, 14, 45);

  const body = order.items.map((item, index) => [
    index + 1,
    item.machineName,
    item.plateNumber,
    `${toLocalDay(item.startDate).toLocaleDateString()} to ${toLocalDay(item.endDate).toLocaleDateString()}`,
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
  doc.text(`TOTAL DUE: $${order.total.toFixed(2)}`, 140, finalY + 10);

  doc.save(`Invoice_${company.companyName.replace(/\s+/g, '_')}_${toIsoDay()}.pdf`);
}
