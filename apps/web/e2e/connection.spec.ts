import { expect, test, type Page } from '@playwright/test';
import { PASSWORD, addClient, choose, signUpAndOnboard } from './helpers';

/**
 * A connection that drops, or an answer lost on the way back, never throws away what was typed, and trying again
 * never records anything twice.
 */

test.skip(({ isMobile }) => isMobile, 'The connection behaves the same at any width.');

const UNREACHABLE = /could not be reached, so this may not have been saved/;

/** Lets the next server action reach the server, then drops its answer, as a connection lost mid-request does. */
async function loseNextAnswer(page: Page) {
  let reached = false;
  await page.route(
    (url) => !url.pathname.startsWith('/_next'),
    async (route) => {
      if (route.request().method() !== 'POST' || !route.request().headers()['next-action'] || reached) {
        return route.fallback();
      }
      reached = true;
      await route.fetch();
      await route.abort('connectionreset');
    },
  );
  return () => reached;
}

test('an invoice typed while offline is kept on screen and saved once the connection is back', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Offline Studio', { vat: true });
  await addClient(page, 'Harbour Mill Ltd');
  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Harbour Mill Ltd' });
  await page.fill('#e-title', 'Winter shoot');
  await page.getByLabel('Line 1 description').fill('Location days');
  await page.getByLabel('Line 1 qty').fill('3');
  await page.getByLabel('Line 1 price').fill('750');

  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText(UNREACHABLE)).toBeVisible();
  await expect(page.locator('#e-title')).toHaveValue('Winter shoot');
  await expect(page.getByLabel('Line 1 amount')).toHaveText('£2,250.00');

  await page.context().setOffline(false);
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit$/);
  await page.reload();
  await expect(page.getByLabel('Line 1 description')).toHaveValue('Location days');
  await page.goto('/invoices');
  await expect(page.getByText('Winter shoot')).toHaveCount(1);
});

test('a new draft whose answer is lost is saved once, however often it is tried again', async ({ page }) => {
  await signUpAndOnboard(page, 'Lost Answer Studio', { vat: true });
  await addClient(page, 'Quay Street Ltd');
  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Quay Street Ltd' });
  await page.fill('#e-title', 'Spring brochure');
  await page.getByLabel('Line 1 description').fill('Design');
  await page.getByLabel('Line 1 price').fill('900');

  const reached = await loseNextAnswer(page);
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText(UNREACHABLE)).toBeVisible();
  expect(reached()).toBe(true);
  await expect(page.locator('#e-title')).toHaveValue('Spring brochure');

  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await page.goto('/invoices');
  await expect(page.getByText('Spring brochure')).toHaveCount(1);
});

test('a payment whose answer is lost is recorded once when tried again', async ({ page }) => {
  await signUpAndOnboard(page, 'Lost Payment Studio', { vat: true });
  await addClient(page, 'Tannery Lane Ltd');
  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Tannery Lane Ltd' });
  await page.getByLabel('Line 1 description').fill('Consulting');
  await page.getByLabel('Line 1 price').fill('100');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);

  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.fill('#pay-amount', '50');
  const reached = await loseNextAnswer(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('dialog').getByText(UNREACHABLE)).toBeVisible();
  expect(reached()).toBe(true);
  await expect(page.locator('#pay-amount')).toHaveValue('50');

  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('dialog').getByText('This payment was already recorded.')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Part paid');
  const payments = page
    .locator('section', { has: page.getByRole('heading', { name: 'Payments' }) })
    .locator('li');
  await expect(payments).toHaveCount(1);
});

test('marking as sent while offline says so, and the invoice stays as it was', async ({ page }) => {
  await signUpAndOnboard(page, 'Offline Send Studio', { vat: true });
  await addClient(page, 'Wharf Road Ltd');
  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Wharf Road Ltd' });
  await page.getByLabel('Line 1 description').fill('Survey');
  await page.getByLabel('Line 1 price').fill('300');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);

  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Mark as sent' }).click();
  await expect(page.getByText(UNREACHABLE)).toBeVisible();
  await page.context().setOffline(false);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Mark as sent' })).toBeVisible();
});

test('signing in or asking for a reset link while offline says so, and the form can be sent again', async ({
  page,
}) => {
  const email = await signUpAndOnboard(page, 'Offline Sign In Studio');
  await page.context().clearCookies();
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('main').getByText(UNREACHABLE)).toBeVisible();
  await page.context().setOffline(false);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');

  await page.context().clearCookies();
  await page.goto('/forgot-password');
  await page.fill('#email', email);
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Send a reset link' }).click();
  await expect(page.getByRole('main').getByText(UNREACHABLE)).toBeVisible();
  await page.context().setOffline(false);
});

test('a new client whose answer is lost is saved once when tried again', async ({ page }) => {
  await signUpAndOnboard(page, 'Lost Client Studio', { vat: true });
  await page.goto('/clients/new');
  await page.fill('#c-name', 'Saltmarsh Trading Ltd');
  await page.fill('#c-email', 'accounts@saltmarsh.example');
  const reached = await loseNextAnswer(page);
  await page.getByRole('button', { name: 'Save client' }).click();
  await expect(page.getByText(UNREACHABLE)).toBeVisible();
  expect(reached()).toBe(true);
  await page.getByRole('button', { name: 'Save client' }).click();
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);
  await page.goto('/clients');
  await expect(page.getByText('Saltmarsh Trading Ltd')).toHaveCount(1);
});

test('a copy of an invoice whose answer is lost is made once when asked again', async ({ page }) => {
  await signUpAndOnboard(page, 'Lost Copy Studio', { vat: true });
  await addClient(page, 'Juniper Row Ltd');
  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Juniper Row Ltd' });
  await page.fill('#e-title', 'Monthly upkeep');
  await page.getByLabel('Line 1 description').fill('Upkeep');
  await page.getByLabel('Line 1 price').fill('80');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  const reached = await loseNextAnswer(page);
  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect(page.getByText(UNREACHABLE)).toBeVisible();
  expect(reached()).toBe(true);
  await page.getByRole('button', { name: 'Duplicate' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit$/);
  await page.goto('/invoices');
  await expect(page.getByText('Monthly upkeep')).toHaveCount(2);
});

test('a new saved item whose answer is lost is saved once when tried again', async ({ page }) => {
  await signUpAndOnboard(page, 'Lost Item Studio', { vat: true });
  await page.goto('/items');
  // With no items yet, the form for a new one is already open.
  await expect(page.getByRole('heading', { name: 'New item' })).toBeVisible();
  await page.fill('#i-name', 'Half-day workshop');
  await page.fill('#i-price', '600');
  const reached = await loseNextAnswer(page);
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText(UNREACHABLE)).toBeVisible();
  expect(reached()).toBe(true);
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText(UNREACHABLE)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Half-day workshop')).toHaveCount(1);
});

test('a page from before a new version says to reload, and keeps what was typed', async ({ page }) => {
  await signUpAndOnboard(page, 'Old Page Studio', { vat: true });
  await page.goto('/clients/new');
  await page.fill('#c-name', 'Ferry Lane Ltd');
  // The server no longer knows the page's actions, as after a new version is deployed.
  await page.route(
    (url) => !url.pathname.startsWith('/_next'),
    async (route) => {
      if (route.request().method() !== 'POST' || !route.request().headers()['next-action']) {
        return route.fallback();
      }
      await route.fulfill({ status: 404, headers: { 'x-nextjs-action-not-found': '1' }, body: '' });
    },
  );
  await page.getByRole('button', { name: 'Save client' }).click();
  await expect(
    page.getByText('Invoica has been updated. Copy anything you typed, then reload the page.'),
  ).toBeVisible();
  await expect(page.getByText(UNREACHABLE)).toHaveCount(0);
  await expect(page.locator('#c-name')).toHaveValue('Ferry Lane Ltd');
});

test('issuing a saved draft again after a lost answer says which number it was issued as', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Lost Issue Studio', { vat: true });
  await addClient(page, 'Tannery Yard Ltd');
  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Tannery Yard Ltd' });
  await page.getByLabel('Line 1 description').fill('Signage');
  await page.getByLabel('Line 1 price').fill('240');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit\?saved=1/);
  const reached = await loseNextAnswer(page);
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await expect(page.getByText(UNREACHABLE)).toBeVisible();
  expect(reached()).toBe(true);
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await expect(
    page.getByText(/This invoice has already been issued as INV-\d+, so it can no longer be changed\./),
  ).toBeVisible();
});
