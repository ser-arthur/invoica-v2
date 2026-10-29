import { expect, test } from '@playwright/test';
import { addClient, choose, signUpAndOnboard } from './helpers';

test('every control on the main pages can be reached with Tab and shows where focus is', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Keyboard use is checked at desktop width.');
  // Tabbing through every control on five pages takes about 30 seconds alone, and longer in a full run.
  test.setTimeout(240_000);
  await signUpAndOnboard(page, 'Keys Studio', { vat: true });
  await addClient(page, 'Wren Bakery');
  let examined = 0;
  for (const path of ['/dashboard', '/invoices', '/clients', '/settings', '/invoices/new']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        // The development server's own overlay is not part of the app.
        if (!el || el === document.body || el.tagName === 'NEXTJS-PORTAL') return null;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          id: `${el.tagName}:${el.getAttribute('aria-label') ?? el.id ?? ''}:${(el.textContent ?? '').trim().slice(0, 30)}:${Math.trunc(r.top)}:${Math.trunc(r.left)}`,
          outline: s.outlineStyle !== 'none' && s.outlineWidth !== '0px',
          ring: s.boxShadow !== 'none',
          size: r.width > 0 && r.height > 0,
          frame: el.tagName === 'IFRAME',
        };
      });
      if (!focus) continue;
      if (seen.has(focus.id)) break;
      seen.add(focus.id);
      examined += 1;
      expect(focus.size, `${path}: ${focus.id} is on screen`).toBe(true);
      if (!focus.frame) expect(focus.outline || focus.ring, `${path}: ${focus.id} shows focus`).toBe(true);
    }
    expect(seen.size, `${path} has controls to reach`).toBeGreaterThan(3);
  }
  expect(examined).toBeGreaterThan(40);
});

test('an open dialog keeps focus inside it, and closing it returns focus to what opened it', async ({
  page,
}) => {
  await signUpAndOnboard(page, 'Quayside Office', { vat: true });
  await addClient(page, 'Tidewater Ltd');
  await page.goto('/invoices/new');
  await choose(page.getByLabel('Bill to'), { label: 'Tidewater Ltd' });
  await page.getByLabel('Line 1 description').fill('Survey');
  await page.getByLabel('Line 1 price').fill('300');

  const insideDialog = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  const tabAround = async (times: number) => {
    for (let i = 0; i < times; i++) {
      await page.keyboard.press(i % 3 === 2 ? 'Shift+Tab' : 'Tab');
      expect(await insideDialog(), `after ${i + 1} presses`).toBe(true);
    }
  };

  await page.getByRole('button', { name: 'Issue invoice' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await insideDialog()).toBe(true);
  await tabAround(8);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Issue invoice' })).toBeFocused();

  await page.getByRole('button', { name: 'Issue invoice' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Issue invoice' }).click();
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}\?issued=1/);

  const opener = page.getByRole('button', { name: 'Record payment' });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await insideDialog()).toBe(true);
  await tabAround(12);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
});
