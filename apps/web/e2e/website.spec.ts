import { expect, test } from '@playwright/test';
import { foldLine } from '../src/components/site/fold';
import { signUpAndOnboard } from './helpers';

// docs/specs/website.md

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

test('the fold crosses the headline and nothing else in the hero, at every width', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The widths are set in the test.');
  for (const width of [1920, 1440, 1180, 1024, 961, 800, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const heading = page.getByRole('heading', { level: 1 });
    const hero = heading.locator('xpath=..');
    const measure = await heading.evaluate((h1) => {
      const grid = h1.parentElement!;
      const top = grid.parentElement!.getBoundingClientRect();
      const style = getComputedStyle(grid);
      return {
        width: top.width,
        hs: Number(getComputedStyle(h1).fontSize.replace('px', '')),
        pad: Number(style.paddingTop.replace('px', '')),
        gutter: Number(style.paddingLeft.replace('px', '')),
        left: top.left,
        top: top.top,
      };
    });
    const fold = foldLine(measure);
    const corners = async (box: { x: number; y: number; width: number; height: number } | null) => {
      expect(box).not.toBeNull();
      const b = box!;
      return [
        [b.x, b.y],
        [b.x + b.width, b.y],
        [b.x, b.y + b.height],
        [b.x + b.width, b.y + b.height],
      ].map(([x, y]) => y! - measure.top - fold.yAt(x! - measure.left));
    };
    const others = [
      hero.getByText('Look established from day one'),
      hero.getByRole('link', { name: 'Create your free account' }),
      hero.getByRole('link', { name: 'How it works' }),
      hero.getByText('For new businesses'),
      hero.getByText('No card needed'),
    ];
    for (const other of others) {
      for (const below of await corners(await other.boundingBox())) {
        expect(below, `${await other.textContent()} at ${width} pixels`).toBeGreaterThan(8);
      }
    }
    const headline = await corners(await heading.boundingBox());
    expect(Math.min(...headline), `the headline at ${width} pixels`).toBeLessThan(0);
    expect(Math.max(...headline), `the headline at ${width} pixels`).toBeGreaterThan(0);
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
    ['Sign in', '/sign-in'],
    ['Create free account', '/sign-up'],
  ];
  for (const [name, href] of planned) {
    await expect(footer.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
});
