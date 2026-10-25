import type { DocumentView } from '../view';
import { esc, fitPt, lines, linesTable, notesBlock, para, totalsBlock } from './shared';

/**
 * Mark: for product studios, agencies, developers and consultancies with a mark worth showing. The logo leads at
 * size and again as a large tint cropped off the corner; figures in a mono; a pay button that works in the PDF.
 */
export const mark = {
  id: 'mark',
  fonts: ['Geist', 'Geist Mono'] as const,
  footer: { font: 'Geist', inset: '0' },
  css: (v: DocumentView) => `
@page{size:A4;margin:15mm 15mm 18mm}
@media screen{body{padding:15mm 15mm 18mm 15mm}}
:root{--brand:${v.brandColour};--on:${v.onBrand};--ink:#0f1115;--soft:#5d6470;--line:#e4e6ea;--tint:color-mix(in oklab,${v.brandColour} 6%,#fff);--tint2:color-mix(in oklab,${v.brandColour} 8%,#fff)}
body{font-family:'Geist',sans-serif;font-size:9pt;line-height:1.5;color:var(--ink)}
.mono{font-family:'Geist Mono',monospace}
.ghost{position:absolute;top:-6mm;right:0;width:120mm;height:120mm;opacity:.09;z-index:-1}
.ghost img{width:100%;height:100%;object-fit:contain}
.ghost.gl{opacity:1;color:var(--tint2);font-weight:800;font-size:330pt;line-height:.8;text-align:right;letter-spacing:-.06em;overflow:hidden}
.tile{width:24mm;height:24mm;border-radius:5mm;background:var(--brand);color:var(--on);display:grid;place-items:center;font-weight:700;font-size:34pt;letter-spacing:-.04em}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm}
.brand{display:flex;gap:5mm;align-items:center}
.brand img{height:24mm;width:auto;max-width:72mm;object-fit:contain}
.brand .n{font-weight:650;font-size:19pt;letter-spacing:-.03em;line-height:1.05}
.brand .s{color:var(--soft);font-size:8.4pt}
.ident{margin-top:13mm}
.ident .kind{color:var(--soft);font-size:9pt}
.ident .no{font-weight:600;font-size:${fitPt(v.number, 170, 0.6, 34, 18)}pt;letter-spacing:-.045em;line-height:1.05}
.meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8mm;margin:7mm 0 7mm;padding-top:4mm;border-top:.6pt solid var(--line)}
.lab{font-family:'Geist Mono';font-size:7.2pt;color:var(--soft);margin-bottom:1.4mm}
.n2{font-weight:600}
.extra{color:var(--soft)}
.dates{display:grid;grid-template-columns:auto 1fr;gap:.6mm 4mm;margin:0}
.dates dt{color:var(--soft)}.dates dd{margin:0;text-align:right;font-family:'Geist Mono';font-size:8.4pt}
.intro{margin:0 0 5mm}
.intro h2{font-weight:600;font-size:14pt;letter-spacing:-.02em;margin:0 0 1mm}
.intro p{color:var(--soft)}
table.lines th{font-family:'Geist Mono';font-weight:400;font-size:7.2pt;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.6mm 0;border-bottom:.6pt solid var(--line);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
table.lines td.num{font-family:'Geist Mono';font-size:8.4pt}
.l-title{font-weight:600}.l-desc{color:var(--soft)}
.after{display:grid;grid-template-columns:1fr 84mm;gap:12mm;margin-top:5mm;align-items:start;break-inside:avoid}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-row .num{font-family:'Geist Mono';font-size:8.4pt}
.t-total{border-top:.6pt solid var(--ink);margin-top:1.2mm;padding-top:2mm;font-weight:600}
.t-payment,.t-note{color:var(--soft)}
.due{margin-top:4mm;background:var(--brand);color:var(--on);border-radius:2.4mm;padding:4.5mm 5mm}
.due .row{display:flex;justify-content:space-between;align-items:baseline;gap:4mm}
.due .d-label{font-weight:500}
.due .d-value{font-family:'Geist Mono';font-weight:500;font-size:19pt;letter-spacing:-.04em}
.due .d-when{font-size:8.4pt;opacity:.85;margin-top:.4mm}
.button{display:block;margin-top:2.5mm;text-align:center;border:1pt solid var(--ink);border-radius:2.4mm;padding:3mm;color:var(--ink);text-decoration:none;font-weight:600}
.button span{display:block;font-family:'Geist Mono';font-weight:400;font-size:7.4pt;color:var(--soft);margin-top:.4mm}
.pay{background:var(--tint);border-radius:2.4mm;padding:4.5mm 5mm;display:grid;gap:3mm}
.p-title{font-weight:600;margin-bottom:.8mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.4mm 5mm;margin:0}
.pay dt{color:var(--soft)}.pay dd{margin:0;font-family:'Geist Mono';font-size:8.4pt}
.notes{margin-top:5mm;display:grid;gap:2.5mm;color:#333;max-width:120mm}
.n-title{font-weight:600;color:var(--ink)}
.legal{margin-top:5mm;color:var(--soft);font-size:7.4pt}
`,
  body: (v: DocumentView, logo: string | null) => {
    const bankOnly = v.payment;
    return `
${logo ? `<div class="ghost" aria-hidden="true"><img src="${esc(logo)}" alt=""></div>` : `<div class="ghost gl" aria-hidden="true">${esc(v.seller.name.slice(0, 1))}</div>`}
<header class="head">
  <div class="brand">${logo ? `<img src="${esc(logo)}" alt="">` : `<span class="tile">${esc(v.seller.name.slice(0, 1))}</span>`}<div><div class="n word">${esc(v.seller.name)}</div><div class="s">${esc(v.seller.contactLines[0] ?? '')}</div></div></div>
</header>
<div class="ident"><div class="kind">${esc(v.heading)}</div><div class="no">${esc(v.number)}</div></div>
<section class="meta">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="n2 word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${v.buyer.detailLines.length ? `<div class="extra">${lines(v.buyer.detailLines)}</div>` : ''}</div>
  <div><div class="lab">From</div><div class="n2 word">${esc(v.seller.legalName ?? v.seller.name)}</div><div class="word">${lines(v.seller.addressLines)}</div><div class="extra">${lines([...v.seller.contactLines.slice(1), v.seller.taxLine])}</div></div>
  <div><div class="lab">Dates</div><dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after">
  <div>${bankOnly.length ? `<div class="pay">${bankOnly.map((p) => `<div><div class="p-title">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl></div>`).join('')}</div>` : ''}</div>
  <div>${totalsBlock(v)}
    <div class="due"><div class="row"><span class="d-label">${esc(v.amountDue.label)}</span><span class="d-value">${esc(v.amountDue.value)}</span></div>${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
    ${v.paymentLink ? `<a class="button" href="https://${esc(v.paymentLink)}">Pay online<span>${esc(v.paymentLink)}</span></a>` : ''}
  </div>
</section>
${notesBlock(v)}
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`;
  },
};
