import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { addClient, choose, signUpAndOnboard, watchErrors } from './helpers';
import { emailsTo, waitForEmail } from './mailbox';

/** docs/specs/reminders.md, acceptance criteria 5 and 6. */

test.skip(({ isMobile }) => isMobile, 'The flow is the same at every width; the desktop run covers it.');

test('a reminder goes with the PDF and what is owed now, and appears in the activity', async ({ page }) => {
  const errors = watchErrors(page);
  await signUpAndOnboard(page, 'Reminder Works', { vat: true });
  const client = `payables${Date.now()}@client.example`;
  await addClient(page, 'Kestrel Joinery Ltd', client);

  await page.goto('/settings#reminders');
  await page.getByLabel('Remind clients about unpaid invoices').check();
  await expect(page.getByLabel('7 days after')).toBeChecked();
  await page.getByRole('button', { name: 'Save reminder settings' }).click();
  await expect(page.getByText('Reminder settings saved.')).toBeVisible();

  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Kestrel Joinery Ltd' });
  await page.getByLabel('Line 1 description').fill('Oak shelving');
  await page.getByLabel('Line 1 price').fill('100');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  const invoiceUrl = page.url().replace('?issued=1', '');
  const number = (await page.getByRole('heading', { level: 1 }).textContent())!.match(/INV-\d+/)![0];

  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.fill('#pay-amount', '20');
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect(page.getByText(/Next reminder (today|on \d+ \w+ \d{4})\./)).toBeVisible();
  const started = Date.now();
  await page.getByRole('button', { name: 'Send a reminder now' }).click();
  await expect(page.getByText('A reminder is on its way.')).toBeVisible();

  const email = await waitForEmail(
    client,
    `Reminder: invoice ${number} is due on ${await dueDate(page)}`,
    started,
  );
  // £100.00 plus VAT, less the £20.00 paid: £100.00 owed when the reminder is sent.
  expect(email.text).toContain('£100.00');
  expect(email.raw).toContain(`filename="${number}.pdf"`);

  await page.goto(invoiceUrl);
  await expect(page.getByText(`Reminder sent to ${client}`)).toBeVisible();

  await page.getByRole('button', { name: 'Pause reminders for this invoice' }).click();
  await expect(page.getByText('Reminders are paused for this invoice.')).toBeVisible();
  await page.getByRole('button', { name: 'Resume reminders' }).click();
  await expect(page.getByText(/Next reminder/)).toBeVisible();
  expect(errors).toEqual([]);
});

/** The due date as the invoice page prints it, for example "18 November 2026". */
async function dueDate(page: Page) {
  const row = page.locator('dt', { hasText: /^Due$/ }).locator('xpath=following-sibling::dd[1]');
  return (await row.textContent())!.trim();
}

/**
 * The server's CRON_SECRET, which the host's scheduler would send: from the environment for a production run, else the
 * development server's `.env.local`.
 */
function cronSecret() {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  try {
    return /^CRON_SECRET=(.+)$/m.exec(readFileSync(join(process.cwd(), '.env.local'), 'utf8'))?.[1]?.trim();
  } catch {
    return undefined;
  }
}

test('the scheduled drain sends the reminder due today, once', async ({ page, request }) => {
  const secret = cronSecret();
  test.skip(!secret, 'Needs CRON_SECRET.');
  await signUpAndOnboard(page, 'Scheduled Reminder Works', { vat: true });
  const client = `scheduled${Date.now()}@client.example`;
  await addClient(page, 'Heron Wharf Ltd', client);
  await page.goto('/settings#reminders');
  await page.getByLabel('Remind clients about unpaid invoices').check();
  await page.getByRole('button', { name: 'Save reminder settings' }).click();
  await expect(page.getByText('Reminder settings saved.')).toBeVisible();

  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Heron Wharf Ltd' });
  // Today in the business's time zone, as the editor and the scan count it.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  await page.fill('#e-due', today);
  await page.getByLabel('Line 1 description').fill('Mooring survey');
  await page.getByLabel('Line 1 price').fill('250');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  const number = (await page.getByRole('heading', { level: 1 }).textContent())!.match(/INV-\d+/)![0];
  await expect(page.getByText('Next reminder today.')).toBeVisible();

  const started = Date.now();
  const drain = () => request.post('/api/jobs/drain', { headers: { authorization: `Bearer ${secret}` } });
  const first = await drain();
  expect(first.status()).toBe(200);
  const email = await waitForEmail(client, `Invoice ${number} is due today`, started);
  expect(email.text).toContain('£300.00');
  expect((await drain()).status()).toBe(200);
  await page.waitForTimeout(1000);
  expect(emailsTo(client, started)).toHaveLength(1);
  await page.reload();
  await expect(page.getByText(/Next reminder on \d+ \w+ \d{4}\./)).toBeVisible();
});

test('reminder wording with a placeholder Invoica cannot fill in is refused, and says which', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Placeholder Studio', { vat: true });
  await page.goto('/settings#reminders');
  await page.getByLabel('Remind clients about unpaid invoices').check();
  await page.getByText('After the due date', { exact: true }).click();
  const body = page.locator('#r-late-body');
  await body.fill('Hello {client}, {amout} is still owed on invoice {number}.');
  await page.getByRole('button', { name: 'Save reminder settings' }).click();
  await expect(
    page.getByText(
      'Invoica cannot fill in {amout}. Use {client}, {number}, {amount}, {due_date}, {days_late} or {business}.',
    ),
  ).toBeVisible();
  // Nothing was saved: the page asks before reloading over the change, and then shows reminders still off.
  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByLabel('Remind clients about unpaid invoices')).not.toBeChecked();
  await page.getByLabel('Remind clients about unpaid invoices').check();
  await page.getByText('After the due date', { exact: true }).click();
  await page.locator('#r-late-body').fill('Hello {client}, {amount} is still owed on invoice {number}.');
  await page.getByRole('button', { name: 'Save reminder settings' }).click();
  await expect(page.getByText('Reminder settings saved.')).toBeVisible();
});
