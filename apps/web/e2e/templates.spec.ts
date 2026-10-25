import { expect, test } from '@playwright/test';
import { signUpAndOnboard } from './helpers';

/** Acceptance criteria 11 and 12 of docs/specs/invoice-templates.md. */

const RANGE = [
  'signature',
  'sticker',
  'riso',
  'marquee',
  'atelier',
  'bloom',
  'mark',
  'billboard',
  'grid',
  'trade',
  'statement',
  'practice',
  'heritage',
  'letter',
  'ticket',
];

test('the picker offers the fifteen, filters by kind and feel, and the choice is saved and offered in the editor', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Picker Studio');
  await page.goto('/settings');
  const picker = page.getByRole('group', { name: 'Template', exact: true });
  const choices = picker.locator('input[name="template"]');
  const shown = () => choices.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  await expect.poll(shown).toEqual(RANGE);

  const kind = picker.getByRole('group', { name: 'Kind of business' });
  const feel = picker.getByRole('group', { name: 'Feel' });
  await kind.getByRole('radio', { name: 'Trades' }).check();
  await expect.poll(shown).toEqual(['signature', 'trade']);
  await feel.getByRole('radio', { name: 'Grounded' }).check();
  await expect.poll(shown).toEqual(['trade']);
  await feel.getByRole('radio', { name: 'Playful' }).check();
  await expect.poll(shown).toEqual([]);
  await expect(picker.getByText('No template matches both filters.')).toBeVisible();
  await kind.getByRole('radio', { name: 'All' }).check();
  await expect.poll(shown).toEqual(['sticker', 'riso', 'marquee', 'billboard', 'ticket']);
  await feel.getByRole('radio', { name: 'Grounded' }).check();
  await expect.poll(shown).toEqual(['trade', 'statement', 'practice', 'heritage']);

  await picker.locator('label', { hasText: 'Statement' }).click();
  await expect(picker.locator('input[name="template"]:checked')).toHaveValue('statement');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText(/Settings saved\./)).toBeVisible();
  await page.reload();
  await expect(page.locator('input[name="template"]:checked')).toHaveValue('statement');

  await page.goto('/invoices/new');
  const options = page.locator('#e-template option');
  await expect
    .poll(() => options.evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value)))
    .toEqual(RANGE);
  await expect(page.locator('#e-template')).toHaveValue('statement');
});

test('the second colour and what sits behind the logo are named for screen readers and reachable by keyboard', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Named Settings');
  await page.goto('/settings');
  const second = page.getByRole('group', { name: 'Second colour' });
  await expect(second.getByRole('radio', { name: 'Automatic, from your brand colour' })).toBeChecked();
  await expect(second.getByLabel('Your second colour')).toBeVisible();
  const ground = page.getByRole('group', { name: 'Behind your logo' });
  for (const name of ['Nothing', 'White', 'Cream', 'Black']) {
    await expect(ground.getByRole('radio', { name })).toBeAttached();
  }
  await expect(ground.getByRole('radio', { name: 'White' })).toBeChecked();
  await ground.getByRole('radio', { name: 'White' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(ground.getByRole('radio', { name: 'Cream' })).toBeChecked();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText(/Settings saved\./)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('group', { name: 'Behind your logo' }).getByRole('radio', { name: 'Cream' }),
  ).toBeChecked();
});
