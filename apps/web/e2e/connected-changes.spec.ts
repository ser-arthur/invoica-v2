import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { PASSWORD, addClient, signUpAndOnboard } from './helpers';
import { emailsTo } from './mailbox';

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

test('leaving an invoice with changes not saved asks first, from any link', async ({ page }) => {
  await signUpAndOnboard(page, 'Leaving Studio', { vat: true });
  await addClient(page, 'Harbourside Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Harbourside Ltd' });
  await page.getByLabel('Line 1 description').fill('Mooring plan');
  await page.getByLabel('Line 1 price').fill('450');
  await page
    .getByRole('navigation', { name: 'Main' })
    .first()
    .getByRole('link', { name: 'Dashboard' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Leave this invoice?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/invoices\/new$/);
  await expect(page.getByLabel('Line 1 description')).toHaveValue('Mooring plan');

  // Saved, it leaves without asking.
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit$/);
  const draft = page.url();
  await page.getByLabel('Line 1 description').fill('Mooring plan, revised');
  await page
    .getByRole('navigation', { name: 'Main' })
    .first()
    .getByRole('link', { name: 'Invoices' })
    .click();
  await dialog.getByRole('button', { name: 'Leave without saving' }).click();
  await page.waitForURL(/\/invoices$/);
  await expect(page.getByText('Mooring plan, revised')).toHaveCount(0);
  await page.goto(draft);
  await expect(page.getByLabel('Line 1 description')).toHaveValue('Mooring plan');
  await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: 'Clients' }).click();
  await page.waitForURL(/\/clients$/);
});

test('settings saved stay saved, and the next invoice follows them', async ({ page }) => {
  await signUpAndOnboard(page, 'Settings Studio', { vat: true });
  await addClient(page, 'Lantern Works Ltd');
  await page.goto('/settings');
  await page.fill('#s-ip', 'SS-');
  await page.fill('#s-terms', '14');
  await page.fill('#s-bn', 'Settings Studio Ltd');
  await page.fill('#s-bank', 'Northern Bank');
  await page.fill('#s-sc', '12-34-56');
  await page.fill('#s-an', '12345678');
  await page.fill('#s-notes', 'Thank you for your business.');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText(/Settings saved\./)).toBeVisible();

  await page.reload();
  for (const [id, value] of [
    ['#s-ip', 'SS-'],
    ['#s-terms', '14'],
    ['#s-bank', 'Northern Bank'],
    ['#s-sc', '12-34-56'],
    ['#s-an', '12345678'],
    ['#s-notes', 'Thank you for your business.'],
  ] as const) {
    await expect(page.locator(id), id).toHaveValue(value);
  }

  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Lantern Works Ltd' });
  await page.getByLabel('Line 1 description').fill('Lighting plan');
  await page.getByLabel('Line 1 price').fill('900');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  const due = new Date(`${today}T12:00:00Z`);
  due.setUTCDate(due.getUTCDate() + 14);
  await expect(page.locator('#e-due')).toHaveValue(due.toISOString().slice(0, 10));
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('SS-0001');
  const doc = page.frameLocator('iframe').first();
  await expect(doc.getByText('Northern Bank').first()).toBeVisible();
  await expect(doc.getByText('12-34-56').first()).toBeVisible();
  await expect(doc.getByText('Thank you for your business.').first()).toBeVisible();
});

/** The server's CRON_SECRET: from the environment for a production run, else the development server's `.env.local`. */
function cronSecret() {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  try {
    return /^CRON_SECRET=(.+)$/m.exec(readFileSync(join(process.cwd(), '.env.local'), 'utf8'))?.[1]?.trim();
  } catch {
    return undefined;
  }
}

test('a voided invoice leaves what is owed, gets no reminder, and can take no payment', async ({
  page,
  request,
}) => {
  const secret = cronSecret();
  test.skip(!secret, 'Needs CRON_SECRET.');
  await signUpAndOnboard(page, 'Void Studio', { vat: true });
  const client = `void${Date.now()}@client.example`;
  await addClient(page, 'Osprey Quay Ltd', client);
  await page.goto('/settings#reminders');
  await page.getByLabel('Remind clients about unpaid invoices').check();
  await page.getByRole('button', { name: 'Save reminder settings' }).click();
  await expect(page.getByText('Reminder settings saved.')).toBeVisible();

  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Osprey Quay Ltd' });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  await page.fill('#e-due', today);
  await page.getByLabel('Line 1 description').fill('Raised in error');
  await page.getByLabel('Line 1 price').fill('250');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  const url = page.url().replace('?issued=1', '');
  const number = (await page.getByRole('heading', { level: 1 }).textContent())!.match(/INV-\d+/)![0];
  await expect(page.getByText('Next reminder today.')).toBeVisible();
  await page.goto('/dashboard');
  await expect(page.getByText('1 open invoice')).toBeVisible();

  await page.goto(url);
  await page.getByRole('button', { name: 'Void', exact: true }).click();
  await page.fill('#void-reason', 'Raised for the wrong client.');
  await page.getByRole('dialog').getByRole('button', { name: 'Void invoice' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Void');
  await expect(page.getByRole('button', { name: 'Record payment' })).toHaveCount(0);
  await expect(page.getByText(/Next reminder/)).toHaveCount(0);

  // The scheduled scan finds nothing to send for it.
  const started = Date.now();
  const drain = await request.post('/api/jobs/drain', { headers: { authorization: `Bearer ${secret}` } });
  expect(drain.status()).toBe(200);
  await page.waitForTimeout(1500);
  expect(emailsTo(client, started)).toHaveLength(0);

  await page.goto('/dashboard');
  await expect(page.getByText('Nothing outstanding')).toBeVisible();
  await page.goto('/invoices');
  await expect(page.getByRole('row', { name: new RegExp(number) })).toContainText('Void');
  await page.reload();
  await expect(page.getByRole('row', { name: new RegExp(number) })).toContainText('Void');
});

test('a tax rate changed in another tab while issuing: the new total is shown to confirm before it is issued', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Rate Change Studio', { vat: true });
  await addClient(page, 'Tern Row Press Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Tern Row Press Ltd' });
  await page.getByLabel('Line 1 description').fill('Printed guides');
  await page.getByLabel('Line 1 price').fill('100');
  await page.getByLabel('Line 1 tax').selectOption({ label: 'Reduced rate' });
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit\?saved=1/);

  const settings = await page.context().newPage();
  await settings.goto('/settings');
  await settings.locator('li', { hasText: 'Reduced rate' }).getByRole('button', { name: 'Edit' }).click();
  await settings.fill('#t-r-0', '10');
  await settings.getByRole('button', { name: 'Save tax code' }).click();
  await expect(settings.locator('li', { hasText: 'Reduced rate' })).toContainText('10%');
  await settings.close();

  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await expect(page.getByRole('dialog')).toContainText('£105.00');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await expect(
    page.getByText(
      'The total changed while this was open: it is now £110.00, with the tax rates and settings as they are now. Check it and issue again.',
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Line 1 description')).toHaveValue('Printed guides');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await expect(page.getByRole('dialog')).toContainText('£110.00');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  await expect(page.getByText('£110.00').first()).toBeVisible();
});

test('a client’s page follows its invoices: payments, credit notes and refunds as they happen', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Client Page Studio', { vat: true });
  await addClient(page, 'Lapwing Mill Ltd');
  await page.getByRole('link', { name: 'Clients' }).first().click();
  await page
    .getByRole('link', { name: /Lapwing Mill Ltd/ })
    .first()
    .click();
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);
  const clientUrl = page.url();
  const figure = (label: string) =>
    page.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('xpath=following-sibling::dd[1]');

  const issue = async (what: string, price: string) => {
    await page.goto('/invoices/new');
    await page.getByLabel('Bill to').selectOption({ label: 'Lapwing Mill Ltd' });
    await page.getByLabel('Line 1 description').fill(what);
    await page.getByLabel('Line 1 price').fill(price);
    await page.getByRole('button', { name: 'Issue invoice' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
    await page.waitForURL(/\?issued=1/);
    return page.url().replace('?issued=1', '');
  };
  // £120.00 and £60.00 with VAT.
  const first = await issue('Joinery', '100');
  const second = await issue('Fitting', '50');
  await page.goto(clientUrl);
  await expect(figure('Owes you now')).toHaveText('£180.00');
  await expect(figure('Paid to date')).toHaveText('£0.00');

  await page.goto(first);
  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.fill('#pay-amount', '50');
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto(clientUrl);
  await expect(figure('Owes you now')).toHaveText('£130.00');
  await expect(figure('Paid to date')).toHaveText('£50.00');

  await page.goto(second);
  await page.getByRole('button', { name: 'Credit note' }).click();
  await page.locator('#cn-mode').selectOption('whole');
  await page.fill('#cn-reason', 'Fitting not needed.');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue credit note' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CN-0001');
  // Back to the client page with the browser's history, as a person would.
  await page.goto(clientUrl);
  await page.goto(second);
  await page.goBack();
  await expect(figure('Owes you now')).toHaveText('£70.00');

  await page.goto(first);
  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Paid');
  await page.getByRole('button', { name: 'Credit note' }).click();
  await page.locator('#cn-mode').selectOption('whole');
  await page.fill('#cn-reason', 'Returned.');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue credit note and record refund' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CN-0002');
  await page.goto(clientUrl);
  await expect(figure('Owes you now')).toHaveText('£0.00');
  // Paid to date is net of the £120.00 paid back.
  await expect(figure('Paid to date')).toHaveText('£0.00');
  await page.reload();
  await expect(figure('Owes you now')).toHaveText('£0.00');
});

test('the way rates are chosen changed in another tab: the editor asks for the rate again, and then saves', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Rate Method Studio', { vat: true });
  await page.goto('/clients/new');
  await page.fill('#c-name', 'Lyon Ateliers SARL');
  await page.fill('#c-email', 'compta@lyon.example');
  await page.selectOption('#c-currency', 'EUR');
  await page.getByRole('button', { name: 'Save client' }).click();
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);

  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Lyon Ateliers SARL' });
  await page.getByLabel('Line 1 description').fill('Workshop');
  await page.getByLabel('Line 1 price').fill('100');
  await page.fill('#e-sterling-rate', '1.1400');

  const settings = await page.context().newPage();
  await settings.goto('/settings');
  await settings.selectOption('#s-sterling', 'market');
  await settings.getByRole('button', { name: 'Save settings' }).click();
  await expect(settings.getByText(/Settings saved\./)).toBeVisible();
  await settings.close();

  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(
    page
      .getByText('The exchange rate was entered before the way rates are chosen changed. Enter it again.')
      .first(),
  ).toBeVisible();
  // The page now knows the new way, so the rate typed again is taken.
  await expect(page.locator('#e-sterling-rate')).toHaveValue('');
  // HMRC's monthly rates are no longer offered: the market rate on the day is.
  await expect(page.getByRole('link', { name: /^\w+ \d{4}$/ })).toHaveCount(0);
  await expect(page.getByLabel('Line 1 description')).toHaveValue('Workshop');
  await page.fill('#e-sterling-rate', '1.1450');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit\?saved=1/);
  await expect(page.locator('#e-sterling-rate')).toHaveValue('1.1450');
});

test('a draft changed in another tab is not replaced without asking', async ({ page }) => {
  await signUpAndOnboard(page, 'Two Tabs Studio');
  await addClient(page, 'Heron Wharf Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Heron Wharf Ltd' });
  await page.fill('#e-title', 'Spring survey');
  await page.getByLabel('Line 1 description').fill('Survey');
  await page.getByLabel('Line 1 price').fill('300');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit\?saved=1/);
  const draft = page.url().replace('?saved=1', '');

  const other = await page.context().newPage();
  await other.goto(draft);
  await other.waitForLoadState('networkidle');
  await other.fill('#e-title', 'Spring survey, both sites');
  await other.getByRole('button', { name: 'Save draft' }).click();
  await expect(other.getByText('Draft saved.')).toBeVisible();

  await page.fill('#e-title', 'Spring survey, north site');
  await page.getByRole('button', { name: 'Save draft' }).click();
  const changed = page.getByText(/This draft has changed since this page last saved it/);
  await expect(changed).toBeVisible();
  await expect(page.locator('#e-title')).toHaveValue('Spring survey, north site');
  await page.waitForLoadState('networkidle');
  // The other tab saves again after the refusal: replacing still asks, as that change is newer still.
  await other.fill('#e-title', 'Spring survey, south site');
  await other.getByRole('button', { name: 'Save draft' }).click();
  await expect(other.getByText('Draft saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Save mine anyway' }).click();
  await expect(changed).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Save mine anyway' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  // And this tab's next save goes through as usual.
  await page.fill('#e-title', 'Spring survey, north site only');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await other.reload();
  await expect(other.locator('#e-title')).toHaveValue('Spring survey, north site only');
});
