import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { closePdfRenderer, renderPdf } from '../../../../packages/pdf/src/index';
import { BUSINESSES } from './data';
import { logoFor } from './logos';
import { svgUrl } from './lib';

const out = process.env.OUT ?? join(import.meta.dirname, 'out');
for (const id of ['signature', 'letter', 'ticket']) {
  const snap = { ...BUSINESSES[id]!(id), template: id };
  const bytes = await renderPdf(snap, { logoDataUrl: svgUrl(logoFor(id, snap.seller.brandColour)) });
  const p = join(out, `before-${id}.pdf`);
  writeFileSync(p, bytes);
  console.log(id, /Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [p]).toString())![1]);
}
await closePdfRenderer();
