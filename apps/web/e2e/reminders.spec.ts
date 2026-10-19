import { expect, test } from '@playwright/test';
import { addClient, signUpAndOnboard, watchErrors } from './helpers';
import { waitForEmail } from './mailbox';

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
  await page.getByLabel('Bill to').selectOption({ label: 'Kestrel Joinery Ltd' });
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
async function dueDate(page: import('@playwright/test').Page) {
  const row = page.locator('dt', { hasText: /^Due$/ }).locator('xpath=following-sibling::dd[1]');
  return (await row.textContent())!.trim();
}
