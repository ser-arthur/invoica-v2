import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { sampleSnapshot } from '../../../../packages/documents/src/index';
import { BUSINESSES } from './data';
import { close, pageHtml, pdf, svgUrl, type ProtoTemplate } from './lib';
import { logoFor } from './logos';
import { TEMPLATES } from './t/index';

const out = join(process.env.OUT ?? join(import.meta.dirname, 'out'), 'extras');
mkdirSync(out, { recursive: true });

function png(name: string, bytes: Buffer, dpi: number) {
  const p = join(out, `${name}.pdf`);
  writeFileSync(p, bytes);
  execFileSync('pdftoppm', ['-png', '-r', String(dpi), '-f', '1', '-l', '1', '-singlefile', p, join(out, name)]);
}

// One business, one layout, eight voices: the Mark layout with Field Office's invoice.
const VOICES: [string, string, string, string][] = [
  ['modern', 'Modern', 'Geist', 'Geist Mono'],
  ['friendly', 'Friendly', 'Fraunces', 'Figtree'],
  ['editorial', 'Editorial', 'Instrument Serif', 'Instrument Sans'],
  ['classic', 'Classic', 'Source Serif 4', 'Source Sans 3'],
  ['technical', 'Technical', 'IBM Plex Sans', 'IBM Plex Mono'],
  ['wide', 'Loud', 'Unbounded', 'Manrope'],
  ['heritage', 'Heritage', 'Cormorant', 'EB Garamond'],
  ['art', 'Art school', 'Syne', 'Space Mono'],
];
const base = TEMPLATES.mark as ProtoTemplate;
const field = sampleSnapshot({ template: 'mark', seller: { brandColour: '#17795a' } });
for (const [id, , display, text] of VOICES) {
  const t: ProtoTemplate = {
    ...base,
    fonts: [display, text],
    footer: { font: text, inset: '0' },
    css: (v) =>
      base
        .css(v)
        .replaceAll("'Geist Mono'", `'${text}'`)
        .replaceAll("font-family:'Geist',sans-serif", `font-family:'${text}',sans-serif`)
        .replace('.brand .n{', `.brand .n{font-family:'${display}';`)
        .replace('.ident .no{', `.ident .no{font-family:'${display}';`)
        .replace('.intro h2{', `.intro h2{font-family:'${display}';`)
        .replace('.due .d-value{', `.due .d-value{font-family:'${display}' !important;`) +
      (display === 'Fraunces' ? `.brand .n,.ident .no,.intro h2,.due .d-value{font-variation-settings:'SOFT' 100,'WONK' 1}` : '') +
      (display === 'Unbounded' ? `.ident .no{font-size:28pt;letter-spacing:-.04em}` : '') +
      (display === 'Instrument Serif' || display === 'Cormorant' ? `.ident .no{font-weight:400;font-size:40pt;letter-spacing:-.01em}.brand .n{font-weight:500;font-size:17pt;letter-spacing:0}` : ''),
  };
  png(`voice-${id}`, await pdf(pageHtml(t, field, null)), 150);
}

// The same template in three brand colours.
const COLOURS: Record<string, string[]> = {
  sticker: ['#E8436F', '#2F7DE1', '#F28C28'],
  grid: ['#E2231A', '#1F5BFF', '#111111'],
  trade: ['#FFC20E', '#2BB673', '#E4002B'],
};
for (const [id, list] of Object.entries(COLOURS)) {
  const t = (TEMPLATES as Record<string, ProtoTemplate>)[id]!;
  for (const c of list) {
    const snap = BUSINESSES[id]!(id);
    snap.seller = { ...snap.seller, brandColour: c };
    png(`colour-${id}-${c.slice(1)}`, await pdf(pageHtml(t, snap, svgUrl(logoFor(id, c)))), 72);
  }
}
await close();
console.log('done');
