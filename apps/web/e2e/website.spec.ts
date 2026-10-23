import { expect, test } from '@playwright/test';
import { creaseSegment } from '../src/components/site/fold';
import { signUpAndOnboard } from './helpers';

// docs/specs/website.md

// The site's checks measure the page at rest: its motion stops for visitors who ask for less of it.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('the home page leads with one headline, and every way in goes to sign-up or sign-in', async ({
  page,
}) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveAccessibleName('Every invoice, all the way to paid.');

  const create = page.getByRole('link', { name: /^Create (your )?free account$/ });
  expect(await create.count()).toBeGreaterThanOrEqual(2);
  for (const link of await create.all()) await expect(link).toHaveAttribute('href', '/sign-up');
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toHaveAttribute('href', '/sign-in');
});

test('the money-in chart is announced month by month', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('img', {
      name: /May £4,200.*June £6,850.*July £5,100.*August £7,420.*September £6,300.*October so far £7,610/,
    }),
  ).toBeAttached();
});

test('the email on the tear-off slip arrives filled in on the sign-up form', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your email').fill('new.owner@lindenrowe.example');
  await page.getByRole('button', { name: 'Create your free account' }).click();
  await page.waitForURL(/\/sign-up\?email=/);
  await expect(page.locator('#email')).toHaveValue('new.owner@lindenrowe.example');

  await page.goto('/sign-up?email=not%20an%20email');
  await expect(page.locator('#email')).toHaveValue('');
});

test('the home page never scrolls sideways on a phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, `at ${width} pixels`).toBeLessThanOrEqual(client);
  }
});

test('signed in, the home page opens the dashboard', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The same at every width.');
  await signUpAndOnboard(page, 'Home Page Studio');
  await page.goto('/');
  await page.waitForURL('**/dashboard');
});

test('the crease crosses the headline and nothing else in the hero, at every width', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'The widths are set in the test.');
  for (const width of [1920, 1440, 1180, 1024, 961, 800, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const heading = page.getByRole('heading', { level: 1 });
    const box = await heading.locator('xpath=..').boundingBox();
    expect(box).not.toBeNull();
    const { from, to } = creaseSegment(box!);
    const yAt = (x: number) => from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x);
    const hero = page.locator('main section').first();
    const others = [
      hero.getByText('Look established from day one'),
      hero.getByRole('link', { name: 'Create your free account' }),
      hero.getByRole('link', { name: 'How it works' }),
      hero.getByText('For new businesses'),
      hero.getByText('No card needed'),
    ];
    for (const other of others) {
      const b = (await other.boundingBox())!;
      const name = await other.textContent();
      for (let x = Math.max(b.x, to.x); x <= Math.min(b.x + b.width, from.x); x += 2) {
        const y = yAt(x);
        const clear = y < b.y - 8 || y > b.y + b.height + 8;
        expect(clear, `${name} at ${width} pixels`).toBe(true);
      }
    }
    const h = (await heading.boundingBox())!;
    const crosses = [h.x + h.width * 0.3, h.x + h.width * 0.6].some(
      (x) => yAt(x) > h.y && yAt(x) < h.y + h.height,
    );
    expect(crosses, `the headline at ${width} pixels`).toBe(true);
  }
});

test('the footer carries the planned pages and the ways in', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  const planned: [string, string][] = [
    ['About', '/about'],
    ['Contact', '/contact'],
    ['Help centre', '/help'],
    ['Getting started', '/help/getting-started'],
    ['Privacy', '/privacy'],
    ['Terms', '/terms'],
    ['Cookies', '/cookies'],
    ['Pricing', '/pricing'],
    ['Sign in', '/sign-in'],
    ['Create free account', '/sign-up'],
  ];
  for (const [name, href] of planned) {
    await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
});

test('the header stays in view while the page scrolls under it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 2400));
  const banner = page.getByRole('banner');
  const box = (await banner.boundingBox())!;
  expect(box.y).toBe(0);
  await expect(banner.getByRole('link', { name: 'Create free account' })).toBeInViewport();
});

test('the itemised invoice says the first 30 days are free, and leads to the plans', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#pricing');
  await expect(section.getByText('Free', { exact: true })).toBeVisible();
  await expect(section.getByText('for 30 days', { exact: true })).toBeVisible();
  await expect(section.getByRole('link', { name: 'Compare plans and prices' })).toHaveAttribute(
    'href',
    '/pricing',
  );
  const banner = page.getByRole('banner');
  const menu = banner.locator('summary');
  if (await menu.isVisible()) await menu.click();
  await expect(banner.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing');
});

test('the template demo redraws the invoice with the name, colour and layout chosen', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#templates');
  await section.getByLabel('Business name').fill('Fernhill Joinery');
  await section.getByRole('radio', { name: 'Navy' }).check();
  await section.getByRole('radio', { name: 'Ledger' }).check();
  const preview = section.locator('iframe[title="Ledger layout"]');
  await expect(preview).toHaveAttribute('srcdoc', /Fernhill Joinery/);
  await expect(preview).toHaveAttribute('srcdoc', /#1d3c5a/i);
});
