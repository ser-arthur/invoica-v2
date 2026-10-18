import { expect, test } from '@playwright/test';
import { addClient, signUpAndOnboard, watchErrors } from './helpers';

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
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
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

  const dir = join(process.cwd(), '.data/mail');
  let found = '';
  for (let i = 0; i < 40 && !found; i++) {
    await page.waitForTimeout(500);
    try {
      for (const f of readdirSync(dir)) {
        const full = join(dir, f);
        if (statSync(full).mtimeMs < started) continue;
        const text = readFileSync(full, 'utf8');
        if (text.includes(`Subject: Invoice ${number} from Field Office`)) found = text;
      }
    } catch {
      // The mailbox folder appears with the first email.
    }
  }
  expect(found).toContain('To: accounts@client.example');
  expect(found).toContain(`filename="${number}.pdf"`);
  await page.reload();
  await expect(page.getByText('Sent').first()).toBeVisible();
});
