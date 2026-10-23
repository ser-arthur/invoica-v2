import { expect, test } from '@playwright/test';

// docs/specs/website.md, rule 9: movement tied to scrolling follows the page's own scroll. A container that clips with
// `overflow: hidden` becomes a scroll container, and anything inside it would follow that container's scroll, which
// never moves, so the motion would freeze.

test('every scroll-linked movement on the website follows the page’s scroll', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The same at every width.');
  for (const path of ['/', '/pricing', '/sign-in', '/no-such-page']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const found = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.timeline && !(a.timeline instanceof DocumentTimeline))
        .map((a) => {
          const source = (a.timeline as unknown as { source: Element | null }).source;
          return {
            name: (a as CSSAnimation).animationName,
            page: source === document.scrollingElement,
          };
        }),
    );
    for (const animation of found) expect(animation.page, `${path}: ${animation.name}`).toBe(true);
    if (path === '/' || path === '/pricing') expect(found.length, path).toBeGreaterThan(0);
  }
});
