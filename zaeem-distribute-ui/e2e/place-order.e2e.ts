import { expect, test } from '@playwright/test';
import { dayFromToday, fillOrderLine, ledgerBalance, newPlate, parseMoney, placeOrder } from './helpers';

const CLIENT = 'Mega Structures';
const MACHINE = 'Excavator X3000';

test('placing an order bills the client and books the machine on the schedule', async ({ page }) => {
  const balanceBefore = await ledgerBalance(page, CLIENT);
  const plate = newPlate();

  await page.goto('portal');
  await fillOrderLine(page, { client: CLIENT, machine: MACHINE, start: dayFromToday(3), end: dayFromToday(5), plate });

  // Expected bill: two days at the machine's daily rate, less the client's discount, plus tax, to the cent.
  const dailyRate = parseMoney((await page.getByLabel('Machine type').locator('option:checked').innerText()).split('·')[1]);
  const discount = Number(await page.getByLabel('Trade discount').inputValue());
  const tax = Number(await page.getByLabel('Tax', { exact: true }).inputValue());
  const expected = Math.round(dailyRate * 2 * (1 - discount / 100) * (1 + tax / 100) * 100) / 100;
  expect(expected).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Add to order' }).click();
  await expect(page.getByRole('table', { name: 'Order items' })).toContainText(plate);
  await page.getByRole('button', { name: 'Place order' }).click();

  const confirmation = page.getByRole('dialog', { name: 'Order placed' });
  await expect(confirmation).toContainText(CLIENT);
  expect(parseMoney(await confirmation.locator('.facts .total').innerText())).toBe(expected);
  await confirmation.getByRole('button', { name: 'Close', exact: true }).click();

  await page.goto('scheduler');
  await expect(page.getByRole('button', { name: new RegExp(`^${CLIENT} ${plate}, ${MACHINE}`) })).toBeVisible();

  expect(await ledgerBalance(page, CLIENT)).toBeCloseTo(balanceBefore + expected, 2);
});

test('a plate cannot be booked on days it is already out', async ({ page }) => {
  const plate = newPlate();
  await placeOrder(page, { client: CLIENT, machine: MACHINE, start: dayFromToday(3), end: dayFromToday(5), plate });
  const balanceBefore = await ledgerBalance(page, CLIENT);

  await page.goto('portal');
  // Starts on the existing booking's return day, with the plate typed the way people do.
  await fillOrderLine(page, { client: CLIENT, machine: MACHINE, start: dayFromToday(5), end: dayFromToday(7), plate: ` ${plate.toLowerCase()} ` });

  await expect(page.getByText(`${plate} is already booked from`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to order' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Place order' })).toHaveCount(0);

  expect(await ledgerBalance(page, CLIENT)).toBeCloseTo(balanceBefore, 2);
});
