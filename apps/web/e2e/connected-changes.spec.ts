import { expect, test } from '@playwright/test';
import { PASSWORD, addClient, signUpAndOnboard } from './helpers';

/**
 * Things that change around the work in hand: being signed out while typing, and records edited after an invoice
 * was issued. What was typed is kept, and what was issued stays as it was.
 */

test.skip(({ isMobile }) => isMobile, 'The same at every width.');

test('signed out while typing an invoice: the page says so and keeps the invoice, and it saves after signing in again', async ({
  page,
}) => {
  const email = await signUpAndOnboard(page, 'Signed Out Studio', { vat: true });
  await addClient(page, 'Bramble Lane Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Bramble Lane Ltd' });
  await page.fill('#e-title', 'Autumn catalogue');
  await page.getByLabel('Line 1 description').fill('Styling');
  await page.getByLabel('Line 1 price').fill('640');

  // Signed out elsewhere: the session cookie is gone.
  await page.context().clearCookies();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText(/You have been signed out, so this was not saved/)).toBeVisible();
  await expect(page).toHaveURL(/\/invoices\/new$/);
  await expect(page.locator('#e-title')).toHaveValue('Autumn catalogue');

  // Signing in again in another tab, then saving here.
  const other = await page.context().newPage();
  await other.goto('/sign-in');
  await other.fill('#email', email);
  await other.fill('#password', PASSWORD);
  await other.getByRole('button', { name: 'Sign in' }).click();
  await other.waitForURL('**/dashboard');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await page.goto('/invoices');
  await expect(page.getByText('Autumn catalogue')).toHaveCount(1);
});

test('a tax code archived while a draft uses it: the draft still shows it and issues with it', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Archived Rate Studio', { vat: true });
  await addClient(page, 'Paper Mill Books Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Paper Mill Books Ltd' });
  await page.getByLabel('Line 1 description').fill('Printed guides');
  await page.getByLabel('Line 1 price').fill('100');
  await page.getByLabel('Line 1 tax').selectOption({ label: 'Reduced rate' });
  await expect(page.getByText('£105.00').first()).toBeVisible();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit$/);
  const draft = page.url();

  await page.goto('/settings');
  await page.locator('li', { hasText: 'Reduced rate' }).getByRole('button', { name: 'Archive' }).click();
  await expect(page.locator('li', { hasText: 'Reduced rate' })).toHaveCount(0);

  await page.goto(draft);
  await expect(page.getByLabel('Line 1 tax').locator('option:checked')).toHaveText('Reduced rate (archived)');
  await expect(page.getByText('£105.00').first()).toBeVisible();
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  await expect(page.getByText('£105.00').first()).toBeVisible();
  // A new line cannot pick it.
  await page.goto('/invoices/new');
  await expect(page.getByLabel('Line 1 tax').getByRole('option', { name: /Reduced rate/ })).toHaveCount(0);
});

test('a client and the business changed after issuing: the issued invoice stays as it was, the next one is new', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Before Rename Studio', { vat: true });
  await addClient(page, 'Old Name Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Old Name Ltd' });
  await page.getByLabel('Line 1 description').fill('Survey');
  await page.getByLabel('Line 1 price').fill('300');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  const first = page.url().replace('?issued=1', '');

  // Rename the client and the business.
  await page.getByRole('link', { name: 'Old Name Ltd' }).first().click();
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.fill('#c-name', 'New Name Holdings Ltd');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('New Name Holdings Ltd');
  await page.goto('/settings');
  await page.fill('#s-name', 'After Rename Studio');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText(/Settings saved\./)).toBeVisible();

  // The issued invoice and its PDF keep the names it was issued with.
  await page.goto(first);
  const kept = page.frameLocator('iframe').first();
  await expect(kept.getByText('Old Name Ltd').first()).toBeVisible();
  await expect(kept.getByText('Before Rename Studio').first()).toBeVisible();
  const pdf = await page.request.get(`${first}/pdf`);
  expect(pdf.status()).toBe(200);

  // The next invoice uses the new names and the next number.
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'New Name Holdings Ltd' });
  await page.getByLabel('Line 1 description').fill('Second survey');
  await page.getByLabel('Line 1 price').fill('200');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('INV-0002');
  const fresh = page.frameLocator('iframe').first();
  await expect(fresh.getByText('New Name Holdings Ltd').first()).toBeVisible();
  await expect(fresh.getByText('After Rename Studio').first()).toBeVisible();
});
