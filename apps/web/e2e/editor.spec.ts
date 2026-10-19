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
