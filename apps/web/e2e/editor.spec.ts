import { expect, test } from '@playwright/test';
import { addClient, signUpAndOnboard } from './helpers';

test('on a phone, finished lines fold to one row and open again when tapped', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Lines fold on phones only.');
  await signUpAndOnboard(page, 'Fold Studio');
  await addClient(page, 'Wren Bakery');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Wren Bakery' });
  await page.getByLabel('Line 1 description').fill('Menu design');
  await page.getByLabel('Line 1 price').fill('300');
  await page.getByRole('button', { name: 'Add a line' }).click();
  await page.getByLabel('Line 2 description').fill('Printing');
  await page.getByLabel('Line 2 price').fill('120');

  const folded = page.getByRole('button', { name: /Edit line 1/ });
  await expect(folded).toBeVisible();
  await expect(folded).toContainText('£300.00');
  await expect(page.getByLabel('Line 1 description')).toBeHidden();

  await folded.click();
  await expect(page.getByLabel('Line 1 description')).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit line 2/ })).toBeVisible();

  // A line with something to fix stays open.
  await page.getByLabel('Line 1 price').fill('');
  await page.getByRole('button', { name: /Edit line 2/ }).click();
  await expect(page.getByLabel('Line 1 description')).toBeVisible();
});

test('on a wide screen, every line stays open', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Checks the wide layout.');
  await signUpAndOnboard(page, 'Open Studio');
  await addClient(page, 'Wren Bakery');
  await page.goto('/invoices/new');
  await page.getByLabel('Line 1 description').fill('Menu design');
  await page.getByLabel('Line 1 price').fill('300');
  await page.getByRole('button', { name: 'Add a line' }).click();
  await expect(page.getByLabel('Line 1 description')).toBeVisible();
  await expect(page.getByRole('button', { name: /Edit line 1/ })).toBeHidden();
});

test('a UK VAT invoice in euros asks for the rate to pounds and prints the VAT in sterling', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Euro Studio', { vat: true });
  await page.goto('/clients/new');
  await page.fill('#c-name', 'Lyon Ateliers SARL');
  await page.fill('#c-email', 'compta@lyon.example');
  await page.selectOption('#c-currency', 'EUR');
  await page.getByRole('button', { name: 'Save client' }).click();
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);

  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Lyon Ateliers SARL' });
  await page.getByLabel('Line 1 description').fill('Brand workshop');
  await page.getByLabel('Line 1 price').fill('100');
  await expect(page.getByLabel('Exchange rate: EUR to £1')).toBeVisible();
  await expect(page.getByRole('link', { name: /\w+ \d{4}/ })).toHaveAttribute(
    'href',
    /trade-tariff\.service\.gov\.uk\/exchange_rates\/view\/\d{4}-\d{1,2}$/,
  );

  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await expect(page.getByText('Enter the rate before issuing.')).toBeVisible();

  await page.fill('#e-sterling-rate', '1.15');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  // €20.00 of VAT at €1.15 to £1 is £17.39.
  const frame = page.frameLocator('iframe').first();
  await expect(frame.getByText('VAT in sterling').first()).toBeVisible();
  await expect(frame.getByText('£17.39')).toBeVisible();
  await expect(frame.getByText(/£1 = 1\.1500 EUR, HMRC period rate for/)).toBeVisible();
});

test('a rate entered for euros is cleared and asked for again when the invoice moves to yen', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Two Currency Studio', { vat: true });
  for (const [name, currency] of [
    ['Lyon Ateliers SARL', 'EUR'],
    ['Kyoto Prints KK', 'JPY'],
  ] as const) {
    await page.goto('/clients/new');
    await page.fill('#c-name', name);
    await page.fill('#c-email', `accounts@${currency.toLowerCase()}.example`);
    await page.selectOption('#c-currency', currency);
    await page.getByRole('button', { name: 'Save client' }).click();
    await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);
  }
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Lyon Ateliers SARL' });
  await page.getByLabel('Line 1 description').fill('Print run');
  await page.getByLabel('Line 1 price').fill('100.00');
  await page.fill('#e-sterling-rate', '1.15');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();

  await page.getByLabel('Bill to').selectOption({ label: 'Kyoto Prints KK' });
  await expect(page.getByLabel('Line 1 price')).toHaveValue('100');
  await expect(page.locator('#e-sterling-rate')).toHaveValue('');
  await expect(
    page.getByText('The exchange rate was entered for EUR. Enter the rate for JPY.'),
  ).toBeVisible();
  await page.fill('#e-sterling-rate', '190.25');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  await expect(
    page
      .frameLocator('iframe')
      .first()
      .getByText(/£1 = 190\.2500 JPY/),
  ).toBeVisible();
});
