import type { DocumentView } from '../view';
import { esc, linesTable, lines, notesBlock, paymentBlock, para, totalsBlock } from './shared';

/** International style: the amount due set as large as a headline, a strict grid, one column of brand colour. */
export const poster = {
  id: 'poster',
  footer: { font: 'Onest', inset: '18mm' },
  fonts: ['Sora', 'Onest'] as const,
  css: (v: DocumentView) => `
@page{size:A4;margin:14mm 14mm 20mm 8mm;@top-left-corner{content:'';background:${v.brandColour}}@left-top{content:'';background:${v.brandColour}}@left-middle{content:'';background:${v.brandColour}}@left-bottom{content:'';background:${v.brandColour}}@bottom-left-corner{content:'';background:${v.brandColour}}}
body{font-family:'Onest',sans-serif;font-size:9pt;line-height:1.45;color:#111;padding-left:18mm}
@media screen{body{padding:14mm 14mm 20mm 26mm;background:linear-gradient(to right,${v.brandColour} 8mm,#fff 8mm)}}
.grid{display:grid;grid-template-columns:44mm 1fr;column-gap:8mm}
.lab{font-size:7.6pt;color:#6b6b6b;padding-top:1mm}
.head{padding-bottom:5mm}
.head .who{font-family:'Sora',sans-serif;font-weight:600;font-size:10.5pt;letter-spacing:-.01em}
.head .who img{max-height:12mm;max-width:50mm;display:block}
.head .kind{display:flex;justify-content:space-between;font-size:8.6pt;color:#6b6b6b;border-top:1.4pt solid #111;padding-top:1.6mm}
.amount{font-family:'Sora',sans-serif;font-weight:600;font-size:42pt;letter-spacing:-.045em;line-height:.95;margin:3mm 0 2mm;overflow-wrap:anywhere}
.when{font-size:11pt;font-weight:500}
.row{border-top:.6pt solid #111;padding:2.4mm 0 3.4mm}
.row .lab{color:#111;font-weight:600}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:8mm}
.dates{display:grid;grid-template-columns:repeat(3,auto);justify-content:start;gap:1mm 8mm;margin:0}
.dates dt{color:#6b6b6b;font-size:7.6pt}.dates dd{margin:0}
.intro h2{font-family:'Sora',sans-serif;font-size:13pt;font-weight:600;letter-spacing:-.02em;margin:0 0 1mm}
table.lines th{font-size:7.6pt;font-weight:500;color:#6b6b6b;text-align:left;padding:0 0 1.8mm;border-bottom:.6pt solid #111}
table.lines th.num{text-align:right}
table.lines td{padding:2.4mm 0;border-bottom:.4pt solid #d6d6d6;vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:4mm}
.l-title{font-weight:600}.l-desc{color:#555;margin-top:.4mm}
.totals .t-row{display:flex;justify-content:space-between;padding:.9mm 0}
.totals .t-total{font-family:'Sora',sans-serif;font-size:12pt;font-weight:600;border-top:1.4pt solid #111;margin-top:1.2mm;padding-top:2mm}
.totals .t-payment,.totals .t-note{color:#6b6b6b}
.split{display:grid;grid-template-columns:1fr 70mm;gap:8mm}
.pay{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.p-title{font-weight:600}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.4mm 4mm;margin:0}.pay dt{color:#6b6b6b}.pay dd{margin:0}
.notes{display:grid;gap:2.4mm}
.n-title{font-weight:600}
.legal{font-size:7.6pt;color:#6b6b6b}
`,
  body: (v: DocumentView, logo: string | null) => `
<header class="head grid">
  <div class="who">${logo ? `<img src="${esc(logo)}" alt="${esc(v.seller.name)}">` : esc(v.seller.name)}</div>
  <div>
    <div class="kind"><span>${esc(v.heading)} ${esc(v.number)}</span><span>${esc(v.amountDue.label)}</span></div>
    <div class="amount">${esc(v.amountDue.value)}</div>
    ${v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''}
  </div>
</header>
<section class="row grid keep"><div class="lab">Parties</div><div class="parties">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credited to' : 'To'}</div><strong class="word">${esc(v.buyer.name)}</strong><br>${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div>
  <div><div class="lab">From</div><strong class="word">${esc(v.seller.legalName ?? v.seller.name)}</strong><br>${lines([...v.seller.addressLines, v.seller.taxLine])}</div>
</div></section>
<section class="row grid keep"><div class="lab">Dates</div><dl class="dates">${v.dates.map((d) => `<div><dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd></div>`).join('')}</dl></section>
${v.title || v.summary ? `<section class="row grid keep intro"><div class="lab">Project</div><div>${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</div></section>` : ''}
<section class="row grid"><div class="lab">Work</div><div>${linesTable(v)}</div></section>
<section class="row grid keep"><div class="lab">Totals</div><div class="split"><div>${notesBlock(v)}</div>${totalsBlock(v)}</div></section>
${v.payment.length || v.paymentLink ? `<section class="row grid keep"><div class="lab">Payment</div>${paymentBlock(v)}</section>` : ''}
<section class="row grid keep"><div class="lab">Legal</div><div class="legal">${esc(v.legalLine)}${v.seller.contactLines.length ? `<br>${esc(v.seller.contactLines.join(', '))}` : ''}</div></section>
`,
};
