import { expect, test } from '@playwright/test';
import { ledgerBalance, tabTo } from './helpers';

const CLIENT = 'Build-It Corp';

test('a payment can be recorded with the keyboard alone and is receipted first', async ({ page }) => {
  const balanceBefore = await ledgerBalance(page, CLIENT);
  expect(balanceBefore, `${CLIENT} needs a balance of at least $100 to pay`).toBeGreaterThanOrEqual(100);

  await page.goto('payments');
  const clientSelect = page.getByRole('combobox', { name: 'Client', exact: true });
  await expect(clientSelect).toBeEnabled();

  // From the first focusable element: the skip link jumps past the navigation to the page content.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');

  await tabTo(page, clientSelect);
  await page.keyboard.type(CLIENT); // a closed <select> picks the option that starts with the typed text
  await expect(clientSelect.locator('option:checked')).toContainText(CLIENT);

  const amount = page.getByLabel('Amount received');
  await tabTo(page, amount);
  await page.keyboard.type('100');
  await tabTo(page, page.getByRole('button', { name: 'Record payment' }));
  await page.keyboard.press('Enter');

  const confirm = page.getByRole('alertdialog', { name: 'Record this payment?' });
  await expect(confirm).toContainText(CLIENT);
  await expect(confirm).toContainText('$100.00');
  // Focus starts on Close so Enter can't confirm by accident; tab to the confirm button.
  await tabTo(page, confirm.getByRole('button', { name: 'Record payment' }));
  await page.keyboard.press('Enter');

  const receipt = page.getByRole('status').filter({ hasText: 'Download the receipt' });
  await expect(receipt).toBeFocused();
  await expect(receipt).toContainText(CLIENT);
  await expect(receipt).toContainText('$100.00');
  const receiptId = (await receipt.locator('dt:has-text("Receipt") + dd').innerText()).trim();
  expect(receiptId).toMatch(/^REC-\d+$/);

  const history = page.getByRole('table', { name: 'Payment receipts' });
  await expect(history.locator('tbody tr').first().locator('td[data-label="Receipt"]')).toHaveText(receiptId);

  expect(await ledgerBalance(page, CLIENT)).toBeCloseTo(balanceBefore - 100, 2);
});

test('a payment larger than the balance due cannot be submitted', async ({ page }) => {
  const balance = await ledgerBalance(page, CLIENT);

  await page.goto('payments');
  const clientSelect = page.getByRole('combobox', { name: 'Client', exact: true });
  const option = clientSelect.locator('option', { hasText: CLIENT });
  await clientSelect.selectOption({ label: (await option.innerText()).trim() });
  const tooMuch = (balance + 0.01).toFixed(2);
  await page.getByLabel('Amount received').fill(tooMuch);
  await page.getByLabel('Amount received').blur();

  const shown = balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  await expect(page.getByText(`This is more than the ${shown} balance due.`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record payment' })).toBeDisabled();

  expect(await ledgerBalance(page, CLIENT)).toBeCloseTo(balance, 2);
});
