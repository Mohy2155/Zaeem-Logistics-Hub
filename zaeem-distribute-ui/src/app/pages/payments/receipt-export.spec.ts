import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { ReceiptDocument, downloadReceiptExcel, downloadReceiptPdf } from './receipt-export';

const receipt: ReceiptDocument = {
  receiptId: 'REC-1004',
  companyId: 1,
  companyName: 'Build-It Corp',
  amount: 5000,
  remainingBalance: 7500,
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
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    if (lastBlob) files.push({ name: this.download, blob: lastBlob });
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

describe('downloadReceiptExcel', () => {
  it('produces the receipt workbook with the balance after the payment', async () => {
    await downloadReceiptExcel(receipt);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('Receipt_REC-1004_Build-It_Corp.xlsx');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await bytes(files[0].blob)).buffer as ArrayBuffer);
    const sheet = workbook.getWorksheet('Payment Receipt')!;

    expect(sheet.getCell('A1').value).toBe('ZAEEM LOGISTICS HUB');
    expect((sheet.getRow(4).values as unknown[]).slice(1)).toEqual(['Financial Category', 'Transaction Details']);
    expect((sheet.getRow(5).values as unknown[]).slice(1)).toEqual(['Receipt Reference', 'REC-1004']);
    expect((sheet.getRow(7).values as unknown[]).slice(1)).toEqual(['Paying Client / Partner', 'Build-It Corp']);
    expect((sheet.getRow(8).values as unknown[]).slice(1)).toEqual(['Ledger Account ID', '#1']);
    expect((sheet.getRow(9).values as unknown[]).slice(1)).toEqual(['Transaction Amount', 5000]);
    expect((sheet.getRow(10).values as unknown[]).slice(1)).toEqual(['Remaining Outstanding Balance', 7500]);
    expect(sheet.getCell('B10').numFmt).toBe('$#,##0.00');
  });
});

describe('downloadReceiptPdf', () => {
  it('produces the receipt PDF with the original content', async () => {
    // jsPDF copies jsPDF.API members onto each document, so this swaps save() for a capture.
    const api = jsPDF.API as unknown as Record<string, unknown>;
    const originalSave = api['save'];
    api['save'] = function (this: jsPDF, name: string) {
      files.push({ name, blob: this.output('blob') });
      return this;
    };
    try {
      await downloadReceiptPdf(receipt);
    } finally {
      if (originalSave) api['save'] = originalSave; else delete api['save'];
    }
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('Receipt_REC-1004_Build-It_Corp.pdf');

    const text = new TextDecoder('latin1').decode(await bytes(files[0].blob));
    for (const expected of ['%PDF', 'ZAEEM LOGISTICS HUB', 'Receipt Reference: REC-1004', 'Build-It Corp', '#1', '$5000.00', '$7500.00']) {
      expect(text).toContain(expected);
    }
  });
});
