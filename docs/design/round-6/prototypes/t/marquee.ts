import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

function lum(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = (x: number) => (x / 255 <= 0.03928 ? x / 255 / 12.92 : ((x / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c((n >> 16) & 255) + 0.7152 * c((n >> 8) & 255) + 0.0722 * c(n & 255);
}
/** WCAG contrast between two colours. */
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}


/** sRGB hex to OKLCH (lightness 0 to 1, chroma, hue in degrees). */
function oklch(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const lin = (x: number) => (x / 255 <= 0.04045 ? x / 255 / 12.92 : ((x / 255 + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

/** OKLCH to sRGB hex, taking chroma down until the colour fits in sRGB. */
function hexOf(L: number, C: number, H: number): string {
  for (let c = C; c >= 0; c -= 0.005) {
    const a = c * Math.cos((H * Math.PI) / 180);
    const b = c * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const q = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q,
    ];
    if (rgb.every((x) => x >= -0.0005 && x <= 1.0005)) {
      const enc = (x: number) => {
        const v = Math.min(1, Math.max(0, x));
        const s = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
        return Math.trunc(s * 255 + 0.5).toString(16).padStart(2, '0');
      };
      return `#${rgb.map(enc).join('')}`;
    }
  }
  return L > 0.5 ? '#ffffff' : '#000000';
}

/**
 * A second colour for the poster, from the business's one colour: the opposite hue, deep on a light colour and pale on
 * a dark one. On a light colour the ticket is that deep tone and the amount is in the business's colour; on a dark one
 * the ticket is a deep tone of the business's own hue and the amount is in the pale one.
 */
export function duo(brand: string) {
  const [L, , H] = oklch(brand);
  const opp = (H + 180) % 360;
  if (L > 0.62) {
    const ink = hexOf(0.27, 0.11, opp);
    return { ink, ticket: ink, amount: brand };
  }
  const ink = hexOf(0.94, 0.12, opp);
  return { ink, ticket: hexOf(0.2, 0.07, H), amount: ink };
}

interface Voice {
  id: string;
  name: string;
  brand: string;
  display: string;
  /** CSS for the event title: weight, size, case, tracking. */
  title: string;
  /** CSS for the smaller display uses: the number, the amount. */
  figure: string;
  fonts: string[];
  /** Two colours from the one: the type and the ticket in the opposite hue. */
  duo?: boolean;
}

/**
 * Marquee: for events, DJs, venues, sound and photography. The job billed like a gig poster in the business's own
 * colour, and the amount due on a ticket at the foot with everything needed to pay it, the stub kept for the reference.
 */
function marqueeIn(o: Voice): ProtoTemplate & { brand: string } {
  return {
    id: o.id,
    name: o.name,
    brand: o.brand,
    fonts: [...o.fonts, 'Manrope'],
    footer: { font: 'Manrope', inset: '0' },
    css: (v: DocumentView) => {
      const pair = o.duo ? duo(v.brandColour) : null;
      const on = pair?.ink ?? v.onBrand;
      const ticket = pair?.ticket ?? '#141414';
      // Without a second colour, the amount on the ticket is in the brand colour when it stands out on the near black.
      const amt = pair?.amount ?? (contrast(v.brandColour, '#141414') >= 3 ? v.brandColour : '#ffffff');
      return `
@page{size:A4;margin:12mm 12mm 17mm}
:root{--brand:${v.brandColour};--on:${on};--ink:#141414;--soft:#5c5c5c;--line:#e2ded7;--amt:${amt};--ticket:${ticket}}
body{font-family:'Manrope',sans-serif;font-size:9.2pt;line-height:1.5;color:var(--ink)}
.d{font-family:'${o.display}',sans-serif}
.poster{background:var(--brand);color:var(--on);border-radius:3mm;padding:8mm 9mm 7mm;break-inside:avoid}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm}
.brand{display:flex;align-items:center;gap:4mm}
.brand img{height:13mm;width:13mm;object-fit:contain}
.brand .n{font-weight:800;font-size:11pt;letter-spacing:-.01em;line-height:1.2}
.brand .a{font-size:8.2pt;opacity:.8;margin-top:.4mm}
.ident{text-align:right;font-size:8.4pt;opacity:.9}
.ident b{display:block;${o.figure};font-size:15pt;line-height:1.1;margin-top:.6mm}
.bill{margin-top:9mm;${o.title};max-width:176mm}
.strap{margin-top:3mm;font-size:10pt;font-weight:600}
.reach{display:flex;flex-wrap:wrap;gap:1.5mm 8mm;margin-top:6mm;padding-top:3.2mm;border-top:.8pt solid color-mix(in srgb,var(--on) 35%,transparent);font-size:8.4pt;font-weight:600}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin:6mm 1mm 5mm}
.lab{font-weight:800;font-size:7.6pt;letter-spacing:.02em;color:var(--soft);margin-bottom:1.2mm}
.party .n{font-weight:700}
.extra{color:var(--soft);font-size:8.6pt}
.dates{display:grid;grid-template-columns:auto auto;justify-content:end;gap:.8mm 8mm;margin:0;align-content:start}
.dates dt{color:var(--soft)}.dates dd{margin:0;text-align:right;font-weight:600}
table.lines{margin:0 1mm;width:calc(100% - 2mm)}
table.lines th{font-weight:800;font-size:7.6pt;letter-spacing:.02em;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:1.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.3mm 0;border-bottom:.6pt solid var(--line);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:700}.l-desc{color:var(--soft);font-size:8.6pt}
.c-amt{font-weight:700}
.sum{display:grid;grid-template-columns:1fr 78mm;gap:12mm;margin:4mm 1mm 0}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{border-top:1.6pt solid var(--ink);margin-top:1.4mm;padding-top:2mm;font-weight:800;font-size:10.4pt}
.t-payment,.t-note{color:var(--soft)}
.notes{display:grid;gap:3mm;font-size:8.8pt;color:#333}
.n-title{font-weight:800;font-size:7.6pt;color:var(--soft);margin-bottom:.6mm}
.ticket{margin-top:7mm;break-inside:avoid}
.stub{position:relative;display:grid;grid-template-columns:1.05fr 1.3fr 48mm;background:var(--ticket);color:#f4f1ec;border-radius:3mm}
.stub>div{padding:7mm 0 7mm 8mm}
.stub>div:last-child{padding:7mm 8mm 7mm 8mm;border-left:1.4pt dashed rgb(255 255 255 / .3)}
.notch{position:absolute;right:48mm;width:8mm;height:8mm;margin-right:-4mm;border-radius:50%;background:#fff}
.notch.t{top:-4mm}.notch.b{bottom:-4mm}
.stub .lab{color:rgb(255 255 255 / .62)}
.stub .amt{${o.figure};font-size:27pt;line-height:1.05;color:var(--amt);white-space:nowrap}
.stub .when{margin-top:1.5mm;color:rgb(255 255 255 / .84);font-size:8.8pt}
.stub dl{display:grid;grid-template-columns:auto 1fr;gap:.4mm 4mm;margin:0;font-size:8.4pt}
.stub dt{color:rgb(255 255 255 / .62)}.stub dd{margin:0}
.stub .no{${o.figure};font-size:14pt;color:#f4f1ec}
.stub .link{margin-top:2mm;font-size:8.4pt;color:rgb(255 255 255 / .84);overflow-wrap:anywhere}
.legal{margin:5mm 1mm 0;font-size:7.6pt;color:var(--soft)}
`;
    },
    body: (v: DocumentView, logo: string | null) => {
      const bank = v.payment[0];
      const others = v.payment.slice(1);
      return `
<section class="poster">
  <div class="top">
    <div class="brand">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><div class="n">${esc(v.seller.name)}</div><div class="a">${esc(v.seller.addressLines.join(', '))}</div></div></div>
    <div class="ident">${esc(v.heading)}<b class="d">${esc(v.number)}</b></div>
  </div>
  <div class="bill d word">${esc(v.title ?? v.heading)}</div>
  ${v.summary ? `<div class="strap">${para(v.summary)}</div>` : ''}
  ${v.seller.contactLines.length ? `<div class="reach">${v.seller.contactLines.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
</section>
<section class="meta">
  <div class="party"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${v.buyer.detailLines.length ? `<div class="extra">${lines(v.buyer.detailLines)}</div>` : ''}</div>
  <dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl>
</section>
${linesTable(v)}
<section class="sum keep"><div>${notesBlock(v)}</div><div>${totalsBlock(v)}</div></section>
<section class="ticket">
  <div class="stub"><span class="notch t"></span><span class="notch b"></span>
    <div><div class="lab">${esc(v.amountDue.label)}</div><div class="amt d">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
    <div>${bank ? `<div class="lab">${esc(bank.title)}</div><dl>${bank.rows.filter((r) => r.label !== 'Reference').map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>` : ''}${others.map((p) => `<div class="lab" style="margin-top:2mm">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>`).join('')}</div>
    <div><div class="lab">Quote this</div><div class="no d">${esc(v.number)}</div>${v.paymentLink ? `<div class="link">Or pay at ${esc(v.paymentLink)}</div>` : ''}</div>
  </div>
</section>
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`;
    },
  };
}

export const marqueeA = marqueeIn({
  id: 'marquee-a',
  name: 'Marquee, Big Shoulders on ultramarine',
  brand: '#2B2BD9',
  display: 'Big Shoulders Display',
  title: "font-family:'Big Shoulders Display';font-weight:900;font-size:50pt;line-height:.86;text-transform:uppercase;letter-spacing:-.005em",
  figure: "font-family:'Big Shoulders Display';font-weight:900;letter-spacing:0",
  fonts: ['Big Shoulders Display'],
});

export const marqueeB = marqueeIn({
  id: 'marquee-b',
  name: 'Marquee, Anton on hot pink',
  brand: '#FF2E7E',
  display: 'Anton',
  title: "font-family:'Anton';font-weight:400;font-size:46pt;line-height:.94;text-transform:uppercase;letter-spacing:.005em",
  figure: "font-family:'Anton';font-weight:400;letter-spacing:.01em",
  fonts: ['Anton'],
});

export const marqueeC = marqueeIn({
  id: 'marquee-c',
  name: 'Marquee, Bricolage on tangerine',
  brand: '#FF8A3D',
  display: 'Bricolage Grotesque',
  title: "font-family:'Bricolage Grotesque';font-weight:800;font-size:42pt;line-height:.92;letter-spacing:-.045em",
  figure: "font-family:'Bricolage Grotesque';font-weight:800;letter-spacing:-.03em",
  fonts: ['Bricolage Grotesque'],
});

const BRICOLAGE = {
  display: 'Bricolage Grotesque',
  title: "font-family:'Bricolage Grotesque';font-weight:800;font-size:42pt;line-height:.92;letter-spacing:-.045em",
  figure: "font-family:'Bricolage Grotesque';font-weight:800;letter-spacing:-.03em",
  fonts: ['Bricolage Grotesque'],
  duo: true,
};
export const marqueeTangerine = marqueeIn({ id: 'marquee-tangerine', name: 'Marquee, tangerine and navy', brand: '#FF7A1A', ...BRICOLAGE });
export const marqueeLime = marqueeIn({ id: 'marquee-lime', name: 'Marquee, lime and plum', brand: '#C6F03A', ...BRICOLAGE });
export const marqueeViolet = marqueeIn({ id: 'marquee-violet', name: 'Marquee, violet and lemon', brand: '#5B2BFF', ...BRICOLAGE });
