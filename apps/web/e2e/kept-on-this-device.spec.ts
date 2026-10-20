import { expect, test, type Page } from '@playwright/test';
import { PASSWORD, addClient, signIn, signUpAndOnboard } from './helpers';

/** docs/specs/kept-on-this-device.md, acceptance criteria 1 to 4. */

test.skip(
  ({ isMobile }) => isMobile,
  'The editor keeps typing the same way at every width; the desktop run covers it.',
);

const OFFER =
  /This device kept an invoice you were typing at \d{2}:\d{2} on \d{1,2} \w+ \d{4}, which was not saved\./;

/** Leaves the page as a phone or a crash would: without saving and without the browser asking. */
async function closeWithoutAsking(page: Page) {
  // The kept copy is written a moment after the last change.
  await page.waitForTimeout(600);
  await page.close({ runBeforeUnload: false });
}

async function newInvoice(page: Page, client: string, title: string, price: string) {
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: client });
  await page.getByLabel('Line 1 description').fill(title);
  await page.getByLabel('Line 1 price').fill(price);
}

async function settled(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.getByLabel('Line 1 description')).toBeVisible();
}

test('1: a new invoice typed and closed without saving is offered back, every field as typed, and saves', async ({
  page,
  context,
}) => {
  await signUpAndOnboard(page, 'Kept Typing Studio', { vat: true });
  await addClient(page, 'Ashdown Forge Ltd');
  await newInvoice(page, 'Ashdown Forge Ltd', 'Gate restoration', '640');
  await closeWithoutAsking(page);

  const again = await context.newPage();
  await again.goto('/invoices/new');
  await expect(again.getByText(OFFER)).toBeVisible();
  await expect(again.getByLabel('Line 1 description')).toHaveValue('');
  await again.getByRole('button', { name: 'Bring it back' }).click();
  await expect(again.getByText(OFFER)).toHaveCount(0);
  await expect(again.getByLabel('Line 1 description')).toHaveValue('Gate restoration');
  await expect(again.getByLabel('Line 1 price')).toHaveValue('640');
  await expect(again.getByLabel('Bill to').locator('option:checked')).toHaveText('Ashdown Forge Ltd');
  await again.getByRole('button', { name: 'Save draft' }).click();
  await again.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit/);
  await expect(again.getByLabel('Line 1 description')).toHaveValue('Gate restoration');

  // 3: saved, nothing is offered when the page opens again.
  await again.goto('/invoices/new');
  await settled(again);
  await expect(again.getByText(OFFER)).toHaveCount(0);
});

test('2: a draft edited and closed is offered back; discarded, the draft is as saved and nothing is offered again', async ({
  page,
  context,
}) => {
  await signUpAndOnboard(page, 'Kept Draft Studio', { vat: true });
  await addClient(page, 'Brackenfield Mill Ltd');
  await newInvoice(page, 'Brackenfield Mill Ltd', 'Loom survey', '300');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit/);
  const draft = new URL(page.url()).pathname;
  await page.getByLabel('Line 1 description').fill('Loom survey and repair plan');
  await closeWithoutAsking(page);

  const again = await context.newPage();
  await again.goto(draft);
  await expect(again.getByText(OFFER)).toBeVisible();
  await expect(again.getByLabel('Line 1 description')).toHaveValue('Loom survey');
  await again.getByRole('button', { name: 'Discard it' }).click();
  await expect(again.getByText(OFFER)).toHaveCount(0);
  await expect(again.getByLabel('Line 1 description')).toHaveValue('Loom survey');
  await again.reload();
  await settled(again);
  await expect(again.getByText(OFFER)).toHaveCount(0);
});

test('3: signing out removes what this device kept', async ({ page, context }) => {
  const email = await signUpAndOnboard(page, 'Kept Sign Out Studio', { vat: true });
  await addClient(page, 'Coldharbour Kilns Ltd');
  await newInvoice(page, 'Coldharbour Kilns Ltd', 'Kiln relining', '900');
  await page.waitForTimeout(600);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Account and settings').click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/sign-in');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
  await page.goto('/invoices/new');
  await settled(page);
  await expect(page.getByText(OFFER)).toHaveCount(0);
  await context.close();
});

test('4: a kept edit of a draft changed on another device since is not saved over the change without asking', async ({
  page,
  context,
  browser,
}) => {
  const email = await signUpAndOnboard(page, 'Kept Conflict Studio', { vat: true });
  await addClient(page, 'Dunsfold Joinery Ltd');
  await newInvoice(page, 'Dunsfold Joinery Ltd', 'Staircase', '1200');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit/);
  const draft = new URL(page.url()).pathname;
  await page.getByLabel('Line 1 description').fill('Staircase, oak');
  await closeWithoutAsking(page);

  // Another device changes the draft and saves.
  const device = await browser.newContext();
  const other = await device.newPage();
  await signIn(other, email);
  await other.goto(draft);
  await settled(other);
  await other.getByLabel('Line 1 price').fill('1350');
  await other.getByRole('button', { name: 'Save draft' }).click();
  await expect(other.getByText('Draft saved.')).toBeVisible();
  await device.close();

  const again = await context.newPage();
  await again.goto(draft);
  await again.getByRole('button', { name: 'Bring it back' }).click();
  await expect(again.getByLabel('Line 1 description')).toHaveValue('Staircase, oak');
  await again.getByRole('button', { name: 'Save draft' }).click();
  await expect(
    again.getByText(
      'This draft has changed since this page last saved it: in another tab, on another device, or by a save from here whose answer did not arrive. Save yours anyway to replace it, or reload the page to see it.',
    ),
  ).toBeVisible();
});

test('5: a new invoice issued just before the page closed, its answer lost, is not issued twice when brought back', async ({
  page,
  context,
}) => {
  await signUpAndOnboard(page, 'Kept Key Studio', { vat: true });
  await addClient(page, 'Elmstead Pottery Ltd');
  await newInvoice(page, 'Elmstead Pottery Ltd', 'Kiln repair', '420');
  await page.waitForTimeout(600);
  // The issue reaches the server, and its answer never reaches the phone.
  await page.route('**/invoices/new', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fetch();
    await route.abort();
  });
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await expect(page.getByText(/could not be reached/)).toBeVisible();
  await page.close({ runBeforeUnload: false });

  const again = await context.newPage();
  await again.goto('/invoices/new');
  await again.getByRole('button', { name: 'Bring it back' }).click();
  await again.getByRole('button', { name: 'Issue invoice' }).click();
  await again.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await again.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  await expect(again.getByRole('heading', { level: 1 })).toContainText('INV-0001');
  await again.goto('/invoices');
  await expect(again.getByRole('row', { name: /Elmstead Pottery Ltd/ })).toHaveCount(1);
});
