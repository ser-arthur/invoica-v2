import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { closePdfRenderer, renderPdf } from '../../../../packages/pdf/src/index';
import { BUSINESSES } from './data';
import { logoFor } from './logos';
import { svgUrl } from './lib';

/** The templates as built in the product, with the invented businesses, in the colours shown on the canvas. */
const out = process.env.OUT ?? join(import.meta.dirname, 'out');
const RUNS: [string, string | null, string][] = [
  ['signature', '#3A3FB8', 'built-signature-indigo'],
  ['signature', null, 'built-signature'],
  ['letter', null, 'built-letter'],
  ['ticket', null, 'built-ticket'],
  ['ticket', '#0F6E70', 'built-ticket-teal'],
];
for (const [id, brand, name] of RUNS) {
  const base = BUSINESSES[id]!(id);
  const snap = { ...base, template: id, seller: { ...base.seller, brandColour: brand ?? base.seller.brandColour } };
  const bytes = await renderPdf(snap, { logoDataUrl: svgUrl(logoFor(id, snap.seller.brandColour)) });
  const p = join(out, `${name}.pdf`);
  writeFileSync(p, bytes);
  execFileSync('pdftoppm', ['-png', '-r', '192', '-f', '1', '-l', '1', '-singlefile', p, join(out, name)]);
  console.log(name, /Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [p]).toString())![1]);
}
await closePdfRenderer();
