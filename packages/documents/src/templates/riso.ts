import type { DocumentView } from '../view';
import {
  esc,
  fitPt,
  lines,
  linesTable,
  notesBlock,
  onWhite,
  para,
  paymentBlock,
  totalsBlock,
  logoFit,
  logoRatio,
  WIDE_LOGO,
} from './shared';

/** A field of halftone dots, growing from nothing on the left to touching on the right. */
function halftone(id: string, colour: string, w = 184, h = 32, step = 2.3): string {
  const dots: string[] = [];
  for (let x = step / 2, i = 0; x < w; x += step, i++) {
    const t = Math.max(0, (x / w - 0.18) / 0.82);
    for (let y = step / 2 + (i % 2 ? step / 2 : 0); y < h; y += step) {
      const r = (step / 2) * Math.min(1.05, t * t * 1.15 + 0.04);
      dots.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}"/>`);
    }
  }
  return `<svg class="${id}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><g fill="${colour}">${dots.join('')}</g></svg>`;
}

/**
 * Riso: for illustrators, print studios, zines and record labels. Two inks, the brand colour and a
 * risograph blue, overprinting where they meet; the amount set large and slightly out of register.
 */
export const riso = {
  id: 'riso',
  fonts: ['Syne', 'Space Mono'] as const,
  footer: { font: 'Space Mono', inset: '0', color: '#0078BF' },
  css: (v: DocumentView) => `
@page{size:A4;margin:13mm 13mm 17mm}
@media screen{body{padding:13mm 13mm 17mm 13mm}}
:root{--pink:${v.brandColour};--pinkt:${onWhite(v.brandColour, 3)};--pinks:${onWhite(v.brandColour)};--blue:#0078BF}
body{font-family:'Space Mono',monospace;font-size:8.6pt;line-height:1.55;color:var(--blue)}
.syne{font-family:'Syne',sans-serif}
.ink{mix-blend-mode:multiply}
.head{display:grid;grid-template-columns:auto 1fr auto;gap:6mm;align-items:start}
.logo{min-width:25mm;height:25mm}
.logo img{height:100%;width:auto;max-width:56mm;object-fit:contain;object-position:left top;display:block}
.head.wide{grid-template-columns:1fr auto;grid-template-areas:'logo ident' 'who ident';row-gap:4mm}
.head.wide .logo{grid-area:logo;height:auto;min-width:0}
.head.wide .seller{grid-area:who}
.head.wide .ident{grid-area:ident}
.head.wide~.rule{margin:5mm 0 4mm}
.head.wide~.intro{margin:5mm 0 4mm}
.head.wide~.due{margin-top:5mm}
.logo .mono{width:100%;height:100%;border-radius:50%;background:var(--pink);display:grid;place-items:center;font-family:'Syne';font-weight:800;font-size:28pt;color:var(--blue)}
.name{font-family:'Syne',sans-serif;font-weight:800;font-size:22pt;line-height:1;letter-spacing:-.01em;margin-top:1mm}
.addr{margin-top:2.5mm;font-size:8pt;line-height:1.5}
.ident{text-align:right}
.kind{font-family:'Syne';font-weight:700;font-size:10pt}
.no{position:relative;font-family:'Syne';font-weight:800;font-size:${fitPt(v.number, 80, 0.78, 30, 14)}pt;line-height:1;letter-spacing:-.02em;color:var(--pinkt);white-space:nowrap}
.rule{height:0;border-top:1.6pt solid var(--blue);margin:6mm 0 5mm}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:8mm}
.lab{font-family:'Syne';font-weight:700;font-size:8.6pt;color:var(--pinks);margin-bottom:1mm;mix-blend-mode:multiply}
.who .n{font-family:'Syne';font-weight:700;font-size:11pt}
.dates{display:grid;grid-template-columns:auto 1fr;gap:.6mm 5mm;align-content:start;margin:0}
.dates dd{margin:0;text-align:right}
.intro{margin:6mm 0 5mm}
.intro h2{font-family:'Syne';font-weight:800;font-size:19pt;line-height:1.08;margin:0 0 2mm;max-width:150mm}
table.lines th{font-weight:700;font-size:7.6pt;text-align:left;padding:0 0 1.8mm;border-bottom:1.2pt solid var(--blue)}
table.lines th.num{text-align:right}
table.lines td{padding:2.3mm 0;border-bottom:.8pt dashed var(--blue);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-family:'Syne';font-weight:700;font-size:10pt}
.l-desc{font-size:8pt;opacity:.85}
.after{display:grid;grid-template-columns:1fr 70mm;gap:12mm;margin-top:5mm;align-items:start}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.8mm 0}
.t-total{border-top:1.2pt solid var(--blue);margin-top:1.4mm;padding-top:1.8mm;font-weight:700}
.p-title{font-family:'Syne';font-weight:700;font-size:9.4pt;margin-bottom:.6mm}
.pay{display:grid;gap:3mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:0 5mm;margin:0}
.pay dd{margin:0}
.due{position:relative;margin-top:7mm;height:30mm;break-inside:avoid}
.due .tone{position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:multiply}
.due .left{position:absolute;left:0;top:0}
.due .d-label{font-family:'Syne';font-weight:800;font-size:12pt}
.due .fig{position:absolute;right:2mm;bottom:3mm;font-family:'Syne';font-weight:800;font-size:44pt;line-height:1;letter-spacing:-.025em;white-space:nowrap;color:var(--blue);mix-blend-mode:multiply}
.notes{margin-top:5mm;display:grid;gap:2.5mm;max-width:150mm}
.n-title{font-family:'Syne';font-weight:700}
.legal{margin-top:4mm;font-size:7.6pt}
`,
  body: (v: DocumentView, logo: string | null) => {
    const ratio = logoRatio(logo);
    const wide = ratio !== null && ratio >= WIDE_LOGO;
    return `
<header class="head${wide ? ' wide' : ''}">
  <div class="logo ink">${logo ? `<img src="${esc(logo)}" alt="${esc(v.seller.name)}"${wide ? ` style="${logoFit(ratio, 64, 12)}"` : ''}>` : `<div class="mono">${esc(v.seller.name.slice(0, 1))}</div>`}</div>
  <div class="seller"><div class="name word">${esc(v.seller.name)}</div><div class="addr">${lines([...v.seller.addressLines, ...v.seller.contactLines, v.seller.taxLine])}</div></div>
  <div class="ident"><div class="kind">${esc(v.heading)}</div><div class="no ink">${esc(v.number)}</div></div>
</header>
<div class="rule"></div>
<section class="meta">
  <div class="who"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Printed for'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <div><div class="lab">Dates</div><dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep">
  <div>${paymentBlock(v)}</div>
  <div>${totalsBlock(v)}</div>
</section>
<section class="due">
  ${halftone('tone', 'var(--pink)')}
  <div class="left"><div class="d-label">${esc(v.amountDue.label)}</div>${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
  <div class="fig">${esc(v.amountDue.value)}</div>
</section>
${notesBlock(v)}
<footer class="legal keep">${esc(v.legalLine)}</footer>
`;
  },
};
