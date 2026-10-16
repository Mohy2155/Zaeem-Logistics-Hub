import { expect, test } from '@playwright/test';

test('the dashboard opens with its figures', async ({ page }) => {
  await page.goto('dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await expect(page.getByText(/receivable/i).first()).toBeVisible();
});
