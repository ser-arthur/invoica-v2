import { expect, test } from '@playwright/test';
import { addClient, signUpAndOnboard } from './helpers';

test('every control on the main pages can be reached with Tab and shows where focus is', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Keyboard use is checked at desktop width.');
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
          id: `${el.tagName}:${el.getAttribute('aria-label') ?? el.id ?? ''}:${(el.textContent ?? '').trim().slice(0, 30)}:${Math.round(r.top)}:${Math.round(r.left)}`,
          outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0,
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
