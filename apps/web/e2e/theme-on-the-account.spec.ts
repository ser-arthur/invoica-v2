import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { signIn, signUpAndOnboard } from './helpers';

// docs/specs/theme-on-the-account.md, acceptance criteria 6 to 8.

const NIGHT = 'rgb(9, 25, 28)';
const LIGHT = 'rgb(236, 239, 237)';

const shown = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);

/** The sign-in page's ground: the first colour behind its form. */
const groundOf = (page: Page) =>
  page.locator('main').evaluate((el) => {
    for (let at: Element | null = el; at; at = at.parentElement) {
      const bg = getComputedStyle(at).backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)') return bg;
    }
    return '';
  });

const remembered = async (context: BrowserContext) =>
  (await context.cookies()).find((c) => c.name === 'invoica_theme')?.value ?? null;

/** Opens the account menu, unless it is open already (it stays open after choosing a theme). */
async function openMenu(page: Page) {
  const menu = page.locator('details:has(> summary[aria-label="Account and settings"])');
  if (!(await menu.evaluate((d) => (d as HTMLDetailsElement).open)))
    await page.getByLabel('Account and settings').click();
}

async function choose(page: Page, theme: 'light' | 'dark' | 'system') {
  await openMenu(page);
  const group = page.getByRole('group', { name: 'Appearance' });
  await group.getByRole('button', { name: theme }).click();
  await expect(group.getByRole('button', { name: theme })).toHaveAttribute('aria-pressed', 'true');
}

async function signOut(page: Page) {
  await openMenu(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/sign-in');
}

test('Dark chosen on one device opens the app in Night on another, which then remembers it (6, 7)', async ({
  page,
  context,
  browser,
}) => {
  const email = await signUpAndOnboard(page, 'Night Owl Studio');
  await choose(page, 'dark');
  await expect.poll(() => shown(page)).toBe('dark');

  // A second device, never signed in on: the light sign-in.
  const second = await browser.newContext({ viewport: page.viewportSize() });
  const phone = await second.newPage();
  await phone.goto('/sign-in');
  expect(await shown(phone)).toBe('light');
  expect(await groundOf(phone)).toBe(LIGHT);
  expect(await remembered(second)).toBeNull();

  // Signing in there opens the app in Night, and the device remembers it.
  await signIn(phone, email);
  expect(await shown(phone)).toBe('dark');
  await expect
    .poll(() => remembered(second), { message: 'the second device remembers the account’s theme' })
    .toBe('dark');
  await openMenu(phone);
  await expect(
    phone.getByRole('group', { name: 'Appearance' }).getByRole('button', { name: 'dark' }),
  ).toHaveAttribute('aria-pressed', 'true');

  // Signed out, its sign-in page is Night, as it is after opening it again.
  await signOut(phone);
  expect(await shown(phone)).toBe('dark');
  await phone.reload();
  expect(await shown(phone)).toBe('dark');
  expect(await groundOf(phone)).toBe(NIGHT);

  // Light chosen on the second device shows on the first when a page of the app next opens there.
  await signIn(phone, email);
  await choose(phone, 'light');
  await expect.poll(() => shown(phone)).toBe('light');
  await second.close();

  expect(await remembered(context)).toBe('dark');
  await page.goto('/invoices');
  expect(await shown(page)).toBe('light');
  await expect.poll(() => remembered(context), { message: 'the first device catches up' }).toBe('light');
});

test('System on the account follows each device’s own setting (8)', async ({ page, browser }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const email = await signUpAndOnboard(page, 'Twilight Works');
  await choose(page, 'system');
  await expect.poll(() => shown(page)).toBe('dark');

  const second = await browser.newContext({ viewport: page.viewportSize(), colorScheme: 'light' });
  const laptop = await second.newPage();
  await signIn(laptop, email);
  expect(await shown(laptop)).toBe('light');
  await expect.poll(() => remembered(second)).toBe('system');

  await laptop.emulateMedia({ colorScheme: 'dark' });
  await laptop.reload();
  expect(await shown(laptop)).toBe('dark');
  await second.close();
});
