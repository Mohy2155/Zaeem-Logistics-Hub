import { Booking, findBookingConflict, normalizePlate, toIsoDay, toLocalDay } from './rental-dates';

/**
 * The GitHub Pages demo's stand-in for the .NET API: the same endpoints, rules and messages, backed by localStorage.
 * The real API is the source of truth. contracts/api-cases.json runs against both, and lists the intentional differences.
 */

/** What the demo API answers: an HTTP status and a JSON body (errors carry `{ message }`). */
export interface MockResponse {
  status: number;
  body: unknown;
}

/** localStorage keys holding the demo's data. */
export const MOCK_STORAGE = {
  companies: 'zaeem_companies',
  rentals: 'zaeem_rentals',
  orders: 'zaeem_orders',
  receipts: 'zaeem_receipts',
  receiptSeq: 'zaeem_receipt_seq',
} as const;

export interface MockCompany {
  companyId: number;
  companyName: string;
  outstandingBalance: number;
  defaultDiscount: number;
  /** Inactive clients are left out of the client list, as in the API. Missing means active. */
  isActive?: boolean;
  /** Demo seed only: billing from before the sample rentals, so the ledger shows a believable history. */
  billedBeforeDemo?: number;
}

export interface MockRental {
  rentalItemId: number;
  bulkOrderId: number | null;
  machineId: number;
  machineName: string;
  companyName: string;
  plateNumber: string;
  /** Local midnight without a zone, as the API returns it: 'yyyy-MM-ddT00:00:00'. */
  startDate: string;
  endDate: string;
  dailyRate: number;
  discount: number;
  totalAmount: number;
  status: string;
  taxType: string;
  taxPercent: number;
}

export interface MockOrder {
  orderId: number;
  companyId: number;
  orderDate: string;
  totalAmount: number;
  orderStatus: string;
}

export interface MockReceipt {
  receiptId: string;
  companyId: number;
  companyName: string;
  amount: number;
  paymentDate: string;
}

const ok = (body: unknown): MockResponse => ({ status: 200, body });
const fail = (status: number, message: string): MockResponse => ({ status, body: { message } });

/** True for requests the demo answers in the browser instead of sending to the .NET API. */
export const isMockApiUrl = (url: string): boolean => url.includes('localhost:5234') || url.includes('/api/');

/** Money is stored to the cent, like the API's decimal(18,2) columns. Halves round up (the API rounds them to even). */
const cents = (amount: number): number => Math.round(amount * 100) / 100;

/** A calendar day as the API serialises a date-only DateTime. */
const midnight = (day: Date): string => `${toIsoDay(day)}T00:00:00`;

const daysFromToday = (offset: number): Date => {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  return day;
};

/** A rental date the API would accept, as a local calendar day; null when it can't be read. */
function parseDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  const day = toLocalDay(text);
  if (Number.isNaN(day.getTime())) return null;
  // new Date(2030, 12, 45) rolls over to a later month; the API refuses impossible dates.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text) && toIsoDay(day) !== text) return null;
  return day;
}

/**
 * Safe JSON parser to prevent unhandled interceptor crashes.
 */
function read<T>(key: string): T[] {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch {
    console.warn(`[SafeParse] Corrupted payload detected for key: ${key}. Purging cache.`);
    localStorage.removeItem(key);
    return [];
  }
}

const write = (key: string, rows: unknown[]): void => localStorage.setItem(key, JSON.stringify(rows));

/** Persistent sequential id, so mock ids never collide the way random ones did. */
const nextId = (key: string, start: number): number => {
  const id = Number(localStorage.getItem(key)) || start;
  localStorage.setItem(key, (id + 1).toString());
  return id;
};

/** Seeds the demo's sample data on first use, mirroring the API's startup seed. */
function initLocalStorage(): void {
  if (!localStorage.getItem(MOCK_STORAGE.companies)) {
    const companies: MockCompany[] = [
      { companyId: 1, companyName: 'Build-It Corp', outstandingBalance: 12500, defaultDiscount: 10, isActive: true, billedBeforeDemo: 42165 },
      { companyId: 2, companyName: 'Swift Logistics', outstandingBalance: 85000, defaultDiscount: 15, isActive: true, billedBeforeDemo: 118096 },
      { companyId: 3, companyName: 'Mega Structures', outstandingBalance: 0, defaultDiscount: 5, isActive: true, billedBeforeDemo: 25000 }
    ];
    write(MOCK_STORAGE.companies, companies);
  }

  if (!localStorage.getItem(MOCK_STORAGE.rentals)) {
    const rentals: MockRental[] = [
      { rentalItemId: 101, bulkOrderId: null, machineId: 101, machineName: 'Excavator X3000', companyName: 'Build-It Corp', plateNumber: 'DX-7728', startDate: midnight(daysFromToday(-2)), endDate: midnight(daysFromToday(5)), dailyRate: 450, discount: 10, totalAmount: 2835, status: 'Active', taxType: '', taxPercent: 0 },
      { rentalItemId: 102, bulkOrderId: null, machineId: 102, machineName: 'Caterpillar Loader', companyName: 'Swift Logistics', plateNumber: 'PL-4491', startDate: midnight(daysFromToday(-1)), endDate: midnight(daysFromToday(6)), dailyRate: 320, discount: 15, totalAmount: 1904, status: 'Active', taxType: '', taxPercent: 0 }
    ];
    write(MOCK_STORAGE.rentals, rentals);
  }

  if (!localStorage.getItem(MOCK_STORAGE.receipts)) {
    const receipts: MockReceipt[] = [
      { receiptId: 'REC-1001', companyId: 1, companyName: 'Build-It Corp', amount: 5000, paymentDate: new Date(Date.now() - 24*60*60*1000).toISOString() },
      { receiptId: 'REC-1002', companyId: 2, companyName: 'Swift Logistics', amount: 15000, paymentDate: new Date(Date.now() - 12*24*60*60*1000).toISOString() }
    ];
    write(MOCK_STORAGE.receipts, receipts);
  }
}

/**
 * Answers one demo API request from localStorage, the way the .NET API answers it from SQL Server.
 * Pure request/response so the contract tests (contracts/api-cases.json) can call it directly.
 */
export function handleMockRequest(method: string, url: string, requestBody: unknown): MockResponse {
  initLocalStorage();

  const path = new URL(url, 'http://localhost').pathname.toLowerCase().replace(/\/+$/, '');
  const route = `${method.toUpperCase()} ${path}`;
  const payload = (requestBody ?? {}) as Record<string, any>;
  let id: RegExpExecArray | null;

  if (route === 'GET /api/companies') return listCompanies();
  if (route === 'GET /api/orders/rentals') return ok(read<MockRental>(MOCK_STORAGE.rentals));
  if (route === 'POST /api/orders/place-bulk-order') return placeOrder(payload);
  if (route === 'POST /api/payments/record') return recordPayment(payload);
  if (route === 'GET /api/payments/receipts') return listReceipts();
  if ((id = /^DELETE \/api\/orders\/rentals\/(\d+)$/.exec(route))) return cancelRental(Number(id[1]));
  if ((id = /^POST \/api\/orders\/cancel\/(\d+)$/.exec(route))) return cancelOrder(Number(id[1]));

  return fail(404, `The demo has no endpoint for ${method.toUpperCase()} ${path}.`);
}

/** CompaniesController.GetCompanies: active clients, lifetime billed computed from non-cancelled rentals. */
function listCompanies(): MockResponse {
  const rentals = read<MockRental>(MOCK_STORAGE.rentals);
  const billed = (company: MockCompany) => cents(rentals
    .filter(r => r.companyName === company.companyName && r.status !== 'Cancelled')
    .reduce((sum, r) => sum + r.totalAmount, company.billedBeforeDemo ?? 0));

  return ok(read<MockCompany>(MOCK_STORAGE.companies)
    .filter(c => c.isActive !== false)
    .map(c => ({
      companyId: c.companyId,
      companyName: c.companyName,
      outstandingBalance: c.outstandingBalance,
      defaultDiscount: c.defaultDiscount,
      totalBilledToDate: billed(c)
    })));
}

/** OrdersController.PlaceBulkOrder: every line checked first, then the client, then double-booking, then billing. */
function placeOrder(payload: Record<string, any>): MockResponse {
  const items: any[] = Array.isArray(payload['items']) ? payload['items'] : [];
  if (items.length === 0) return fail(400, 'Order must contain at least one item.');

  const lines = [];
  for (const item of items) {
    const plate = normalizePlate(item.plateNumber);
    if (!plate) return fail(400, `Plate number is required for ${item.machineName}.`);
    const start = parseDay(item.startDate);
    const end = parseDay(item.endDate);
    if (!start || !end) return fail(400, `Invalid rental dates for plate ${plate}.`);
    if (end <= start) return fail(400, `End date must be after start date for plate ${plate}.`);
    const lineTotal = Number(item.lineTotal ?? 0);
    const discount = Number(item.discount ?? 0);
    const taxPercent = Number(item.taxPercent ?? 0);
    if (!(lineTotal >= 0) || !(discount >= 0) || discount > 100 || !(taxPercent >= 0)) {
      return fail(400, `Invalid pricing for plate ${plate}.`);
    }
    lines.push({ item, plate, start, end, lineTotal: cents(lineTotal), discount, taxPercent });
  }

  const companies = read<MockCompany>(MOCK_STORAGE.companies);
  const company = companies.find(c => c.companyId === Number(payload['companyId']));
  if (!company) return fail(404, 'Company not found.');

  // End dates are inclusive: the machine is unavailable on its return day
  const rentals = read<MockRental>(MOCK_STORAGE.rentals);
  const booked: Booking[] = [...rentals];
  for (const line of lines) {
    const candidate: Booking = { plateNumber: line.plate, startDate: toIsoDay(line.start), endDate: toIsoDay(line.end) };
    if (findBookingConflict(candidate, booked)) {
      return fail(409, `Scheduling conflict: plate ${line.plate} is already booked during ${candidate.startDate} to ${candidate.endDate}.`);
    }
    booked.push(candidate);
  }

  const orderTotal = cents(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  company.outstandingBalance = cents(company.outstandingBalance + orderTotal);
  write(MOCK_STORAGE.companies, companies);

  const orders = read<MockOrder>(MOCK_STORAGE.orders);
  // Past order ids include ones only recorded on rentals, so a new order never adopts an old order's rentals.
  const orderId = 1 + Math.max(0, ...orders.map(o => o.orderId), ...rentals.map(r => r.bulkOrderId ?? 0));
  orders.push({ orderId, companyId: company.companyId, orderDate: new Date().toISOString(), totalAmount: orderTotal, orderStatus: 'Processed' });
  write(MOCK_STORAGE.orders, orders);

  let rentalId = Math.max(1000, ...rentals.map(r => Number(r.rentalItemId) || 0));
  const added: MockRental[] = lines.map(line => ({
    rentalItemId: ++rentalId,
    bulkOrderId: orderId,
    machineId: line.item.machineId,
    machineName: line.item.machineName,
    companyName: company.companyName,
    plateNumber: line.plate,
    startDate: midnight(line.start),
    endDate: midnight(line.end),
    dailyRate: Number(line.item.dailyRate ?? 0),
    discount: line.discount,
    totalAmount: line.lineTotal,
    status: 'Active',
    taxType: line.item.taxType ?? '',
    taxPercent: line.taxPercent
  }));
  write(MOCK_STORAGE.rentals, [...rentals, ...added]);

  return ok({ orderId, result: 'SUCCESS', amountBilled: orderTotal, outstandingBalance: company.outstandingBalance });
}

/** CompaniesController.RecordPayment: amount first, then the client, then the balance limit. */
function recordPayment(payload: Record<string, any>): MockResponse {
  const amount = Number(payload['amount']);
  if (!(amount > 0)) return fail(400, 'Payment amount must be greater than zero.');

  const companies = read<MockCompany>(MOCK_STORAGE.companies);
  const company = companies.find(c => c.companyId === Number(payload['companyId']));
  if (!company) return fail(404, 'Company not found.');
  if (amount > company.outstandingBalance) {
    return fail(400, `Payment exceeds the outstanding balance of ${company.outstandingBalance.toFixed(2)}.`);
  }

  company.outstandingBalance = cents(company.outstandingBalance - amount);
  write(MOCK_STORAGE.companies, companies);

  const receipt: MockReceipt = {
    receiptId: 'REC-' + nextId(MOCK_STORAGE.receiptSeq, 1003),
    companyId: company.companyId,
    companyName: company.companyName,
    amount,
    paymentDate: new Date().toISOString()
  };
  write(MOCK_STORAGE.receipts, [receipt, ...read<MockReceipt>(MOCK_STORAGE.receipts)]);
  return ok({ result: 'SUCCESS', receiptId: receipt.receiptId });
}

/** CompaniesController.GetReceipts: newest first. */
function listReceipts(): MockResponse {
  const receipts = read<MockReceipt>(MOCK_STORAGE.receipts);
  return ok([...receipts].sort((a, b) => Date.parse(b.paymentDate) - Date.parse(a.paymentDate)));
}

/** OrdersController.DeleteRentalItem: soft-cancels and reverses the charge once; a negative balance is a credit. */
function cancelRental(rentalId: number): MockResponse {
  const rentals = read<MockRental>(MOCK_STORAGE.rentals);
  const rental = rentals.find(r => r.rentalItemId === rentalId);
  if (!rental) return fail(404, 'Rental item not found');
  if (rental.status === 'Cancelled') return fail(400, 'Rental item is already cancelled');

  const companies = read<MockCompany>(MOCK_STORAGE.companies);
  const company = companies.find(c => c.companyName === rental.companyName);
  if (company) company.outstandingBalance = cents(company.outstandingBalance - rental.totalAmount);
  rental.status = 'Cancelled';
  write(MOCK_STORAGE.companies, companies);
  write(MOCK_STORAGE.rentals, rentals);

  return ok({ message: 'Rental item cancelled successfully', outstandingBalance: company?.outstandingBalance ?? null });
}

/** OrdersController.CancelOrder: cancels the order's rentals, reversing only what wasn't reversed already. */
function cancelOrder(orderId: number): MockResponse {
  const orders = read<MockOrder>(MOCK_STORAGE.orders);
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return fail(404, 'Order not found');
  if (order.orderStatus === 'Cancelled') return fail(400, 'Order is already cancelled');

  const rentals = read<MockRental>(MOCK_STORAGE.rentals);
  const own = rentals.filter(r => r.bulkOrderId === order.orderId);
  const alreadyReversed = own.filter(r => r.status === 'Cancelled').reduce((sum, r) => sum + r.totalAmount, 0);
  own.forEach(r => (r.status = 'Cancelled'));

  const companies = read<MockCompany>(MOCK_STORAGE.companies);
  const company = companies.find(c => c.companyId === order.companyId);
  if (company) company.outstandingBalance = cents(company.outstandingBalance - (order.totalAmount - alreadyReversed));
  order.orderStatus = 'Cancelled';
  write(MOCK_STORAGE.companies, companies);
  write(MOCK_STORAGE.rentals, rentals);
  write(MOCK_STORAGE.orders, orders);

  return ok({ message: 'Order cancelled successfully', outstandingBalance: company?.outstandingBalance ?? null });
}
