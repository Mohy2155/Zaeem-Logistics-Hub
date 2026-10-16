import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { CompletedOrder, downloadInvoiceExcel, downloadInvoicePdf } from './invoice-export';

const order: CompletedOrder = {
  invoiceId: 'INV-1042',
  company: { companyId: 1, companyName: 'Build-It Corp', outstandingBalance: 0, totalBilledToDate: 0 },
  items: [
    { machineId: 101, machineName: 'Excavator X3000', plateNumber: 'DX-9001', startDate: '2026-10-22', endDate: '2026-10-24',
      rentalDays: 2, dailyRate: 450, discount: 10, taxType: 'VAT', taxPercent: 5, lineTotal: 850.5 },
    { machineId: 103, machineName: 'Tower Crane T1', plateNumber: 'TC-0101', startDate: '2026-10-23', endDate: '2026-10-26',
      rentalDays: 3, dailyRate: 850, discount: 10, taxType: 'None', taxPercent: 0, lineTotal: 2295 },
  ],
  total: 3145.5,
};

// Captures the generated file instead of downloading it.
let files: { name: string; blob: Blob }[];
let lastBlob: Blob | null;

beforeEach(() => {
  files = [];
  lastBlob = null;
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn((blob: Blob) => { lastBlob = blob; return 'blob:test'; }),
    revokeObjectURL: vi.fn(),
  }));
  const capture = function (this: HTMLAnchorElement) {
    if (lastBlob) files.push({ name: this.download, blob: lastBlob });
  };
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(capture);
  vi.spyOn(HTMLAnchorElement.prototype, 'dispatchEvent').mockImplementation(function (this: HTMLAnchorElement) {
    capture.call(this);
    return true;
  });
});

afterEach(() => vi.restoreAllMocks());

// jsdom's Blob has no stream()/arrayBuffer(); FileReader works everywhere.
const bytes = (blob: Blob) => new Promise<Uint8Array>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

describe('downloadInvoiceExcel', () => {
  it('produces the invoice workbook with the original layout', async () => {
    await downloadInvoiceExcel(order);
    expect(files).toHaveLength(1);
    expect(files[0].name).toMatch(/^Invoice_Build-It_Corp_\d{4}-\d{2}-\d{2}\.xlsx$/);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await bytes(files[0].blob)).buffer as ArrayBuffer);
    const sheet = workbook.getWorksheet('Invoice')!;

    expect(sheet.getCell('A1').value).toBe('ZAEEM DISTRIBUTE');
    expect(sheet.getCell('J1').value).toBe('INVOICE');
    expect(sheet.getCell('A7').value).toBe('Build-It Corp');
    expect(sheet.getCell('I7').value).toBe('INV-1042');
    expect(sheet.getRow(10).values).toEqual([
      undefined, 'Item #', 'Machinery Name', 'Plate Number', 'Rental Period', 'Total Days', 'Daily Rate', 'Disc %', 'Tax Type', 'Tax %', 'Line Amount',
    ]);
    expect((sheet.getRow(11).values as unknown[]).slice(1, 4)).toEqual([1, 'Excavator X3000', 'DX-9001']);
    expect((sheet.getRow(11).values as unknown[]).slice(5)).toEqual([2, 450, '10%', 'VAT', '5%', 850.5]);
    expect((sheet.getRow(12).values as unknown[]).slice(8)).toEqual(['None', '0%', 2295]);
    expect(sheet.getCell('I14').value).toBe('TOTAL DUE:');
    expect(sheet.getCell('J14').value).toBe(3145.5);
  });
});

describe('downloadInvoicePdf', () => {
  it('produces the invoice PDF with the original content', async () => {
    // jsPDF copies jsPDF.API members onto each document, so this replaces save() with a capture.
    const api = jsPDF.API as unknown as Record<string, unknown>;
    api['save'] = function (this: jsPDF, name: string) {
      files.push({ name, blob: this.output('blob') });
      return this;
    };
    try {
      await downloadInvoicePdf(order);
    } finally {
      delete api['save'];
    }
    expect(files).toHaveLength(1);
    expect(files[0].name).toMatch(/^Invoice_Build-It_Corp_\d{4}-\d{2}-\d{2}\.pdf$/);

    const text = new TextDecoder('latin1').decode(await bytes(files[0].blob));
    for (const expected of ['%PDF', 'ZAEEM DISTRIBUTE', 'BILL TO: Build-It Corp', 'INVOICE NO: INV-1042', 'DX-9001', 'TC-0101',
      '$850.50', '$2295.00', 'TOTAL DUE: $3145.50']) {
      expect(text).toContain(expected);
    }
  });
});
