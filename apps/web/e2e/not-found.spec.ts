import { expect, test } from '@playwright/test';
import { PLANNED_PAGES } from '../src/components/site/planned-pages';
import { signUpAndOnboard } from './helpers';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('an address with no page answers 404, in the site’s own look, with a way home', async ({ page }) => {
  for (const path of ['/no-such-page', '/pricing/extra', '/not/here/at-all']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('There is no page at this address.');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  }
  await page.getByRole('main').getByRole('link', { name: 'Go to the home page' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Every invoice, all the way to paid.');
});

test('a planned page not written yet answers 404 and says what it will hold', async ({ page }) => {
  expect(PLANNED_PAGES.length).toBeGreaterThan(0);
  for (const planned of PLANNED_PAGES) {
    const response = await page.goto(planned.href);
    expect(response?.status(), planned.href).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(planned.heading);
    await expect(page.getByRole('main').getByText(planned.about)).toBeVisible();
  }
});

test('the footer’s About link opens the About page’s notice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'About', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/about');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The About page is being written.');
});

test('signed in, the not-found page leads back to the dashboard', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The same at every width.');
  await signUpAndOnboard(page, 'Lost Address Studio');
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  // The header leads to the dashboard too, here and on the pricing page.
  await expect(page.getByRole('banner').getByRole('link', { name: 'Your dashboard' })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Create free account' })).toHaveCount(0);
  await page.getByRole('main').getByRole('link', { name: 'Go to your dashboard' }).click();
  await page.waitForURL('**/dashboard');
  await page.goto('/pricing');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Your dashboard' })).toHaveAttribute(
    'href',
    '/dashboard',
  );
});

test('the words in a wrong address are never shown on the page', async ({ page }) => {
  await page.goto('/your-account-is-locked-call-this-number');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('There is no page at this address.');
  expect(await page.locator('body').innerText()).not.toMatch(/locked|this-number/i);
});

test('the not-found page never scrolls sideways on a phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Phone widths only.');
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/no-such-page', '/about']) {
      await page.goto(path);
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll, `${path} at ${width} pixels`).toBeLessThanOrEqual(client);
    }
  }
});
