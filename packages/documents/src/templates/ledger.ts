import type { DocumentView } from '../view';
import { esc, linesTable, lines, notesBlock, paymentBlock, para, totalsBlock } from './shared';

/** An accountant's ledger page: a ruled margin on every page, a folio number, figures set in a mono face. */
export const ledger = {
  id: 'ledger',
  footer: { font: 'JetBrains Mono', inset: '0' },
  fonts: ['Newsreader', 'JetBrains Mono'] as const,
  css: (v: DocumentView) => `
@page{size:A4;margin:18mm 16mm 20mm 34mm}
@media screen{body{padding:18mm 16mm 20mm 34mm}}
body{font-family:'Newsreader',serif;font-size:10.4pt;line-height:1.5;color:#1c211e}
.margin{position:fixed;top:0;bottom:0;left:-9mm;width:1.6mm;border-left:.6pt solid ${v.brandColour};border-right:.6pt solid ${v.brandColour}}
@media screen{.margin{left:25mm}}
.head{display:flex;justify-content:space-between;align-items:baseline;gap:10mm;padding-bottom:3mm;border-bottom:1.2pt solid #1c211e}
.firm{font-size:19pt;font-weight:500;font-variant:small-caps;letter-spacing:.05em}
.firm img{max-height:15mm;max-width:70mm;display:block}
.folio{font-family:'JetBrains Mono',monospace;font-size:9pt;color:#4d5650;text-align:right}
.folio .no{font-size:15pt;color:#1c211e;font-weight:500}
.sub{display:flex;justify-content:space-between;gap:10mm;font-size:9pt;color:#4d5650;padding:1.6mm 0 0;border-top:.4pt solid #1c211e;margin-top:.8mm}
.parties{display:grid;grid-template-columns:1fr 1fr 48mm;gap:7mm;margin:8mm 0 7mm}
.label{font-style:italic;color:#5b645e;font-size:9.2pt}
.name{font-weight:600}
.dates{display:grid;grid-template-columns:auto 1fr;gap:.6mm 4mm;font-size:9.2pt;margin:0}
.dates dt{font-style:italic;color:#5b645e}.dates dd{margin:0;text-align:right;font-family:'JetBrains Mono',monospace;font-size:8.6pt}
.intro{margin-bottom:6mm}.intro h2{font-size:13pt;font-weight:600;margin:0 0 1mm}
table.lines{font-size:10pt}
table.lines th{font-weight:400;font-style:italic;font-size:9pt;color:#5b645e;text-align:left;padding:0 0 1.6mm;border-bottom:.8pt solid #1c211e}
table.lines th.num{text-align:right}
table.lines td{padding:2.2mm 0;border-bottom:.35pt solid ${v.brandColour}55;vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
table.lines td.num{font-family:'JetBrains Mono',monospace;font-size:8.8pt}
.l-title{font-weight:500}.l-desc{color:#4d5650;font-size:9.2pt;font-style:italic}
.after{display:grid;grid-template-columns:1fr 78mm;gap:10mm;margin-top:6mm}
.totals .t-row{display:flex;justify-content:space-between;padding:1mm 0}
.totals .num{font-family:'JetBrains Mono',monospace;font-size:8.8pt}
.totals .t-total{border-top:.8pt solid #1c211e;border-bottom:2.2pt double #1c211e;margin-top:1.2mm;padding:2mm 0;font-weight:600}
.totals .t-total .num{font-size:10pt;font-weight:600}
.totals .t-payment,.totals .t-note{font-style:italic;color:#4d5650}
.due{margin-top:4mm;display:flex;justify-content:space-between;align-items:baseline;padding:2.6mm 3mm;background:${v.brandColour}14;border-left:1.6pt solid ${v.brandColour}}
.due .d-value{font-family:'JetBrains Mono',monospace;font-size:13pt;font-weight:600}
.due .d-when{font-style:italic;font-size:9pt;color:#4d5650}
.pay{font-size:9.4pt;display:grid;gap:3mm}
.p-title{font-weight:600}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.4mm 5mm;margin:0}.pay dt{font-style:italic;color:#5b645e}.pay dd{margin:0;font-family:'JetBrains Mono',monospace;font-size:8.6pt}
.notes{margin-top:8mm;display:grid;gap:3mm;font-size:9.6pt}
.n-title{font-weight:600}
.legal{margin-top:10mm;font-size:8.4pt;color:#5b645e;font-style:italic;border-top:.4pt solid #1c211e;padding-top:2mm}
`,
  body: (v: DocumentView, logo: string | null) => `
<div class="margin" aria-hidden="true"></div>
<header class="head">
  <div class="firm">${logo ? `<img src="${esc(logo)}" alt="${esc(v.seller.name)}">` : esc(v.seller.name)}</div>
  <div class="folio">${esc(v.heading)}<div class="no">${esc(v.number)}</div></div>
</header>
<div class="sub"><span>${esc([...v.seller.addressLines].join(', '))}</span><span>${esc(v.seller.contactLines[0] ?? '')}</span></div>
<section class="parties">
  <div><div class="label">${v.kind === 'credit_note' ? 'Credited to' : 'Account of'}</div><div class="name word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <div><div class="label">From</div><div class="name word">${esc(v.seller.legalName ?? v.seller.name)}</div><div>${lines([v.seller.taxLine, v.seller.contactLines[1] ?? null])}</div></div>
  <dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep"><div>${paymentBlock(v)}</div><div>${totalsBlock(v)}<div class="due"><span>${esc(v.amountDue.label)}${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</span><span class="d-value">${esc(v.amountDue.value)}</span></div></div></section>
${notesBlock(v)}
<footer class="legal keep">${esc(v.legalLine)}</footer>
`,
};
