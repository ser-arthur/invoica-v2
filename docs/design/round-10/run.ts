import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderDocumentHtml, SHOWCASE, showcaseSnapshot, storySnapshot } from '../../../packages/documents/src/index';
import { close, pageHtml, pdf, raster, type ProtoTemplate } from '../round-6/prototypes/lib';
import { band } from './t/band';
import { crease } from './t/crease';
import { monochrome } from './t/monochrome';
import { route } from './t/route';

/**
 * Renders the round's directions for Signature, and Monochrome, with two businesses: Larkspur Analytics (the shelf's
 * Signature, with its logo) and Linden & Rowe Studio (the website's story, no logo), next to today's Signature.
 * Writes NAME.pdf and NAME-1.png into OUT.
 */
const out = process.env.OUT ?? join(import.meta.dirname, 'out');
mkdirSync(out, { recursive: true });
const dpi = Number(process.env.DPI ?? 110);
const only = process.argv.slice(2);

const FONTS = join(import.meta.dirname, '../../../packages/documents/fonts');
const fontUrl = (file: string) =>
  `data:font/woff2;base64,${readFileSync(join(FONTS, file.split('/').pop()!)).toString('base64')}`;

const larkspurLogo = SHOWCASE.find((s) => s.template === 'signature')!.logo;
const businesses = [
  { key: 'larkspur', snap: () => showcaseSnapshot('signature'), logo: larkspurLogo },
  { key: 'linden', snap: () => storySnapshot(), logo: null },
];

const protos: ProtoTemplate[] = [crease(false), band(), crease(true), route(false), route(true), monochrome()];

for (const b of businesses) {
  if (!only.length || only.includes('signature')) {
    const html = renderDocumentHtml(b.snap(), { fontUrl, logoUrl: b.logo });
    const pages = raster(out, `signature-${b.key}`, await pdf(html), dpi, 1);
    console.log('signature', b.key, 'pages', pages);
  }
  for (const t of protos) {
    if (only.length && !only.includes(t.id)) continue;
    const html = pageHtml(t, b.snap(), b.logo);
    if (process.env.HTML) writeFileSync(join(out, `${t.id}-${b.key}.html`), html);
    const pages = raster(out, `${t.id}-${b.key}`, await pdf(html), dpi, 1);
    console.log(t.id, b.key, 'pages', pages);
  }
}
await close();
