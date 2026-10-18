import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { addClient, signUpAndOnboard } from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('public pages have no automated accessibility violations', async ({ page }) => {
  for (const path of ['/', '/sign-in', '/sign-up']) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(result.violations.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
  }
});

test('app pages have no automated accessibility violations, in light and dark', async ({ page }) => {
  await signUpAndOnboard(page, 'Field Office', { vat: true });
  await addClient(page, 'Mara Linden Ceramics');
  const paths = ['/dashboard', '/invoices', '/clients', '/items', '/settings', '/invoices/new'];
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

test('no page scrolls sideways at phone widths', async ({ page }) => {
  await signUpAndOnboard(page, 'A business with a rather long name for testing layouts');
  const paths = [
    '/dashboard',
    '/invoices',
    '/clients',
    '/clients/new',
    '/items',
    '/settings',
    '/invoices/new',
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
    }
  }
  expect(examined).toBe(35);
});
