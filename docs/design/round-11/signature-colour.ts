/**
 * Round 11: Signature's Night head with its accents taken from the business's colour, beside today's, for the owner's
 * question of 27 October, 16:34. A mockup: the product is not changed. Renders Larkspur Analytics (the website shelf's
 * Signature) in five colours, today's and proposed, to PNG files for the board in docs/design/round-11-signature-colour.md.
 *
 * Usage, from packages/documents: pnpm exec tsx ../../docs/design/round-11/signature-colour.ts <output folder>
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderDocumentHtml, showcaseSnapshot, RANGE } from '../../../packages/documents/src/index';

const out = process.argv[2]!;
const MINT = '#6ce4a2';
const LIME = '#cff26a';
const LINE = ['#cff26a', '#46da80', '#2fb3a6'];

/** sRGB hex to OKLCH and back, so a colour can be made lighter for Night without losing its hue or going grey. */
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function toOklch(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => lin(Number.parseInt(hex.slice(i, i + 2), 16) / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}
function fromOklch(L: number, C: number, h: number): string | null {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(gam);
  if (rgb.some((v) => v < -0.0005 || v > 1.0005)) return null;
  return `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
}
/** The colour at lightness L, keeping its hue and as much of its colourfulness (at least `min`) as fits. */
function at(hex: string, L: number, min: number): string {
  const [, C, h] = toOklch(hex);
  for (let c = Math.max(C, min); c >= 0; c -= 0.005) {
    const out = fromOklch(L, c, h);
    if (out) return out;
  }
  return fromOklch(L, 0, h)!;
}

/** The head's accents from one colour: the number past the crease and the labels, the due date, the line. */
export function accents(brand: string) {
  const accent = at(brand, 0.8, 0.11);
  const light = at(brand, 0.87, 0.1);
  return { accent, light, line: [light, accent, at(brand, 0.68, 0.13)] };
}

const COLOURS: [string, string | undefined][] = [
  ['Larkspur green', undefined],
  ['Orange', '#d9480f'],
  ['Navy', '#1d3c5a'],
  ['Plum', '#5b2a4e'],
  ['Rose', '#c52a55'],
];
const logo = RANGE.find((r) => r.template === 'signature')!.logo;
for (const [name, colour] of COLOURS) {
  const snap = showcaseSnapshot('signature', { colour });
  const today = renderDocumentHtml(snap, { fontUrl: (f) => `/doc-fonts/${f}`, logoUrl: colour ? null : logo });
  const { accent, light, line } = accents(snap.seller.brandColour);
  let proposed = today
    .replace(`.head .lab{font-size:7.8pt;color:${MINT}`, `.head .lab{font-size:7.8pt;color:${accent}`)
    .replace(new RegExp(`(\\.fold \\.past\\{[^}]*color:)${MINT}`), `$1${accent}`)
    .replace(`.due .when{font-size:8.8pt;color:${LIME}`, `.due .when{font-size:8.8pt;color:${light}`);
  const a = proposed.indexOf('<header class="head">');
  const b = proposed.indexOf('</header>', a);
  let head = proposed.slice(a, b);
  LINE.forEach((c, i) => (head = head.split(c).join(line[i]!)));
  proposed = proposed.slice(0, a) + head + proposed.slice(b);
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  writeFileSync(join(out, `${slug}-today.html`), today);
  writeFileSync(join(out, `${slug}-proposed.html`), proposed);
  console.log(slug, snap.seller.brandColour, accent, light, line.join(' '));
}
