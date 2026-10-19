import { expect, test } from '@playwright/test';
import { addClient, signUpAndOnboard, watchErrors } from './helpers';

test('from the invoice list: mark an invoice as sent and record a payment without opening it', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await signUpAndOnboard(page, 'Quick Studio');
  await addClient(page, 'Wren Bakery');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Wren Bakery' });
  await page.getByLabel('Line 1 description').fill('Menu design');
  await page.getByLabel('Line 1 price').fill('300');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);

  await page.goto('/invoices');
  const actions = page.getByRole('button', { name: 'Actions for INV-0001' });
  await actions.click();
  await page.getByRole('button', { name: 'Mark as sent' }).click();
  await expect(page.getByText('Sent', { exact: true }).filter({ visible: true })).toHaveCount(1);

  await actions.click();
  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.fill('#pay-amount', '120');
  await page.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('£180.00 left').filter({ visible: true })).toHaveCount(1);

  // Escape closes the actions and returns focus to their button.
  await actions.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Duplicate' })).toHaveCount(0);
  await expect(actions).toBeFocused();
  expect(errors).toEqual([]);
});
