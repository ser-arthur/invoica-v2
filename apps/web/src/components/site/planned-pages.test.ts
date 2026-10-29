import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FOOTER_LINKS, FOOTER_SMALL_PRINT } from './links';
import { PLANNED_PAGES, plannedPage } from './planned-pages';

const APP = fileURLToPath(new URL('../../app', import.meta.url));

/** Every address the app has a page for, with route groups such as `(app)` left out. */
function builtAddresses(dir = APP): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return builtAddresses(path);
    if (!/^page\.(tsx|ts|jsx|js|mdx)$/.test(entry.name)) return [];
    const segments = relative(APP, dir)
      .split(sep)
      .filter((segment) => segment !== '' && !/^\(.*\)$/.test(segment));
    return [`/${segments.join('/')}`];
  });
}

describe('planned pages', () => {
  it('finds a planned page by its address, with or without a closing slash', () => {
    expect(plannedPage('/privacy')?.heading).toBe('The Privacy page is being written.');
    expect(plannedPage('/terms/')?.href).toBe('/terms');
  });

  it('finds nothing for an address that is not planned, or no address at all', () => {
    expect(plannedPage('/no-such-page')).toBeUndefined();
    expect(plannedPage('/Privacy')).toBeUndefined();
    expect(plannedPage('/privacy/cookies')).toBeUndefined();
    expect(plannedPage('/about')).toBeUndefined();
    expect(plannedPage('')).toBeUndefined();
    expect(plannedPage(null)).toBeUndefined();
  });

  it('are every one linked from the footer', () => {
    const footer = [...FOOTER_LINKS, ...FOOTER_SMALL_PRINT].map((link) => link.href);
    for (const page of PLANNED_PAGES) expect(footer, page.href).toContain(page.href);
  });

  it('share no address with a page that is built', () => {
    const built = builtAddresses();
    expect(built).toContain('/pricing');
    for (const page of PLANNED_PAGES) {
      expect(built, `${page.href} is built: take it off PLANNED_PAGES`).not.toContain(page.href);
    }
  });
});
