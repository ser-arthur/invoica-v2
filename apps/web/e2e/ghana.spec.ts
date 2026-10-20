import { expect, test } from '@playwright/test';
import { addClient, confirmAndSignIn, signUp, uniqueEmail, watchErrors } from './helpers';
import { linkIn, waitForEmail } from './mailbox';

/**
 * A VAT-registered business in Ghana, as it will really work: cedis, VAT with NHIL and GETFund Levy on the
 * standard code, a part payment by mobile money, and the rest settled with a credit note.
 */

test.skip(({ isMobile }) => isMobile, 'The flow is the same at every width.');

test('a Ghana business invoices in cedis with VAT, NHIL and GETFund Levy, is part paid by mobile money and settles', async ({
  page,
}) => {
  const errors = watchErrors(page);
  const email = uniqueEmail('ghana');
  const started = Date.now();
  await signUp(page, email);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await confirmAndSignIn(
    page,
    email,
    linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started)),
  );
  await page.fill('#name', 'Osu Craft Works');
  await page.getByLabel('Country').selectOption({ label: 'Ghana' });
  await expect(page.getByLabel('Main currency')).toHaveValue('GHS');
  await expect(page.getByLabel('Time zone')).toHaveValue('Africa/Accra');
  await page.getByLabel('I am registered for VAT').check();
  await page.fill('#taxNumber', 'C0000000001');
  await page.getByRole('button', { name: 'Continue to Invoica' }).click();
  await page.waitForURL('**/dashboard**');

  await addClient(page, 'Labadi Textiles Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Labadi Textiles Ltd' });
  await page.getByLabel('Line 1 description').fill('Kente weaving, ten pieces');
  await page.getByLabel('Line 1 price').fill('1,000');
  // GH₵1,000.00 plus NHIL 2.5%, GETFund Levy 2.5% and VAT 15%: GH₵1,200.00.
  await expect(page.getByText(/1,200\.00/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  const invoice = page.url().replace('?issued=1', '');
  const doc = page.frameLocator('iframe').first();
  await expect(doc.getByText('NHIL').first()).toBeVisible();
  await expect(doc.getByText(/GETFund/).first()).toBeVisible();
  await expect(doc.getByText(/1,200\.00/).first()).toBeVisible();
  const pdf = await page.request.get(`${invoice}/pdf`);
  expect([pdf.status(), pdf.headers()['content-type']]).toEqual([200, 'application/pdf']);

  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.fill('#pay-amount', '500');
  await page.selectOption('#pay-method', 'mobile_money');
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Part paid');
  await expect(page.getByText(/Mobile money/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Credit note' }).click();
  await page.locator('#cn-mode').selectOption('balance');
  await page.fill('#cn-reason', 'Two pieces not delivered; the rest written off as agreed.');
  await page.getByRole('dialog').getByRole('button', { name: 'Issue credit note' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CN-0001');
  const note = page.frameLocator('iframe').first();
  await expect(note.getByText('Total before taxes').first()).toBeVisible();
  await expect(note.getByText(/700\.00/).first()).toBeVisible();
  await page.goto(invoice);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Settled');
  expect(errors).toEqual([]);
});
