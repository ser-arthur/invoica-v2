import { expect, test, type Browser, type Page } from '@playwright/test';
import { addClient, PASSWORD, signIn, signUpAndOnboard, watchErrors } from './helpers';
import { linkIn, waitForEmail } from './mailbox';

/**
 * How the app is really used: work left and picked up later, two tabs open on the same invoice, double clicks,
 * the back button, and a password changed on another device. Every case ends with the figures as they should be.
 */

test.skip(({ isMobile }) => isMobile, 'Run at desktop width; the phone checks are in their own test below.');

/** £100.00 plus VAT at 20%, issued; returns the invoice's address. */
async function issueInvoice(page: Page, clientName: string) {
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: clientName });
  await page.getByLabel('Line 1 description').fill('Consulting');
  await page.getByLabel('Line 1 price').fill('100');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  return page.url().replace('?issued=1', '');
}

/** A second tab in the same signed-in browser. */
async function secondTab(page: Page, url: string) {
  const other = await page.context().newPage();
  await other.goto(url);
  return other;
}

test('a draft is still there after a reload and signing in again, and two tabs cannot issue it twice', async ({
  page,
}) => {
  const errors = watchErrors(page);
  const email = await signUpAndOnboard(page, 'Persist Studio', { vat: true });
  await addClient(page, 'Kettle Yard Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Kettle Yard Ltd' });
  await page.fill('#e-title', 'Spring catalogue');
  await page.getByLabel('Line 1 description').fill('Photography');
  await page.getByLabel('Line 1 qty').fill('2.5');
  await page.getByLabel('Line 1 price').fill('480');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit$/);
  const editUrl = page.url();

  await page.reload();
  await expect(page.locator('#e-title')).toHaveValue('Spring catalogue');
  await expect(page.getByLabel('Line 1 qty')).toHaveValue('2.5');
  await expect(page.getByLabel('Line 1 amount')).toHaveText('£1,200.00');

  await page.context().clearCookies();
  await signIn(page, email);
  await page.goto(editUrl);
  await expect(page.getByLabel('Line 1 description')).toHaveValue('Photography');

  const other = await secondTab(page, editUrl);
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  await other.getByRole('button', { name: 'Issue invoice' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await expect(other.getByRole('alert')).toBeVisible();
  await other.reload();
  // The editor of an issued invoice opens the invoice itself.
  await expect(other).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/);
  await expect(other.getByRole('heading', { level: 1 })).toContainText('INV-0001');
  await page.goto('/invoices');
  await expect(page.getByText('INV-0002')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a tab showing an old balance cannot record too much, and a double click records once', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await signUpAndOnboard(page, 'Stale Tab Studio', { vat: true });
  await addClient(page, 'Mill Lane Ltd');
  const url = await issueInvoice(page, 'Mill Lane Ltd');
  const other = await secondTab(page, url);

  await page.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.locator('#pay-amount')).toHaveValue('120.00');
  // Two clicks in quick succession on the dialog's button.
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).dblclick();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Paid');

  // The other tab still says £120.00 is owed.
  await other.getByRole('button', { name: 'Record payment' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(
    other.getByRole('dialog').getByText('The payment is more than the balance due.'),
  ).toBeVisible();
  await other.reload();
  await expect(other.getByRole('heading', { level: 1 })).toContainText('Paid');
  // One payment of £120.00, not two.
  await expect(other.getByText('£120.00, ')).toHaveCount(0);
  const payments = other
    .locator('section', { has: other.getByRole('heading', { name: 'Payments' }) })
    .locator('li');
  await expect(payments).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('a credit note from a tab opened before the invoice was paid asks for the refund', async ({ page }) => {
  const errors = watchErrors(page);
  await signUpAndOnboard(page, 'Refund Tab Studio', { vat: true });
  await addClient(page, 'Ferry Road Ltd');
  const url = await issueInvoice(page, 'Ferry Road Ltd');
  const other = await secondTab(page, url);
  await other.getByRole('button', { name: 'Credit note' }).click();
  await other.locator('#cn-mode').selectOption('whole');
  await other.fill('#cn-reason', 'Order cancelled.');
  await expect(other.getByRole('dialog').getByText(/Refund of/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Paid');

  await other.getByRole('dialog').getByRole('button', { name: 'Issue credit note' }).click();
  await expect(
    other.getByRole('dialog').getByText(/unless you record the refund of the difference/),
  ).toBeVisible();
  await other.reload();
  await other.getByRole('button', { name: 'Credit note' }).click();
  await other.locator('#cn-mode').selectOption('whole');
  await expect(other.getByRole('dialog').getByText('Refund of £120.00')).toBeVisible();
  await other.fill('#cn-reason', 'Order cancelled.');
  await other
    .getByRole('dialog')
    .getByRole('button', { name: 'Issue credit note and record refund' })
    .click();
  await expect(other.getByRole('heading', { level: 1 })).toContainText('CN-0001');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Credited');
  expect(errors).toEqual([]);
});

test('going back after issuing opens the invoice, not an editor for it', async ({ page }) => {
  await signUpAndOnboard(page, 'Back Button Studio', { vat: true });
  await addClient(page, 'Granary Ltd');
  const url = await issueInvoice(page, 'Granary Ltd');
  await page.goBack();
  await expect(page).toHaveURL(/\/invoices\/(new|[0-9a-f-]{36})/);
  await page.reload();
  // The new-invoice page starts a fresh draft; it never reopens the issued one for editing.
  await expect(page.locator('#e-title')).toHaveValue('');
  await page.goto(`${url}/edit`);
  await expect(page).toHaveURL(url);
});

async function signedInElsewhere(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  return page;
}

test('changing the password on one device signs the others out', async ({ page, browser }) => {
  const email = await signUpAndOnboard(page, 'Two Devices Studio');
  const laptop = await signedInElsewhere(browser, email);
  await laptop.goto('/dashboard');
  await expect(laptop).toHaveURL(/\/dashboard/);

  const started = Date.now();
  await page.context().clearCookies();
  await page.goto('/forgot-password');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Send a reset link' }).click();
  await page.goto(linkIn(await waitForEmail(email, 'Reset your Invoica password', started)));
  await page.fill('#password', 'another long passphrase');
  await page.getByRole('button', { name: 'Change password' }).click();
  await page.waitForURL('**/sign-in?reset=done');

  await laptop.goto('/invoices');
  await expect(laptop).toHaveURL(/\/sign-in/);
  // The old password no longer works there either.
  await laptop.fill('#email', email);
  await laptop.fill('#password', PASSWORD);
  await laptop.getByRole('button', { name: 'Sign in' }).click();
  await expect(laptop.getByText('That email and password do not match an account.')).toBeVisible();
  await laptop.context().close();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 360, height: 780 }, isMobile: false });

  test('the refund section of the credit dialog fits the screen', async ({ page }) => {
    await signUpAndOnboard(page, 'Small Screen Studio', { vat: true });
    await addClient(page, 'Tiny Shop Ltd');
    await issueInvoice(page, 'Tiny Shop Ltd');
    await page.getByRole('button', { name: 'Record payment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Credit note' }).click();
    await page.locator('#cn-mode').selectOption('whole');
    await expect(page.getByRole('dialog').getByText('Refund of £120.00')).toBeVisible();
    const overflow = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')!;
      return Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        dialog.scrollWidth - dialog.clientWidth,
      );
    });
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator('#cn-refund-method')).toBeInViewport({ ratio: 0.5 });
  });
});
