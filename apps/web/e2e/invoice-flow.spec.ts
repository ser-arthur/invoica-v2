import { expect, test } from '@playwright/test';
import { addClient, signUpAndOnboard, watchErrors } from './helpers';
import { waitForEmail } from './mailbox';

test('a VAT-registered business invoices a client, issues, downloads the PDF and records a part payment', async ({
  page,
  request,
}) => {
  const errors = watchErrors(page);
  await signUpAndOnboard(page, 'Harrow & Vale', { vat: true });
  await addClient(page, 'Northlane Logistics Ltd');

  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Northlane Logistics Ltd' });
  await page.fill('#e-title', 'Operations review');
  await page.getByLabel('Line 1 description').fill('Site visits');
  await page.getByLabel('Line 1 qty').fill('4');
  await page.getByLabel('Line 1 price').fill('650');
  await page.getByRole('button', { name: 'Add a line' }).click();
  await page.getByLabel('Line 2 description').fill('Findings report');
  await page.getByLabel('Line 2 price').fill('1,800');

  // 4 x 650 + 1,800 = 4,400, plus VAT at 20% = 5,280, worked out by the same core the server uses.
  await expect(page.getByLabel('Line 1 amount')).toHaveText('£2,600.00');
  await expect(page.getByText('£5,280.00').first()).toBeVisible();

  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('INV-0001');

  const pdfUrl = page.url().replace('?issued=1', '') + '/pdf?download=1';
  const pdf = await request.get(pdfUrl, {
    headers: { cookie: (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; ') },
  });
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'no sideways scroll on the invoice page').toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: 'Mark as sent' }).click();
  await expect(page.getByText('Sent').first()).toBeVisible();
  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.fill('#pay-amount', '1000');
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByText('Part paid').first()).toBeVisible();
  await expect(page.getByText('£4,280.00').first()).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.getByText('£4,280.00').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('an issued invoice cannot be opened by another business', async ({ browser }) => {
  const a = await browser.newPage();
  await signUpAndOnboard(a, 'Alpha Studio');
  await addClient(a, 'Client of Alpha');
  await a.goto('/invoices/new');
  await a.getByLabel('Bill to').selectOption({ label: 'Client of Alpha' });
  await a.getByLabel('Line 1 description').fill('Design');
  await a.getByLabel('Line 1 price').fill('500');
  await a.getByRole('button', { name: 'Issue invoice' }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await a.waitForURL(/\/invoices\/[0-9a-f-]{36}/);
  const url = new URL(a.url());
  url.search = '';

  const b = await browser.newPage();
  await signUpAndOnboard(b, 'Beta Works');
  const page = await b.goto(url.toString());
  expect(page?.status()).toBe(404);
  const pdf = await b.goto(`${url.toString()}/pdf`);
  expect(pdf?.status()).toBe(404);
});

test('an issued invoice is emailed with its PDF and marked as sent', async ({ page }) => {
  await signUpAndOnboard(page, 'Field Office');
  await addClient(page, 'Mara Linden Ceramics');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Mara Linden Ceramics' });
  await page.getByLabel('Line 1 description').fill('Website design');
  await page.getByLabel('Line 1 price').fill('2400');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  const number = (await page.getByRole('heading', { level: 1 }).textContent())!.match(/INV-\d+/)![0];

  const started = Date.now();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByLabel('To', { exact: true })).toHaveValue('accounts@client.example');
  await page.getByRole('dialog').getByRole('button', { name: 'Send invoice' }).click();
  await expect(page.getByText(/On its way to accounts@client.example/)).toBeVisible();

  const email = await waitForEmail('accounts@client.example', `Invoice ${number} from Field Office`, started);
  expect(email.raw).toContain('To: accounts@client.example');
  expect(email.raw).toContain(`filename="${number}.pdf"`);
  await page.reload();
  await expect(page.getByText('Sent').first()).toBeVisible();
});

test('two payments recorded from the same page both count, and a credit note credits part of a line', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await signUpAndOnboard(page, 'Calder Works', { vat: true });
  await addClient(page, 'Ostrava Supplies Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Ostrava Supplies Ltd' });
  await page.getByLabel('Line 1 description').fill('Site visits');
  await page.getByLabel('Line 1 qty').fill('2');
  await page.getByLabel('Line 1 price').fill('100');
  await page.getByRole('button', { name: 'Add a line' }).click();
  await page.getByLabel('Line 2 description').fill('Travel');
  await page.getByLabel('Line 2 price').fill('50');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  const invoiceUrl = page.url().replace('?issued=1', '');

  for (const [amount, balance] of [
    ['100', '£200.00'],
    ['50', '£150.00'],
  ] as const) {
    await page.getByRole('button', { name: 'Record payment' }).click();
    await page.fill('#pay-amount', amount);
    await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText(balance).first()).toBeVisible();
  }

  await page.getByRole('button', { name: 'Credit note' }).click();
  await page.locator('#cn-mode').selectOption('lines');
  await page.getByLabel(/^Site visits/).fill('1');
  // One of two site visits: £100.00 plus VAT at 20%, worked out from the invoice as issued.
  await expect(page.getByRole('dialog').getByText('£120.00')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('£20.00')).toBeVisible();
  await page.fill('#cn-reason', 'One visit was cancelled.');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue credit note' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CN-0001');

  await page.goto(invoiceUrl);
  await expect(page.getByText('£30.00').first()).toBeVisible();

  // The credit notes list says which invoice each one credits, and when it was issued.
  await page.goto('/invoices?kind=credit_note');
  await expect(page.getByText('Credits INV-0001').filter({ visible: true }).first()).toBeVisible();
  await expect(
    page
      .getByRole('columnheader', { name: 'Issued' })
      .or(page.getByText(/issued \d/))
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('after a part payment, a credit note for everything still owed settles the invoice to the penny', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await signUpAndOnboard(page, 'Penny Lane Studio', { vat: true });
  await addClient(page, 'Harbour Kilns Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Harbour Kilns Ltd' });
  await page.getByLabel('Line 1 description').fill('Glaze testing');
  await page.getByLabel('Line 1 price').fill('100');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  const invoiceUrl = page.url().replace('?issued=1', '');

  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.fill('#pay-amount', '60.03');
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Credit note' }).click();
  await page.locator('#cn-mode').selectOption('amount');
  // £49.97 before VAT is the most that keeps the credit note within the £59.97 still owed; above it, a refund.
  await expect(
    page.getByRole('dialog').getByText(/Above £49\.97, the credit note is more than the £59\.97 still owed/),
  ).toBeVisible();
  await page.locator('#cn-mode').selectOption('balance');
  await expect(page.getByRole('dialog').getByText('£59.97').last()).toBeVisible();
  await page.fill('#cn-reason', 'The rest is waived.');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue credit note' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CN-0001');

  await page.goto(invoiceUrl);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Settled');
  expect(errors).toEqual([]);
});

test('a paid invoice is credited in full with a refund, shown on the invoice and in the export', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await signUpAndOnboard(page, 'Refund Row Studio', { vat: true });
  await addClient(page, 'Mallow Prints Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Mallow Prints Ltd' });
  await page.getByLabel('Line 1 description').fill('Print run');
  await page.getByLabel('Line 1 price').fill('100');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  const invoiceUrl = page.url().replace('?issued=1', '');

  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.fill('#pay-amount', '120');
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Credit note' }).click();
  await page.locator('#cn-mode').selectOption('whole');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Refund of £120.00')).toBeVisible();
  await page.selectOption('#cn-refund-method', 'bank_transfer');
  await page.fill('#cn-refund-ref', 'RF-0042');
  await page.fill('#cn-reason', 'The prints were returned.');
  await dialog.getByRole('button', { name: 'Issue credit note and record refund' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CN-0001');

  await page.goto(invoiceUrl);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Credited');
  await expect(page.getByText(/Refund, .*Bank transfer, RF-0042, with/)).toBeVisible();
  await expect(page.getByText('Refund recorded, £120.00 with CN-0001')).toBeVisible();

  const csv = await (await page.request.get('/settings/export?format=csv&type=payments')).text();
  expect(csv).toMatch(/^type,invoice,client,date,amount,currency,method,reference,removed,credit_note/);
  expect(csv).toMatch(/payment,INV-0001,Mallow Prints Ltd,\d{4}-\d{2}-\d{2},120\.00,GBP,bank_transfer/);
  expect(csv).toMatch(
    /refund,INV-0001,Mallow Prints Ltd,\d{4}-\d{2}-\d{2},-120\.00,GBP,bank_transfer,RF-0042,no,CN-0001/,
  );
  expect(errors).toEqual([]);
});
