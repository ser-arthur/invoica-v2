import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addClient, signUpAndOnboard } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('public pages have no automated accessibility violations', async ({ page }) => {
  for (const path of [
    '/',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password?error=INVALID_TOKEN',
    '/confirm-email',
    '/no-such-page',
  ]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(result.violations.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
  }
});

test('app pages have no automated accessibility violations, in light and dark', async ({ page }) => {
  await signUpAndOnboard(page, 'Field Office', { vat: true });
  await addClient(page, 'Mara Linden Ceramics');
  const paths = [
    '/dashboard',
    '/invoices',
    '/clients',
    '/items',
    '/settings',
    '/invoices/new',
    '/invoices/00000000-0000-4000-8000-000000000000',
  ];
  let examined = 0;
  for (const theme of ['light', 'dark']) {
    await page.context().addCookies([{ name: 'invoica_theme', value: theme, url: page.url() }]);
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const result = await new AxeBuilder({ page }).withTags(TAGS).exclude('iframe').analyze();
      examined += 1;
      expect(
        result.violations.map(
          (v) =>
            `${theme} ${path}: ${v.id} ${v.nodes
              .map((n) => n.target.join(' '))
              .slice(0, 3)
              .join(', ')}`,
        ),
      ).toEqual([]);
    }
  }
  expect(examined).toBe(paths.length * 2);
});

test('no page scrolls sideways at phone widths, and nothing is cut off at the edge', async ({ page }) => {
  await signUpAndOnboard(page, 'A business with a rather long name for testing layouts');
  // An address with no place to break it, as some are.
  await addClient(
    page,
    'Aura Coffee Roasters and Bakery Limited',
    'accountspayable@auracoffeeroastersandbakerylimitedcompany.example',
  );
  const clientPage = new URL(page.url()).pathname;
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Aura Coffee Roasters and Bakery Limited' });
  await page.getByLabel('Line 1 description').fill('Roasting equipment servicing for the winter season');
  await page.getByLabel('Line 1 price').fill('1250');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  const invoicePage = new URL(page.url()).pathname;
  const paths = [
    '/dashboard',
    '/invoices',
    '/clients',
    clientPage,
    '/clients/new',
    '/items',
    '/settings',
    '/invoices/new',
    invoicePage,
  ];
  let examined = 0;
  for (const width of [320, 360, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of paths) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      examined += 1;
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
      // Text that reaches past the right edge of the screen is cut off, unless it sits in a strip that scrolls.
      const cut = await page.evaluate(() => {
        const scrolls = (el: Element | null): boolean => {
          for (let e = el; e; e = e.parentElement) {
            const o = getComputedStyle(e).overflowX;
            if (o === 'auto' || o === 'scroll') return true;
          }
          return false;
        };
        return [...document.querySelectorAll('main *')]
          .filter((el) => el.childElementCount === 0 && (el.textContent ?? '').trim())
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !scrolls(el))
          .map((el) => (el.textContent ?? '').trim().slice(0, 40));
      });
      expect(cut, `${path} at ${width}px`).toEqual([]);
    }
  }
  expect(examined).toBe(45);
});

test('open dialogs have no automated accessibility violations, in light and dark', async ({ page }) => {
  await signUpAndOnboard(page, 'Dialog Office', { vat: true });
  await addClient(page, 'Marlow Joinery');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Marlow Joinery' });
  await page.getByLabel('Line 1 description').fill('Fitting');
  await page.getByLabel('Line 1 price').fill('250');
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);
  const invoice = page.url().replace('?issued=1', '');
  let examined = 0;
  for (const theme of ['light', 'dark']) {
    await page.context().addCookies([{ name: 'invoica_theme', value: theme, url: page.url() }]);
    for (const opener of ['Record payment', 'Credit note']) {
      await page.goto(invoice);
      await page.getByRole('button', { name: opener }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      const result = await new AxeBuilder({ page }).withTags(TAGS).exclude('iframe').analyze();
      examined += 1;
      expect(
        result.violations.map(
          (v) => `${theme} ${opener}: ${v.id} at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([]);
    }
  }
  expect(examined).toBe(4);
});

test('the leave dialog and the notice at the foot of the screen have no automated accessibility violations', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Notice Office', { vat: true });
  await addClient(page, 'Thimble Lane Ltd');
  await page.goto('/invoices/new');
  await page.getByLabel('Bill to').selectOption({ label: 'Thimble Lane Ltd' });
  await page.getByLabel('Line 1 description').fill('Fitting');
  await page.getByLabel('Line 1 price').fill('250');
  await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: 'Clients' }).click({
    force: true,
  });
  await expect(page.getByRole('dialog', { name: 'Leave this invoice?' })).toBeVisible();
  const leaving = await new AxeBuilder({ page }).withTags(TAGS).exclude('iframe').analyze();
  expect(leaving.violations.map((v) => `leave: ${v.id}`)).toEqual([]);
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\?issued=1/);
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Mark as sent' }).click();
  await expect(page.getByText(/could not be reached/)).toBeVisible();
  await page.context().setOffline(false);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    const notice = await new AxeBuilder({ page }).withTags(TAGS).exclude('iframe').analyze();
    expect(notice.violations.map((v) => `${theme} notice: ${v.id}`)).toEqual([]);
  }
});
