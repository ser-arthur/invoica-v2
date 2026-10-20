import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { addClient, confirmAndSignIn, signUp, uniqueEmail, watchErrors } from './helpers';
import { emailsTo, linkIn, waitForEmail } from './mailbox';

/**
 * A business's first weeks in one go, at desktop and phone widths: sign up, set up, clients and a saved item,
 * drafts saved and reopened, invoices issued and emailed, payments until paid, a credit note, a reminder, and the
 * export. After each step the figures are checked wherever they appear: the invoice, the list, the client's page,
 * the dashboard and the export. With JOURNEY_SHOTS set, a screenshot of each step is kept there.
 */

const BUSINESS = 'Linden & Rowe Studio';
const CAFE = 'Harbour Lights Cafe Ltd';
const ARCHITECTS = 'Meridian Architects LLP';
const WORKSHOP = 'Brand workshop (day)';

test('a business’s first weeks: drafts, invoices, emails, payments, a credit note, a reminder and the export', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  const width = testInfo.project.name;
  const shotsDir = process.env.JOURNEY_SHOTS;
  if (shotsDir) mkdirSync(shotsDir, { recursive: true });
  let step = 0;
  const shot = async (name: string) => {
    step += 1;
    if (!shotsDir) return;
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: join(shotsDir, `${width}-${String(step).padStart(2, '0')}-${name}.png`),
      fullPage: true,
    });
  };
  const owedOn = (row: string) => page.getByRole('row', { name: new RegExp(row) }).filter({ visible: true });
  const cafeEmail = `accounts${Date.now()}@harbourlights.example`;
  const architectsEmail = `finance${Date.now()}@meridian.example`;

  // 1. Sign up, confirm the address with the password, and set up the business.
  const email = uniqueEmail('journey');
  const started = Date.now();
  await signUp(page, email);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await confirmAndSignIn(
    page,
    email,
    linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started)),
  );
  await page.fill('#name', BUSINESS);
  await page.getByLabel('I am registered for VAT').check();
  await page.fill('#taxNumber', 'GB 000 0000 00');
  await page.getByRole('button', { name: 'Continue to Invoica' }).click();
  await page.waitForURL('**/dashboard**');
  await shot('dashboard-empty');

  await page.goto('/settings');
  await page.fill('#s-email', 'hello@lindenrowe.example');
  await page.fill('#s-bank', 'Northern Bank');
  await page.fill('#s-sc', '40-11-22');
  await page.fill('#s-an', '12345678');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText(/Settings saved\./)).toBeVisible();
  await page.goto('/settings#reminders');
  await page.getByLabel('Remind clients about unpaid invoices').check();
  await page.getByRole('button', { name: 'Save reminder settings' }).click();
  await expect(page.getByText('Reminder settings saved.')).toBeVisible();

  // 2. Two clients and a saved item.
  await addClient(page, CAFE, cafeEmail);
  const cafeUrl = page.url();
  await page.goto('/clients/new');
  await page.fill('#c-name', ARCHITECTS);
  await page.fill('#c-email', architectsEmail);
  await page.fill('#c-terms', '14');
  await page.getByRole('button', { name: 'Save client' }).click();
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);
  await page.goto('/clients');
  await expect(page.getByText(CAFE).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(ARCHITECTS).filter({ visible: true }).first()).toBeVisible();
  await shot('clients');

  await page.goto('/items');
  await page.fill('#i-name', WORKSHOP);
  await page.fill('#i-price', '950');
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(
    page.getByRole('button', { name: new RegExp(WORKSHOP.replace(/[()]/g, '\\$&')) }),
  ).toContainText('£950.00');

  // 3. A draft saved, found in the list, reopened, finished and issued.
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: CAFE });
  await page.getByLabel('Line 1 description').fill('Menu design');
  await page.getByLabel('Line 1 price').fill('600');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit\?saved=1/);
  await expect(page.getByText('Draft saved.')).toBeVisible();
  const firstDraft = new URL(page.url()).pathname;
  await page.goto('/invoices?filter=draft');
  await expect(owedOn(CAFE).first()).toContainText('£720.00');
  await page.goto(firstDraft);
  await page.getByRole('button', { name: 'Add a line' }).click();
  await page.getByLabel('Line 2 description').fill('Window graphics');
  await page.getByLabel('Line 2 qty').fill('2');
  await page.getByLabel('Line 2 price').fill('150');
  // £900.00 before VAT, £180.00 VAT, £1,080.00 in all.
  await expect(page.getByText('£1,080.00').first()).toBeVisible();
  await shot('editor-first-invoice');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await expect(page.getByRole('dialog').getByText('£1,080.00').first()).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  const first = page.url().replace('?issued=1', '');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('INV-0001');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Issued');
  const kept = page.frameLocator('iframe').first();
  await expect(kept.getByText(CAFE).first()).toBeVisible();
  await expect(kept.getByText('12345678').first()).toBeVisible();
  const pdf = await page.request.get(`${first}/pdf`);
  expect([pdf.status(), pdf.headers()['content-type']]).toEqual([200, 'application/pdf']);
  await shot('first-invoice-issued');

  // 4. Emailed: the client gets it with the PDF, and it is marked as sent.
  const sentAt = Date.now();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByLabel('To', { exact: true })).toHaveValue(cafeEmail);
  await page.getByRole('dialog').getByRole('button', { name: 'Send invoice' }).click();
  await expect(page.getByText(new RegExp(`On its way to ${cafeEmail}`))).toBeVisible();
  const invoiceEmail = await waitForEmail(cafeEmail, `Invoice INV-0001 from ${BUSINESS}`, sentAt);
  expect(invoiceEmail.raw).toContain('filename="INV-0001.pdf"');
  expect(invoiceEmail.raw).toMatch(/^Reply-To: hello@lindenrowe\.example$/m);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sent');
  // The note about emailing it goes once it has been sent.
  await expect(page.getByText(/is issued and kept/)).toHaveCount(0);

  // 5. Paid in two parts: part paid, then paid.
  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.fill('#pay-amount', '500');
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Part paid');
  await expect(page.getByText('£580.00').first()).toBeVisible();
  await page.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.locator('#pay-amount')).toHaveValue('580.00');
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Paid');
  await expect(page.getByRole('button', { name: 'Record payment' })).toHaveCount(0);
  await shot('first-invoice-paid');

  // 6. A second invoice from the saved item, on the client's own terms.
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: ARCHITECTS });
  await page.getByLabel('Add a saved item').selectOption({ label: WORKSHOP });
  await expect(page.getByLabel('Line 1 price')).toHaveValue('950.00');
  await expect(page.getByText('£1,140.00').first()).toBeVisible();
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  const second = page.url().replace('?issued=1', '');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('INV-0002');
  // Due 14 days after today, the architects' own terms.
  const due = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  }).format(new Date(Date.now() + 14 * 86_400_000));
  await expect(page.locator('dt', { hasText: /^Due$/ }).locator('xpath=following-sibling::dd[1]')).toHaveText(
    due,
  );

  // 7. Half the workshop cancelled: a credit note for £200.00 before VAT, £240.00 in all.
  await page.getByRole('button', { name: 'Credit note' }).click();
  await page.locator('#cn-mode').selectOption('amount');
  await page.fill('#cn-amount', '200');
  await page.fill('#cn-reason', 'Half the workshop was cancelled.');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue credit note' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CN-0001');
  await expect(page.getByText('£240.00').first()).toBeVisible();
  await page.goto(second);
  await expect(page.getByText('£900.00').first()).toBeVisible();
  await shot('second-invoice-credited');

  // 8. A reminder now, with what is owed after the credit note.
  const remindedAt = Date.now();
  await page.getByRole('button', { name: 'Send a reminder now' }).click();
  await expect(page.getByText('A reminder is on its way.')).toBeVisible();
  const reminder = await waitForEmail(
    architectsEmail,
    `Reminder: invoice INV-0002 is due on ${due}`,
    remindedAt,
  );
  expect(reminder.text).toContain('£900.00');
  expect(reminder.raw).toContain('filename="INV-0002.pdf"');
  expect(emailsTo(cafeEmail, remindedAt)).toHaveLength(0);

  // 9. A draft for later.
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: CAFE });
  await page.getByLabel('Line 1 description').fill('Spring menu');
  await page.getByLabel('Line 1 price').fill('100');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit\?saved=1/);

  // 10. The list, the client's page and the dashboard agree.
  await page.goto('/invoices');
  await expect(owedOn('INV-0001')).toContainText('Paid');
  await expect(owedOn('INV-0002')).toContainText('£900.00');
  await expect(owedOn('Draft').first()).toContainText(CAFE);
  await shot('invoice-list');

  await page.goto(cafeUrl);
  const cafeFigures = page.locator('dl').first();
  await expect(cafeFigures).toContainText('Owes you now£0.00');
  await expect(cafeFigures).toContainText('Paid to date£1,080.00');
  await expect(page.getByText('INV-0001').filter({ visible: true }).first()).toBeVisible();
  await shot('client-page');

  await page.goto('/dashboard');
  const owed = page.locator('div', { has: page.getByRole('heading', { name: 'Owed to you' }) }).last();
  await expect(owed).toContainText('£900');
  await expect(page.getByText('1 open invoice')).toBeVisible();
  const figure = (label: string) =>
    page.locator('div', { has: page.getByText(label, { exact: true }) }).last();
  await expect(figure('Paid in the last 30 days')).toContainText('£1,080.00');
  await expect(figure('Net invoiced this month')).toContainText('£1,980.00');
  await expect(figure('Net invoiced this month')).toContainText('£2,220.00 invoiced, £240.00 credited');
  await expect(figure('Drafts waiting')).toContainText('1');
  await shot('dashboard');

  // 11. The export holds the same records.
  const invoicesCsv = await (await page.request.get('/settings/export?format=csv&type=invoices')).text();
  expect(invoicesCsv).toContain('INV-0001');
  expect(invoicesCsv).toContain('INV-0002');
  expect(invoicesCsv).toContain('CN-0001');
  const paymentsCsv = await (await page.request.get('/settings/export?format=csv&type=payments')).text();
  expect(paymentsCsv).toMatch(new RegExp(`payment,INV-0001,${CAFE},\\d{4}-\\d{2}-\\d{2},500\\.00,GBP`));
  expect(paymentsCsv).toMatch(new RegExp(`payment,INV-0001,${CAFE},\\d{4}-\\d{2}-\\d{2},580\\.00,GBP`));
  const clientsCsv = await (await page.request.get('/settings/export?format=csv&type=clients')).text();
  expect(clientsCsv).toContain(CAFE);
  expect(clientsCsv).toContain(ARCHITECTS);

  expect(errors).toEqual([]);
});
