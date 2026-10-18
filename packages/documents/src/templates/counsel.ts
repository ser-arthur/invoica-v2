import type { DocumentView } from '../view';
import { esc, linesTable, lines, notesBlock, paymentBlock, para, totalsBlock } from './shared';

/** For professional practices: a centred letterhead, a serif voice and a formal tax summary. */
export const counsel = {
  id: 'counsel',
  footer: { font: 'Newsreader', inset: '0' },
  fonts: ['Newsreader'] as const,
  css: (v: DocumentView) => `
@page{size:A4;margin:16mm 20mm 22mm}
@media screen{body{padding:16mm 20mm 22mm}}
body{font-family:'Newsreader',serif;font-size:10.2pt;line-height:1.45;color:#1d2430}
.letterhead{text-align:center;padding-bottom:4.5mm;border-bottom:.6pt solid ${v.brandColour}}
.rule{border-top:.6pt solid ${v.brandColour};margin-top:1mm;margin-bottom:9mm}
.firm{font-size:21pt;font-weight:500;letter-spacing:.04em;font-variant:small-caps;color:${v.brandColour};line-height:1.1}
.firm img{max-height:16mm;max-width:70mm}
.contact{color:#555e6b;font-size:8.8pt;margin-top:2mm}
.top{display:grid;grid-template-columns:1fr 70mm;gap:12mm;margin-bottom:8mm}
h1{font-size:14.5pt;font-weight:600;margin:0 0 3mm}
.label{color:#666f7c;font-size:9pt;font-style:italic}
.to .name{font-weight:600}
dl.facts{display:grid;grid-template-columns:auto 1fr;gap:1.2mm 6mm;margin:0;font-size:9.6pt}
dl.facts dt{color:#666f7c;font-style:italic}dl.facts dd{margin:0;text-align:right}
.intro{margin-bottom:6mm}.intro h2{font-size:12pt;font-weight:600;margin:0 0 1mm}
table.lines th{font-weight:600;font-size:9pt;text-align:left;padding:0 0 2mm;border-bottom:.6pt solid #1d2430}
table.lines th.num{text-align:right}
table.lines td{padding:2.8mm 0;border-bottom:.4pt solid #cfd4db;vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:500}.l-desc{color:#555e6b;font-size:9.2pt;font-style:italic;margin-top:.4mm}
.after{display:grid;grid-template-columns:1fr 74mm;gap:12mm;margin-top:6mm}
.totals .t-row{display:flex;justify-content:space-between;padding:1.2mm 0}
.totals .t-total{border-top:.6pt solid #1d2430;border-bottom:1.8pt double #1d2430;margin-top:1.5mm;padding:2.2mm 0;font-weight:600;font-size:11.5pt;color:${v.brandColour}}
.totals .t-payment,.totals .t-note{color:#555e6b;font-style:italic}
.due{margin-top:3mm;text-align:right;font-size:9.4pt}
.due strong{font-size:11.5pt}
.pay{display:grid;gap:3mm;font-size:9.4pt}
.p-title{font-weight:600}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.5mm 5mm;margin:0}.pay dt{color:#666f7c;font-style:italic}.pay dd{margin:0}
.notes{margin-top:8mm;display:grid;gap:3mm;font-size:9.4pt}
.n-title{font-weight:600}
.legal{margin-top:10mm;text-align:center;font-size:8.2pt;color:#666f7c;border-top:.4pt solid #cfd4db;padding-top:3mm}
`,
  body: (v: DocumentView, logo: string | null) => `
<header class="letterhead">
  <div class="firm">${logo ? `<img src="${esc(logo)}" alt="${esc(v.seller.name)}">` : esc(v.seller.name)}</div>
  <div class="contact">${esc(v.seller.addressLines.join(', '))}${v.seller.contactLines.length ? `<br>${esc(v.seller.contactLines.join('   '))}` : ''}</div>
</header><div class="rule"></div>
<section class="top">
  <div class="to"><h1>${esc(v.heading)}</h1><div class="label">${v.kind === 'credit_note' ? 'Credited to' : 'To'}</div><div class="name word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <dl class="facts"><dt>Number</dt><dd>${esc(v.number)}</dd>${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep"><div>${paymentBlock(v)}</div><div>${totalsBlock(v)}<div class="due">${esc(v.amountDue.label)}: <strong>${esc(v.amountDue.value)}</strong>${v.amountDue.dueLine ? `<br>${esc(v.amountDue.dueLine)}` : ''}</div></div></section>
${notesBlock(v)}
<footer class="legal keep">${esc(v.legalLine)}</footer>
`,
};
