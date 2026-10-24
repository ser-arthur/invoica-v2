import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURES } from '../../../../packages/documents/test/fixtures';
import { BUSINESSES } from './data';
import { close, pageHtml, pdf, raster, svgUrl, type ProtoTemplate } from './lib';
import { LOGOS } from './logos';
import { TEMPLATES } from './t/index';

const out = process.env.OUT ?? join(import.meta.dirname, 'out');
mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);
const dpi = Number(process.env.DPI ?? 110);

for (const t of Object.values(TEMPLATES) as ProtoTemplate[]) {
  if (only.length && !only.includes(t.id)) continue;
  const snap = BUSINESSES[t.id]!(t.id);
  const logo = svgUrl(LOGOS[t.id]!(snap.seller.brandColour));
  const pages = raster(out, `${t.id}`, await pdf(pageHtml(t, snap, logo)), dpi, 1);
  if (process.env.QA) {
    raster(out, `${t.id}-nologo`, await pdf(pageHtml(t, snap, null)), 60, 1);
    const long = { ...FIXTURES.long!, template: t.id, seller: { ...FIXTURES.long!.seller, brandColour: snap.seller.brandColour } };
    raster(out, `${t.id}-long`, await pdf(pageHtml(t, long, null)), 60, 3);
    const vat = { ...FIXTURES.ukVat!, template: t.id, seller: { ...FIXTURES.ukVat!.seller, brandColour: snap.seller.brandColour } };
    raster(out, `${t.id}-vat`, await pdf(pageHtml(t, vat, null)), 60, 2);
  }
  console.log(t.id, 'pages', pages);
}
await close();
