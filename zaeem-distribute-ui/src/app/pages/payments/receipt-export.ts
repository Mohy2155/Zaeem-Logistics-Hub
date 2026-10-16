import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/** What a payment receipt shows. Moved verbatim from the old ledger page's generators. */
export interface ReceiptDocument {
  receiptId: string;
  companyId: number;
  companyName: string;
  amount: number;
  /** Balance after this payment. (The old page printed the balance from before the payment.) */
  remainingBalance: number;
}

export async function downloadReceiptExcel(receipt: ReceiptDocument): Promise<void> {
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
      ['Receipt Reference', receipt.receiptId],
      ['Transaction Date', new Date().toLocaleString()],
      ['Paying Client / Partner', receipt.companyName],
      ['Ledger Account ID', `#${receipt.companyId}`],
      ['Transaction Amount', receipt.amount],
      ['Remaining Outstanding Balance', receipt.remainingBalance]
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
    anchor.download = `Receipt_${receipt.receiptId}_${receipt.companyName.replace(/\s+/g, '_')}.xlsx`;
    anchor.click();
  } catch (e) { console.error(e); }
}

export async function downloadReceiptPdf(receipt: ReceiptDocument): Promise<void> {
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
    doc.text(`Receipt Reference: ${receipt.receiptId}`, 14, 45);
    doc.text(`Transaction Date: ${new Date().toLocaleString()}`, 14, 50);
    doc.text(`Status: Completed / Paid`, 14, 55);

    // Create a neat structure table for transaction line items
    const body = [
      ["Paying Client / Partner", receipt.companyName],
      ["Ledger Account ID", `#${receipt.companyId}`],
      ["Transaction Amount", `$${receipt.amount.toFixed(2)}`],
      ["Remaining Outstanding Balance", `$${receipt.remainingBalance.toFixed(2)}`]
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
    doc.save(`Receipt_${receipt.receiptId}_${receipt.companyName.replace(/\s+/g, '_')}.pdf`);
  } catch (e) { console.error(e); }
}
