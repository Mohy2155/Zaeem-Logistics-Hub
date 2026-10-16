import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { handleMockRequest, MOCK_STORAGE, MockCompany, MockOrder, MockReceipt, MockRental } from './mock-api';

/**
 * Runs the shared contract cases (contracts/api-cases.json) against the demo mock API.
 * The .NET API runs the same cases in ZaeemDistribute.Api.Tests; the format is described in contracts/README.md.
 * The API is the source of truth: when a case fails here, fix mock-api.ts, not the case.
 */

interface Given {
  clients?: { id: number; name: string; balance: number; discount?: number; active?: boolean }[];
  rentals?: { id: number; client: string; plate: string; start: string; end: string; total: number; status?: string; orderId?: number; machineName?: string; machineId?: number }[];
  orders?: { id: number; clientId: number; total: number; status?: string }[];
  receipts?: { id: number; clientId: number; amount: number; paidAt: string }[];
}

interface ContractCase {
  name: string;
  given?: Given;
  request: { method: string; path: string; body?: unknown };
  expect: {
    status: number;
    body?: unknown;
    message?: string;
    messageStartsWith?: string;
    balances?: Record<string, number>;
    rentalStatuses?: Record<string, string | string[]>;
    rentalCount?: number;
    receiptCount?: number;
    rentalsAfter?: unknown;
  };
}

/** The test runner's working directory is the app folder; the cases live at the repository root. */
function findCasesFile(): string {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const candidate = join(dir, 'contracts', 'api-cases.json');
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) throw new Error(`contracts/api-cases.json not found above ${process.cwd()}`);
  }
}

const cases: ContractCase[] = JSON.parse(readFileSync(findCasesFile(), 'utf8')).cases;

const API = 'http://localhost:5234';
const read = (key: string): any[] => JSON.parse(localStorage.getItem(key) ?? '[]');
const write = (key: string, rows: unknown[]) => localStorage.setItem(key, JSON.stringify(rows));

/** Writes `given` into localStorage in the mock's storage shape. */
function seed(given: Given = {}): void {
  const clients = given.clients ?? [];
  const clientName = (id: number) => clients.find(c => c.id === id)?.name ?? 'Unknown';
  write(MOCK_STORAGE.companies, clients.map((c): MockCompany => ({
    companyId: c.id,
    companyName: c.name,
    outstandingBalance: c.balance,
    defaultDiscount: c.discount ?? 0,
    isActive: c.active ?? true,
  })));
  write(MOCK_STORAGE.rentals, (given.rentals ?? []).map((r): MockRental => ({
    rentalItemId: r.id,
    bulkOrderId: r.orderId ?? null,
    machineId: r.machineId ?? 101,
    machineName: r.machineName ?? 'Excavator X3000',
    companyName: r.client,
    plateNumber: r.plate,
    startDate: `${r.start}T00:00:00`,
    endDate: `${r.end}T00:00:00`,
    dailyRate: 450,
    discount: 0,
    totalAmount: r.total,
    status: r.status ?? 'Active',
    taxType: 'VAT',
    taxPercent: 0,
  })));
  write(MOCK_STORAGE.orders, (given.orders ?? []).map((o): MockOrder => ({
    orderId: o.id,
    companyId: o.clientId,
    orderDate: '2030-01-01T00:00:00',
    totalAmount: o.total,
    orderStatus: o.status ?? 'Processed',
  })));
  write(MOCK_STORAGE.receipts, (given.receipts ?? []).map((p): MockReceipt => ({
    receiptId: `REC-${p.id}`,
    companyId: p.clientId,
    companyName: clientName(p.clientId),
    amount: p.amount,
    paymentDate: new Date(p.paidAt).toISOString(),
  })));
}

/** Partial match: listed object properties only, arrays element by element, numbers by value. */
function match(expected: unknown, actual: unknown, path: string, failures: string[]): void {
  const show = (value: unknown) => (value === undefined ? 'nothing' : JSON.stringify(value));

  if (expected !== null && typeof expected === 'object' && !Array.isArray(expected)) {
    const pattern = expected as Record<string, unknown>;
    if (Object.keys(pattern).length === 1 && typeof pattern['$matches'] === 'string') {
      const text = typeof actual === 'string' || typeof actual === 'number' ? String(actual) : null;
      if (text === null || !new RegExp(pattern['$matches']).test(text)) {
        failures.push(`${path}: expected to match /${pattern['$matches']}/, got ${show(actual)}`);
      }
      return;
    }
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
      failures.push(`${path}: expected an object, got ${show(actual)}`);
      return;
    }
    for (const [key, value] of Object.entries(pattern)) {
      if (!(key in (actual as object))) failures.push(`${path}.${key}: missing`);
      else match(value, (actual as Record<string, unknown>)[key], `${path}.${key}`, failures);
    }
    return;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      failures.push(`${path}: expected ${expected.length} items, got ${show(actual)}`);
      return;
    }
    expected.forEach((item, i) => match(item, actual[i], `${path}[${i}]`, failures));
    return;
  }

  if (actual !== expected) failures.push(`${path}: expected ${show(expected)}, got ${show(actual)}`);
}

function checkStorage(expect: ContractCase['expect'], failures: string[]): void {
  const companies = read(MOCK_STORAGE.companies);
  for (const [name, amount] of Object.entries(expect.balances ?? {})) {
    const company = companies.find(c => c.companyName === name);
    if (!company) failures.push(`balances: no client named ${name}`);
    else if (company.outstandingBalance !== amount) failures.push(`balances: ${name} expected ${amount}, got ${company.outstandingBalance}`);
  }

  const rentals = read(MOCK_STORAGE.rentals);
  for (const [plate, wanted] of Object.entries(expect.rentalStatuses ?? {})) {
    const actual = rentals.filter(r => r.plateNumber === plate).map(r => r.status);
    const expected = Array.isArray(wanted) ? wanted : [wanted];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`rentalStatuses: ${plate} expected [${expected.join(', ')}], got [${actual.join(', ')}]`);
    }
  }

  if (expect.rentalCount !== undefined && rentals.length !== expect.rentalCount) {
    failures.push(`rentalCount: expected ${expect.rentalCount}, got ${rentals.length}`);
  }
  const receipts = read(MOCK_STORAGE.receipts);
  if (expect.receiptCount !== undefined && receipts.length !== expect.receiptCount) {
    failures.push(`receiptCount: expected ${expect.receiptCount}, got ${receipts.length}`);
  }
}

describe('demo mock API matches the contract cases', () => {
  beforeEach(() => localStorage.clear());
  afterAll(() => localStorage.clear());

  it('loads the shared cases', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const testCase of cases) {
    it(testCase.name, () => {
      seed(testCase.given);
      const { method, path, body } = testCase.request;
      const response = handleMockRequest(method, API + path, body === undefined ? null : structuredClone(body));

      const expect_ = testCase.expect;
      const failures: string[] = [];
      if (response.status !== expect_.status) {
        failures.push(`status: expected ${expect_.status}, got ${response.status} ${JSON.stringify(response.body)}`);
      }
      if (expect_.body !== undefined) match(expect_.body, response.body, 'body', failures);

      const message = (response.body as { message?: unknown } | null)?.message;
      const text = typeof message === 'string' ? message : undefined;
      if (expect_.message !== undefined && text !== expect_.message) {
        failures.push(`message: expected "${expect_.message}", got "${text}"`);
      }
      if (expect_.messageStartsWith !== undefined && !(text ?? '').startsWith(expect_.messageStartsWith)) {
        failures.push(`message: expected to start with "${expect_.messageStartsWith}", got "${text}"`);
      }

      checkStorage(expect_, failures);

      if (expect_.rentalsAfter !== undefined) {
        match(expect_.rentalsAfter, handleMockRequest('GET', `${API}/api/orders/rentals`, null).body, 'rentalsAfter', failures);
      }

      // Joined into one string so a failure prints every mismatch in full
      expect(failures.join('\n'), `Contract case "${testCase.name}" failed against the demo mock`).toBe('');
    });
  }
});
