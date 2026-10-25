import type { DocumentView } from '../view';
import { esc, lines, linesTable, onWhite, para, paymentBlock, totalsBlock } from './shared';

/** A spray of wild roses, buds and rose leaves in fine line, growing in from the top right corner of the header. */
function botanical(colour: string): string {
  const f = (n: number) => n.toFixed(1);
  const petal =
    'M0 0 C -11 -7, -17 -25, -9 -34 C -5 -38, -1 -36, 0 -32 C 1 -36, 5 -38, 9 -34 C 17 -25, 11 -7, 0 0 Z';
  const rose = (x: number, y: number, s: number, r: number) => {
    const p = [0, 72, 144, 216, 288]
      .map((a) => `<path d="${petal}" transform="rotate(${a})" style="fill:var(--blush)"/>`)
      .join('');
    const dots = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return `<circle cx="${f(Math.cos(a) * 8.5)}" cy="${f(Math.sin(a) * 8.5)}" r="1.1" fill="${colour}" stroke="none"/>`;
    }).join('');
    const veins = [0, 72, 144, 216, 288]
      .map((a) => `<path d="M0 -11 L0 -24" transform="rotate(${a})" stroke-width=".5"/>`)
      .join('');
    return `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${p}${veins}<circle r="5" style="fill:var(--blush)"/>${dots}</g>`;
  };
  const bud = (x: number, y: number, s: number, r: number) =>
    `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 0 C -7 -6, -7 -17, 0 -24 C 7 -17, 7 -6, 0 0 Z" style="fill:var(--blush)"/><path d="M0 -2 C -5 -6, -9 -10, -11 -17 M0 -2 C 5 -6, 9 -10, 11 -17 M0 0 L0 16"/></g>`;
  const leaflet = (x: number, y: number, a: number, s: number) =>
    `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${s})"><path d="M0 0 C 5 -4, 6 -13, 0 -20 C -6 -13, -5 -4, 0 0 Z" style="fill:var(--blush)"/><path d="M0 -2 L0 -17" stroke-width=".5"/></g>`;
  // A rose leaf: five leaflets on a short stalk.
  const leaf = (x: number, y: number, a: number, s: number) =>
    `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="M0 0 L0 -40"/>${leaflet(0, -40, 0, 1)}${leaflet(0, -28, -48, 0.9)}${leaflet(0, -28, 48, 0.9)}${leaflet(0, -14, -58, 0.8)}${leaflet(0, -14, 58, 0.8)}</g>`;
  return `<svg class="bot" viewBox="0 0 300 240" aria-hidden="true"><g fill="none" stroke="${colour}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round">
<path d="M306 236 C 262 196, 236 150, 214 92"/><path d="M306 150 C 284 120, 262 84, 262 34"/><path d="M262 238 C 220 220, 178 196, 150 160"/><path d="M190 228 C 160 222, 136 212, 124 198"/><path d="M236 150 C 220 120, 196 110, 176 108"/>
${leaf(232, 150, -36, 1.05)}${leaf(286, 96, -28, 0.9)}${leaf(196, 200, -78, 0.95)}${leaf(250, 196, 28, 0.85)}
${rose(216, 92, 1.12, 8)}${rose(268, 34, 0.82, -20)}${rose(154, 160, 0.9, 30)}
${bud(176, 108, 0.85, -62)}${bud(292, 4, 0.7, 30)}${bud(122, 196, 0.7, -110)}
</g></svg>`;
}

/**
 * Bloom: for florists, cake makers and wedding suppliers. A blush header across the top of the page with flowers drawn
 * in fine line, the name in a high-contrast serif, and the balance on a soft panel.
 */
export const bloom = {
  id: 'bloom',
  fonts: ['Bodoni Moda', 'Jost'] as const,
  footer: { font: 'Jost', inset: '18mm', color: '#8a6f74' },
  css: (v: DocumentView) => `
@page{size:A4;margin:16mm 0 20mm}
@page:first{margin-top:0}
@media screen{body{padding:0 0 20mm 0}}
:root{--brand:${v.brandColour};--bt:${onWhite(v.brandColour)};--ink:#3a2a2e;--soft:#7d686c;--blush:color-mix(in oklab,${v.brandColour} 13%,#fff);--line:color-mix(in oklab,${v.brandColour} 22%,#fff)}
body{font-family:'Jost',sans-serif;font-size:9.4pt;line-height:1.55;color:var(--ink)}
.bod{font-family:'Bodoni Moda',serif;font-optical-sizing:auto}
.head{position:relative;background:var(--blush);padding:13mm 18mm 10mm;overflow:hidden}
.bot{position:absolute;right:-4mm;top:-2mm;width:96mm;height:77mm}
.hrow{display:flex;align-items:center;gap:6mm;position:relative}
.logo{height:23mm;width:auto;max-width:60mm;object-fit:contain;flex:none}
.name{font-family:'Bodoni Moda';font-weight:500;font-size:23pt;letter-spacing:.16em;text-transform:uppercase;line-height:1.1}
.contact{margin-top:2.6mm;font-size:8.4pt;color:var(--soft);letter-spacing:.02em;line-height:1.6;max-width:100mm}
.contact span{display:inline-block;margin-right:5mm}
.wrap{padding:0 18mm}
.titlebar{display:flex;justify-content:space-between;align-items:baseline;margin:8mm 0 5mm;border-bottom:.6pt solid var(--line);padding-bottom:3mm}
.titlebar h1{font-family:'Bodoni Moda';font-style:italic;font-weight:400;font-size:30pt;line-height:1;margin:0}
.titlebar .no{font-size:10pt;letter-spacing:.06em}
.meta{display:grid;grid-template-columns:1fr auto;gap:10mm}
.lab{font-size:7.8pt;letter-spacing:.16em;text-transform:uppercase;color:var(--bt);margin-bottom:1.2mm}
.who .n{font-family:'Bodoni Moda';font-size:13pt;line-height:1.25}
.dates{display:grid;grid-template-columns:auto auto;gap:.6mm 8mm;margin:0}
.dates dt{color:var(--soft)}.dates dd{margin:0;text-align:right}
.intro{margin:7mm 0 4mm}
.intro h2{font-family:'Bodoni Moda';font-weight:500;font-size:17pt;line-height:1.15;margin:0 0 1.5mm}
.intro p{color:var(--soft);font-style:italic}
table.lines th{font-size:7.6pt;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.2mm 0;border-bottom:.5pt solid var(--line);vertical-align:baseline}
table.lines td+td,table.lines th+th{padding-left:6mm}
.l-title{font-family:'Bodoni Moda';font-size:11.5pt}
.l-desc{color:var(--soft);font-size:8.6pt}
.after{display:grid;grid-template-columns:1fr 80mm;gap:12mm;margin-top:5mm;align-items:start;break-inside:avoid}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.8mm 0}
.t-total{border-top:.6pt solid var(--ink);margin-top:1.2mm;padding-top:1.8mm;font-weight:500}
.t-payment,.t-note{color:var(--soft)}
.due{margin-top:3.5mm;background:var(--blush);border-radius:40mm;padding:4mm 9mm;text-align:center}
.due .d-label{font-size:7.8pt;letter-spacing:.16em;text-transform:uppercase;color:var(--bt)}
.due .d-value{font-family:'Bodoni Moda';font-weight:500;font-size:28pt;line-height:1.1}
.due .d-when{font-size:8.6pt;color:var(--soft)}
.pay{display:grid;gap:3mm;font-size:8.8pt}
.p-title{font-size:7.8pt;letter-spacing:.16em;text-transform:uppercase;color:var(--bt);margin-bottom:1mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.2mm 5mm;margin:0}
.pay dt{color:var(--soft)}.pay dd{margin:0}
.thanks{margin-top:7mm;text-align:center;font-family:'Bodoni Moda';font-style:italic;font-size:14pt;color:var(--bt)}
.small{text-align:center;font-size:8.4pt;color:var(--soft);margin-top:2mm}
.legal{margin-top:7mm;text-align:center;font-size:7.6pt;color:var(--soft)}
`,
  body: (v: DocumentView, logo: string | null) => `
<header class="head">
  ${botanical(v.brandColour)}
  <div class="hrow">${logo ? `<img class="logo" src="${esc(logo)}" alt="">` : ''}<div>
    <div class="name word">${esc(v.seller.name)}</div>
    <div class="contact"><div>${esc(v.seller.addressLines.join(', '))}</div>${v.seller.contactLines.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
  </div></div>
</header>
<div class="wrap">
<div class="titlebar"><h1>${esc(v.heading)}</h1><div class="no">${esc(v.number)}</div></div>
<section class="meta">
  <div class="who"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Prepared for'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after">
  <div>${paymentBlock(v)}</div>
  <div>${totalsBlock(v)}<div class="due"><div class="d-label">${esc(v.amountDue.label)}</div><div class="d-value">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</div></div>
</section>
${v.notes ? `<p class="thanks">${para(v.notes)}</p>` : ''}
${[v.creditNote, v.reverseChargeNote, v.sterlingRateNote, v.terms]
  .filter(Boolean)
  .map((x) => `<p class="small">${para(x)}</p>`)
  .join('')}
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
</div>
`,
};
