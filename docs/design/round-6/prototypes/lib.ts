import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium, type Browser } from '../../../../packages/pdf/node_modules/playwright-core/index.mjs';
import { buildView, type DocumentView } from '../../../../packages/documents/src/index';
import { BASE_CSS, pageFooterCss } from '../../../../packages/documents/src/templates/shared';
import type { DocumentSnapshot } from '../../../../packages/core/src/index';

/** Where the extra OFL fonts were installed (`npm install` of the @fontsource packages listed in README.md). */
const NM = process.env.PROTO_FONTS ?? join(import.meta.dirname, 'fonts', 'node_modules');
const REPO_FONTS = join(import.meta.dirname, '../../../../packages/documents/fonts');

/** family -> faces: [file, weight range, style] */
export const FONTS: Record<string, [string, string, 'normal' | 'italic'][]> = {
  Fraunces: [
    [`${NM}/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2`, '100 900', 'normal'],
    [`${NM}/@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2`, '100 900', 'italic'],
  ],
  Figtree: [[`${NM}/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2`, '300 900', 'normal']],
  Syne: [[`${NM}/@fontsource-variable/syne/files/syne-latin-wght-normal.woff2`, '400 800', 'normal']],
  'Space Mono': [
    [`${NM}/@fontsource/space-mono/files/space-mono-latin-400-normal.woff2`, '400', 'normal'],
    [`${NM}/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2`, '700', 'normal'],
  ],
  'Space Grotesk': [
    [`${NM}/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2`, '300 700', 'normal'],
  ],
  Unbounded: [[`${NM}/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2`, '200 900', 'normal']],
  Manrope: [[`${NM}/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2`, '200 800', 'normal']],
  'Instrument Serif': [
    [`${NM}/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2`, '400', 'normal'],
    [`${NM}/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2`, '400', 'italic'],
  ],
  'Instrument Sans': [
    [
      `${NM}/@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-normal.woff2`,
      '400 700',
      'normal',
    ],
  ],
  'Mona Sans': [
    [`${NM}/@fontsource-variable/mona-sans/files/mona-sans-latin-standard-normal.woff2`, '200 900', 'normal'],
  ],
  Geist: [[`${NM}/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2`, '100 900', 'normal']],
  'Geist Mono': [
    [`${NM}/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2`, '100 900', 'normal'],
  ],
  Archivo: [
    [`${NM}/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2`, '100 900', 'normal'],
  ],
  'Source Serif 4': [
    [`${NM}/@fontsource-variable/source-serif-4/files/source-serif-4-latin-standard-normal.woff2`, '200 900', 'normal'],
    [`${NM}/@fontsource-variable/source-serif-4/files/source-serif-4-latin-standard-italic.woff2`, '200 900', 'italic'],
  ],
  'Source Sans 3': [
    [`${NM}/@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2`, '200 900', 'normal'],
  ],
  Cormorant: [
    [`${NM}/@fontsource-variable/cormorant/files/cormorant-latin-wght-normal.woff2`, '300 700', 'normal'],
    [`${NM}/@fontsource-variable/cormorant/files/cormorant-latin-wght-italic.woff2`, '300 700', 'italic'],
  ],
  'Cormorant SC': [
    [`${NM}/@fontsource/cormorant-sc/files/cormorant-sc-latin-400-normal.woff2`, '400', 'normal'],
    [`${NM}/@fontsource/cormorant-sc/files/cormorant-sc-latin-700-normal.woff2`, '700', 'normal'],
  ],
  'EB Garamond': [
    [`${NM}/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2`, '400 800', 'normal'],
    [`${NM}/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-italic.woff2`, '400 800', 'italic'],
  ],
  'IBM Plex Sans': [
    [`${NM}/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-standard-normal.woff2`, '100 700', 'normal'],
  ],
  'IBM Plex Mono': [
    [`${NM}/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2`, '400', 'normal'],
    [`${NM}/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2`, '700', 'normal'],
  ],
  'Hanken Grotesk': [
    [`${NM}/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2`, '100 900', 'normal'],
  ],
  'Young Serif': [[`${NM}/@fontsource/young-serif/files/young-serif-latin-400-normal.woff2`, '400', 'normal']],
  Gloock: [[`${NM}/@fontsource/gloock/files/gloock-latin-400-normal.woff2`, '400', 'normal']],
  'DM Sans': [[`${NM}/@fontsource-variable/dm-sans/files/dm-sans-latin-standard-normal.woff2`, '100 1000', 'normal']],
  Sora: [[`${REPO_FONTS}/sora-latin-wght-normal.woff2`, '100 800', 'normal']],
  Onest: [[`${REPO_FONTS}/onest-latin-wght-normal.woff2`, '100 900', 'normal']],
  'Bricolage Grotesque': [[`${REPO_FONTS}/bricolage-grotesque-latin-wght-normal.woff2`, '200 800', 'normal']],
  Newsreader: [
    [`${REPO_FONTS}/newsreader-latin-wght-normal.woff2`, '200 800', 'normal'],
    [`${REPO_FONTS}/newsreader-latin-wght-italic.woff2`, '200 800', 'italic'],
  ],
  'JetBrains Mono': [[`${REPO_FONTS}/jetbrains-mono-latin-wght-normal.woff2`, '100 800', 'normal']],
};

const cache = new Map<string, string>();
function dataUrl(file: string) {
  let u = cache.get(file);
  if (!u) {
    u = `data:font/woff2;base64,${readFileSync(file).toString('base64')}`;
    cache.set(file, u);
  }
  return u;
}

export function fontCss(families: readonly string[]): string {
  return families
    .flatMap((f) => {
      const faces = FONTS[f];
      if (!faces) throw new Error(`No font ${f}`);
      return faces.map(
        ([file, weight, style]) =>
          `@font-face{font-family:'${f}';src:url(${dataUrl(file)}) format('woff2');font-weight:${weight};font-style:${style};font-display:block}`,
      );
    })
    .join('\n');
}

export interface ProtoTemplate {
  id: string;
  name: string;
  fonts: readonly string[];
  footer: { font: string; inset: string; color?: string };
  css: (v: DocumentView) => string;
  body: (v: DocumentView, logo: string | null) => string;
}

export function pageHtml(t: ProtoTemplate, snapshot: DocumentSnapshot, logo: string | null, opts: { draft?: boolean } = {}) {
  const v = buildView(snapshot, { draft: opts.draft });
  const footer = pageFooterCss(`${v.heading} ${v.number}`, t.footer.font, t.footer.color ?? '#6b746f', t.footer.inset);
  const css = `${fontCss(t.fonts)}\n${BASE_CSS}\n.c-date{white-space:nowrap;width:22mm}\n${t.css(v)}\n${footer}`;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${v.heading} ${v.number}</title><style>${css}</style></head><body>${t.body(v, logo)}</body></html>`;
}

let browser: Browser | null = null;
export async function pdf(html: string): Promise<Buffer> {
  browser ??= await chromium.launch({ args: ['--disable-dev-shm-usage', '--font-render-hinting=none'] });
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  const out = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true });
  await ctx.close();
  return out;
}
export async function close() {
  await browser?.close();
  browser = null;
}

/** Writes name.pdf and name-pN.png (dpi) for the first `pages` pages; returns the page count. */
export function raster(dir: string, name: string, bytes: Buffer, dpi = 110, pages = 1): number {
  const p = join(dir, `${name}.pdf`);
  writeFileSync(p, bytes);
  const info = execFileSync('pdfinfo', [p]).toString();
  const count = Number(/Pages:\s+(\d+)/.exec(info)?.[1] ?? 1);
  execFileSync('pdftoppm', ['-png', '-r', String(dpi), '-f', '1', '-l', String(Math.min(pages, count)), p, join(dir, name)]);
  return count;
}

export const svgUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
