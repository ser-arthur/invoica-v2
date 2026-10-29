import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addClient, choose, confirmAndSignIn, signUp, signUpAndOnboard, uniqueEmail } from './helpers';
import { linkIn, waitForEmail } from './mailbox';

// docs/specs/form-errors-and-controls.md, "Invoica's own controls", acceptance criteria 7 to 14.

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** What the browser would draw itself on this page: selects, date and colour inputs, and undrawn ticks and dots. */
async function browserControls(page: Page) {
  return page.evaluate(() => {
    const found: string[] = [];
    for (const el of document.querySelectorAll('select')) found.push(`select#${el.id}`);
    for (const el of document.querySelectorAll<HTMLInputElement>('input[type="date"], input[type="color"]'))
      found.push(`input[type=${el.type}]#${el.id}`);
    // A form the browser would check itself, with its own bubbles ("Please fill out this field").
    for (const form of document.querySelectorAll('form:not([novalidate])')) {
      if (form.querySelector('[required], input[type="email"], [pattern], [min], [max], [minlength]'))
        found.push(`form checked by the browser: ${form.getAttribute('action') ?? 'form'}`);
    }
    for (const el of document.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"], input[type="radio"]',
    )) {
      const box = el.getBoundingClientRect();
      if (box.width > 2 && getComputedStyle(el).appearance !== 'none')
        found.push(`${el.type} ${el.name || el.id}`);
    }
    return found;
  });
}

async function issueFor(page: Page, client: string) {
  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: client });
  await page.getByLabel('Line 1 description').fill('Survey');
  await page.getByLabel('Line 1 price').fill('480');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  return page.url().replace('?issued=1', '');
}

test('no page of the app holds a control the browser draws itself (7)', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'The same pages at one width.');
  // Onboarding first, from a new account.
  const email = uniqueEmail('controls');
  const started = Date.now();
  await signUp(page, email);
  await confirmAndSignIn(
    page,
    email,
    linkIn(await waitForEmail(email, 'Confirm your email for Invoica', started)),
  );
  expect(await browserControls(page), '/onboarding').toEqual([]);
  await page.fill('#name', 'Control Room Studio');
  await page.getByRole('button', { name: 'Continue to Invoica' }).click();
  await page.waitForURL('**/dashboard**');

  await addClient(page, 'Granary Lane Ltd');
  for (const path of [
    '/dashboard',
    '/invoices',
    '/invoices/new',
    '/clients',
    '/clients/new',
    '/items',
    '/settings',
  ]) {
    await page.goto(path);
    expect(await browserControls(page), path).toEqual([]);
  }
  const invoice = await issueFor(page, 'Granary Lane Ltd');
  for (const opener of ['Record payment', 'Credit note']) {
    await page.goto(invoice);
    await page.getByRole('button', { name: opener }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await browserControls(page), opener).toEqual([]);
  }
});

test('no form on the website or the sign-in pages leaves checking to the browser (7)', async ({ page }) => {
  for (const path of ['/', '/pricing', '/templates', '/sign-in', '/sign-up', '/forgot-password']) {
    await page.goto(path);
    const forms = await page.evaluate(() =>
      [...document.querySelectorAll('form:not([novalidate])')]
        .filter((f) =>
          f.querySelector('[required], input[type="email"], [pattern], [min], [max], [minlength]'),
        )
        .map((f) => f.getAttribute('action') ?? 'form'),
    );
    expect(forms, path).toEqual([]);
  }
});

test('Bill to opens with a click or the keyboard, chooses, and Escape leaves it as it was (8)', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Keyboard Works');
  await addClient(page, 'Alder Print Ltd');
  await addClient(page, 'Birch Bindery Ltd');
  await page.goto('/invoices/new');
  // By its id: while it is open, its list carries the field's name too.
  const field = page.locator('#e-client');
  await expect(field).toHaveAccessibleName('Bill to');
  await expect(field).toHaveAttribute('role', 'combobox');
  const listId = (await field.getAttribute('aria-controls'))!;
  const list = page.locator(`[id="${listId}"]`);

  await field.click();
  await expect(list).toBeVisible();
  await expect(list.getByRole('option', { name: 'Alder Print Ltd' })).toBeVisible();
  await list.getByRole('option', { name: 'Birch Bindery Ltd' }).click();
  await expect(list).toBeHidden();
  await expect(field).toHaveText('Birch Bindery Ltd');

  // The keyboard: Down opens, typing jumps, Enter chooses.
  await field.focus();
  await page.keyboard.press('ArrowDown');
  await expect(list).toBeVisible();
  await expect(field).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.type('al');
  await expect(list.locator('[data-active]')).toHaveText('Alder Print Ltd');
  await page.keyboard.press('Enter');
  await expect(list).toBeHidden();
  await expect(field).toHaveText('Alder Print Ltd');
  await expect(field).toBeFocused();

  // Escape closes it and changes nothing.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(field).toHaveText('Alder Print Ltd');
  await expect(field).toBeFocused();
});

test('a long list searches as you type: Ghana chosen from the countries is saved (9)', async ({ page }) => {
  await signUpAndOnboard(page, 'Search Party');
  await page.goto('/settings');
  const country = page.locator('#s-country');
  const list = page.locator(`[id="${await country.getAttribute('aria-controls')}"]`);
  await country.click();
  const search = page.getByRole('combobox', { name: 'Search the list' });
  await expect(search).toBeFocused();
  await search.fill('gha');
  await expect(list.getByRole('option')).toHaveText(['Ghana']);
  await search.fill('zzz');
  await expect(list).toContainText('No matches');
  await search.fill('gha');
  await page.keyboard.press('Enter');
  await expect(country).toHaveText('Ghana');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved.')).toBeVisible();
  await page.reload();
  await expect(page.locator('#s-country')).toHaveAttribute('data-value', 'GH');
});

test('on a phone a dropdown opens as a sheet at the foot of the screen, named for its field (10)', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'phone', 'Phones only.');
  await signUpAndOnboard(page, 'Sheet Music Ltd');
  await page.goto('/settings');
  const field = page.locator('#s-type');
  const panel = page.locator(`[id="${await field.getAttribute('aria-controls')}"]`).locator('xpath=..');
  await field.click();
  await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBe(0);
  expect(box.width).toBe(viewport.width);
  expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThanOrEqual(1);
  await expect(panel).toContainText('Kind of business');
  await page.mouse.click(viewport.width / 2, 60);
  await expect(panel).toBeHidden();
});

test('a due date chosen in the calendar shows as a date and is saved; a typed one too (11)', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Calendar House');
  await addClient(page, 'Cedar Row Ltd');
  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Cedar Row Ltd' });
  await page.getByLabel('Line 1 description').fill('Plans');
  await page.getByLabel('Line 1 price').fill('120');
  const due = page.locator('#e-due');

  await page.getByRole('button', { name: 'Choose due date from a calendar' }).click();
  const calendar = page.getByRole('dialog', { name: 'Due date' });
  await expect(calendar).toBeVisible();
  const before = (await due.getAttribute('data-value'))!;
  // The day in focus is the date chosen; the arrows move it.
  await expect(calendar.locator(`[data-date="${before}"]`)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(calendar).toBeHidden();
  await expect(due).toHaveAttribute('data-value', before);

  await page.getByRole('button', { name: 'Choose due date from a calendar' }).click();
  await page.keyboard.press('PageDown');
  await page.keyboard.press('Home');
  const chosen = (await calendar.locator('[role="gridcell"]:focus').getAttribute('data-date'))!;
  await page.keyboard.press('Enter');
  await expect(calendar).toBeHidden();
  await expect(due).toHaveAttribute('data-value', chosen);
  const [y, m, d] = chosen.split('-').map(Number);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m! - 1];
  await expect(due).toHaveValue(`${d} ${month} ${y}`);

  // Typed, day first.
  await due.fill('31/12/2026');
  await due.blur();
  await expect(due).toHaveValue('31 Dec 2026');
  await expect(due).toHaveAttribute('data-value', '2026-12-31');
  await due.fill('31/02/2026');
  await due.blur();
  await expect(due).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Enter a date, like 31/12/2026.')).toBeVisible();
  await due.fill('31 December 2026');
  await due.blur();
  await expect(page.getByText('Enter a date, like 31/12/2026.')).toHaveCount(0);

  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\/edit/);
  await page.reload();
  await expect(page.locator('#e-due')).toHaveValue('31 Dec 2026');
});

test('a payment cannot be dated after today in the calendar (11)', async ({ page }) => {
  await signUpAndOnboard(page, 'No Tomorrow Ltd');
  await addClient(page, 'Ferry Lane Ltd');
  const invoice = await issueFor(page, 'Ferry Lane Ltd');
  await page.goto(invoice);
  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.getByRole('button', { name: 'Choose received on from a calendar' }).click();
  const calendar = page.getByRole('dialog', { name: 'Received on' });
  await expect(calendar).toBeVisible();
  const today = (await page.locator('#pay-date').getAttribute('data-max'))!;
  await expect(calendar.locator(`[data-date="${today}"]`)).toBeFocused();
  await expect(calendar.locator(`[data-date="${today}"]`)).toHaveAttribute('aria-current', 'date');
  // Tomorrow is shown, and refused.
  await page.keyboard.press('ArrowRight');
  await expect(calendar.locator('[role="gridcell"]:focus')).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(calendar).toBeVisible();
  await expect(page.locator('#pay-date')).toHaveAttribute('data-value', today);
});

test('the brand colour chosen from the picker, or typed as a code, is saved (12)', async ({ page }) => {
  await signUpAndOnboard(page, 'Colour Field Co');
  await page.goto('/settings');
  const swatch = page.locator('#s-colour');
  await swatch.click();
  const picker = page.getByRole('dialog', { name: 'Brand colour' });
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: 'Navy' }).click();
  await expect(swatch).toHaveAttribute('data-value', '#1d3c5a');
  await expect(page.getByLabel('Brand colour code')).toHaveValue('#1d3c5a');
  // The hue strip moves with the arrow keys.
  await picker.getByRole('slider', { name: 'Hue' }).focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(swatch).not.toHaveAttribute('data-value', '#1d3c5a');
  await picker.getByLabel('Code').fill('#5b2a4e');
  await expect(swatch).toHaveAttribute('data-value', '#5b2a4e');
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved.')).toBeVisible();
  await page.reload();
  await expect(page.locator('#s-colour')).toHaveAttribute('data-value', '#5b2a4e');
});

test('the dropdown, the calendar and the colour picker open pass the accessibility checks, light and dark (13)', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'desktop', 'Checked at one width.');
  await signUpAndOnboard(page, 'Open Panels Ltd');
  let examined = 0;
  for (const theme of ['light', 'dark']) {
    await page.context().addCookies([{ name: 'invoica_theme', value: theme, url: page.url() }]);
    for (const [path, open, name] of [
      ['/settings', () => page.locator('#s-country').click(), 'dropdown'],
      ['/settings', () => page.locator('#s-colour').click(), 'colour picker'],
      [
        '/invoices/new',
        () => page.getByRole('button', { name: 'Choose due date from a calendar' }).click(),
        'calendar',
      ],
    ] as const) {
      await page.goto(path);
      await open();
      await page.waitForTimeout(300);
      const result = await new AxeBuilder({ page }).withTags(TAGS).exclude('iframe').analyze();
      examined += 1;
      expect(
        result.violations.map(
          (v) => `${theme} ${name}: ${v.id} at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([]);
    }
  }
  expect(examined).toBe(6);
});

test('inside a dialog, Escape closes an open dropdown and leaves the dialog open (14)', async ({ page }) => {
  await signUpAndOnboard(page, 'Escape Velocity Ltd');
  await addClient(page, 'Harbour Mill Ltd');
  const invoice = await issueFor(page, 'Harbour Mill Ltd');
  await page.goto(invoice);
  await page.getByRole('button', { name: 'Record payment' }).click();
  const method = page.locator('#pay-method');
  const list = page.locator(`[id="${await method.getAttribute('aria-controls')}"]`);
  await method.click();
  await expect(list).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(page.getByRole('dialog').first()).toBeVisible();
  await choose(method, { label: 'Cash' });
  await expect(method).toHaveText('Cash');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
