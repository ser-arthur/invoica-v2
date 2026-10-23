import { expect, test } from '@playwright/test';

// docs/specs/pricing-page.md

test('the pricing page shows the three plans with their monthly prices', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const plans = page.getByRole('region', { name: 'Plans', exact: true });
  for (const [name, price] of [
    ['Free', '£0'],
    ['Pro', '£7'],
    ['Studio', '£15'],
  ] as const) {
    const plan = plans.getByRole('article', { name });
    await expect(plan.getByRole('heading', { level: 2, name })).toBeVisible();
    await expect(plan.getByText(price, { exact: true })).toBeVisible();
  }
});

test('the yearly switch shows the yearly prices, and back', async ({ page }) => {
  await page.goto('/pricing');
  const plans = page.getByRole('region', { name: 'Plans', exact: true });
  await page.getByRole('radio', { name: /Yearly/ }).check();
  await expect(plans.getByRole('article', { name: 'Pro' }).getByText('£70', { exact: true })).toBeVisible();
  await expect(
    plans.getByRole('article', { name: 'Studio' }).getByText('£150', { exact: true }),
  ).toBeVisible();
  await expect(plans.getByRole('article', { name: 'Pro' }).getByText('£7', { exact: true })).toBeHidden();
  await page.getByRole('radio', { name: 'Monthly' }).check();
  await expect(plans.getByRole('article', { name: 'Pro' }).getByText('£7', { exact: true })).toBeVisible();
});

test('the trial is stated before the plans', async ({ page }) => {
  await page.goto('/pricing');
  const trial = page.getByText('Every account starts with 30 days of Pro, free');
  await expect(trial).toBeVisible();
  const trialBox = (await trial.boundingBox())!;
  const plansBox = (await page.getByRole('region', { name: 'Plans', exact: true }).boundingBox())!;
  expect(trialBox.y).toBeLessThan(plansBox.y);
  await expect(page.getByText(/no card/i).first()).toBeVisible();
});

test('every way to start leads to sign-up', async ({ page }) => {
  await page.goto('/pricing');
  const starts = page.getByRole('link', { name: /^Start/ });
  expect(await starts.count()).toBeGreaterThanOrEqual(3);
  for (const link of await starts.all()) await expect(link).toHaveAttribute('href', '/sign-up');
});

test('what is not built yet is marked as coming soon', async ({ page }) => {
  await page.goto('/pricing');
  const plans = page.getByRole('region', { name: 'Plans', exact: true });
  await expect(
    plans.getByRole('article', { name: 'Pro' }).getByText(/Payment links.*coming soon/i),
  ).toBeVisible();
  await expect(
    plans
      .getByRole('article', { name: 'Studio' })
      .getByText(/coming soon/i)
      .first(),
  ).toBeVisible();
});

test('the pricing page never scrolls sideways on a phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'Checked at phone widths.');
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/pricing');
    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(scroll, `at ${width} pixels`).toBeLessThanOrEqual(client);
  }
});
