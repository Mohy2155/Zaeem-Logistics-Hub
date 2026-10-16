import { expect, Locator, Page } from '@playwright/test';

/** Plates no earlier run or seed data can have: E2E-<base36 timestamp>-<n>. */
const runId = Date.now().toString(36).toUpperCase();
let plateCount = 0;
export const newPlate = (): string => `E2E-${runId}-${++plateCount}`;

/** 'yyyy-MM-dd' for today plus `offset` days, in local time (what <input type="date"> takes). */
export function dayFromToday(offset: number): string {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/** "$12,500.00" → 12500. */
export const parseMoney = (text: string): number => Number(text.replace(/[^0-9.-]/g, ''));

/** The client's balance due as the Client Ledger shows it (negative for a credit). */
export async function ledgerBalance(page: Page, client: string): Promise<number> {
  await page.goto('admin');
  const row = page.getByRole('row').filter({ has: page.getByText(client, { exact: true }) });
  const cell = row.locator('td[data-label="Balance due"]');
  await expect(cell).toBeVisible();
  const amount = parseMoney(await cell.locator('.num').innerText());
  return (await cell.getByText('Credit', { exact: true }).count()) ? -amount : amount;
}

export interface OrderLine {
  client: string;
  machine: string;
  start: string;
  end: string;
  plate: string;
}

/** Fills the New Rental Order form for one line (does not add it). */
export async function fillOrderLine(page: Page, line: OrderLine): Promise<void> {
  const client = page.getByLabel('Bill to');
  // Once the cart has items the client is shown read-only.
  if (await client.evaluate(el => el.tagName === 'SELECT')) await client.selectOption({ label: line.client });
  const machine = page.getByLabel('Machine type');
  const option = machine.locator('option', { hasText: line.machine });
  await machine.selectOption({ label: (await option.innerText()).trim() });
  await page.getByLabel('Start date').fill(line.start);
  await page.getByLabel('End date').fill(line.end);
  await page.getByLabel('Plate number').fill(line.plate);
}

/** Places a one-line order and returns the total shown on the confirmation. */
export async function placeOrder(page: Page, line: OrderLine): Promise<number> {
  await page.goto('portal');
  await fillOrderLine(page, line);
  await page.getByRole('button', { name: 'Add to order' }).click();
  await page.getByRole('button', { name: 'Place order' }).click();
  const dialog = page.getByRole('dialog', { name: 'Order placed' });
  await expect(dialog).toBeVisible();
  const total = parseMoney(await dialog.locator('.facts .total').innerText());
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
  return total;
}

/** Presses Tab until `target` has focus, so a flow can be driven from the keyboard alone. */
export async function tabTo(page: Page, target: Locator, maxPresses = 40): Promise<void> {
  for (let i = 0; i < maxPresses; i++) {
    if (await target.evaluate(el => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target, `Tab never reached the element within ${maxPresses} presses`).toBeFocused();
}
