import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderDocumentHtml, SHOWCASE, showcaseSnapshot, storySnapshot } from '../../../packages/documents/src/index';
import { FIXTURES } from '../../../packages/documents/test/fixtures';
import { close, pdf, raster } from '../round-6/prototypes/lib';

/** Renders Signature's four styles and Monochrome as built, from the product, for review. Writes into OUT. */
const out = process.env.OUT ?? join(import.meta.dirname, 'out');
mkdirSync(out, { recursive: true });
const dpi = Number(process.env.DPI ?? 110);
const FONTS = join(import.meta.dirname, '../../../packages/documents/fonts');
const fontUrl = (file: string) =>
  `data:font/woff2;base64,${readFileSync(join(FONTS, file.split('/').pop()!)).toString('base64')}`;
const logo = SHOWCASE.find((s) => s.template === 'signature')!.logo;
const styles = (process.argv[2] ?? 'signature,signature-light,signature-route,signature-route-dark,monochrome').split(',');
const cases = [
  { key: 'larkspur', snap: () => showcaseSnapshot('signature'), logo },
  { key: 'linden', snap: () => storySnapshot(), logo: null },
  { key: 'long', snap: () => FIXTURES.long!, logo: null, pages: 3 },
];
for (const c of cases)
  for (const template of styles) {
    const html = renderDocumentHtml({ ...c.snap(), template }, { fontUrl, logoUrl: c.logo });
    const pages = raster(out, `${template}-${c.key}`, await pdf(html), dpi, c.pages ?? 1);
    console.log(template, c.key, 'pages', pages);
  }
await close();
