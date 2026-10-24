import { join } from 'node:path';
import { BUSINESSES } from './data';
import { close, pageHtml, pdf, raster, type ProtoTemplate } from './lib';
import { TEMPLATES } from './t/index';
const out = process.env.OUT ?? join(import.meta.dirname, 'out');
for (const t of Object.values(TEMPLATES) as ProtoTemplate[]) {
  raster(out, `${t.id}-nl`, await pdf(pageHtml(t, BUSINESSES[t.id]!(t.id), null)), 192, 1);
}
await close();
