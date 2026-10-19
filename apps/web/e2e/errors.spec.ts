import { expect, test } from '@playwright/test';
import { signUpAndOnboard, watchErrors } from './helpers';

test('a page that does not exist says so and offers a way back', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page does not exist');
  await expect(page.getByRole('link', { name: 'Go to Invoica' })).toBeVisible();
});

test('an invoice that does not exist, or belongs to another business, is not found inside the app', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await signUpAndOnboard(page, 'Lantern Row', { vat: false });
  await page.goto('/invoices/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nothing here');
  // Inside the app: its header stays, so the way around the app is still there.
  await expect(page.getByRole('link', { name: 'Invoica dashboard' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to invoices' }).click();
  await page.waitForURL(/\/invoices$/);
  expect(errors.filter((e) => !/404/.test(e))).toEqual([]);
});
