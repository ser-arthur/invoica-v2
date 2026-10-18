import type { DocumentView } from '../view';
import { esc, linesTable, lines, notesBlock, paymentBlock, para, totalsBlock } from './shared';

/** For studios and agencies: the brand colour as a band, the studio's name set large, the balance up front. */
export const studio = {
  id: 'studio',
  footer: { font: 'Onest', inset: '16mm' },
  fonts: ['Bricolage Grotesque', 'Onest'] as const,
  css: (v: DocumentView) => `
@page{size:A4;margin:0 0 20mm}
@page :first{margin-top:0}
@media screen{body{padding-bottom:20mm}}
body{font-family:'Onest',sans-serif;font-size:9.4pt;line-height:1.5;color:#161616}
.band{background:${v.brandColour};color:${v.onBrand};padding:14mm 16mm 10mm;display:grid;grid-template-columns:1fr auto;gap:10mm;align-items:end}
.band .name{font-family:'Bricolage Grotesque',sans-serif;font-size:30pt;font-weight:700;letter-spacing:-.035em;line-height:.95;max-width:110mm}
.band img{max-height:18mm;max-width:70mm;display:block}
.band .meta{text-align:right;font-size:8.8pt}
.band .meta .no{font-family:'Bricolage Grotesque',sans-serif;font-size:15pt;font-weight:600}
.inner{padding:0 16mm}
.top{display:grid;grid-template-columns:1fr 1fr;gap:10mm;padding:8mm 0 7mm;border-bottom:.6pt solid #161616}
.label{font-size:8pt;text-transform:none;color:#5d5d5d;margin-bottom:1mm}
.name2{font-weight:600}
.balance{text-align:right}
.balance .amt{font-family:'Bricolage Grotesque',sans-serif;font-size:30pt;font-weight:700;letter-spacing:-.035em;line-height:1}
.balance .when{color:#5d5d5d;margin-top:1.5mm}
.dates{display:flex;flex-wrap:wrap;gap:2mm 8mm;margin:4mm 0 7mm;font-size:8.8pt}
.dates span{color:#5d5d5d}
.intro{margin-bottom:6mm}
.intro h2{font-family:'Bricolage Grotesque',sans-serif;font-size:14pt;font-weight:600;margin:0 0 1.5mm;letter-spacing:-.02em}
table.lines{counter-reset:row}
table.lines th{font-size:8pt;font-weight:500;color:#5d5d5d;text-align:left;padding:0 0 2mm;border-bottom:.6pt solid #161616}
table.lines th.num{text-align:right}
table.lines td{padding:3.2mm 0;border-bottom:.4pt solid #e2e2e2;vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
table.lines tbody tr{counter-increment:row}
table.lines tbody .l-title::before{content:counter(row,decimal-leading-zero);font-family:'Bricolage Grotesque',sans-serif;color:${v.brandColour};font-weight:600;margin-right:3mm}
.l-title{font-weight:600}.l-desc{color:#5d5d5d;font-size:8.6pt;margin-top:.6mm;padding-left:7.5mm}
.after{display:grid;grid-template-columns:1fr 74mm;gap:12mm;margin-top:6mm}
.totals .t-row{display:flex;justify-content:space-between;padding:1.1mm 0}
.totals .t-total{font-family:'Bricolage Grotesque',sans-serif;font-size:13pt;font-weight:700;border-top:1.6pt solid #161616;margin-top:1.5mm;padding-top:2mm}
.totals .t-payment,.totals .t-note{color:#5d5d5d}
.pay{display:grid;gap:3mm;font-size:8.8pt}
.p-title{font-weight:600}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.6mm 5mm;margin:0}.pay dt{color:#5d5d5d}.pay dd{margin:0}
.notes{margin-top:8mm;display:grid;gap:3mm;font-size:8.8pt}
.n-title{font-weight:600}
.legal{margin-top:9mm;font-size:7.8pt;color:#5d5d5d}
`,
  body: (v: DocumentView, logo: string | null) => `
<header class="band">
  <div>${logo ? `<img src="${esc(logo)}" alt="${esc(v.seller.name)}">` : `<div class="name word">${esc(v.seller.name)}</div>`}</div>
  <div class="meta"><div>${esc(v.heading)}</div><div class="no">${esc(v.number)}</div></div>
</header>
<div class="inner">
<section class="top">
  <div><div class="label">${v.kind === 'credit_note' ? 'Credit to' : 'For'}</div><div class="name2 word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <div class="balance"><div class="label">${esc(v.amountDue.label)}</div><div class="amt">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
</section>
<div class="dates">${v.dates.map((d) => `<div><span>${esc(d.label)}</span> ${esc(d.value)}</div>`).join('')}</div>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep"><div>${paymentBlock(v)}</div><div>${totalsBlock(v)}</div></section>
${notesBlock(v)}
<footer class="legal keep">${lines([v.seller.name, ...v.seller.addressLines]).replace(/<br>/g, ', ')}<br>${esc([v.seller.companyLine, v.seller.taxLine, ...v.seller.contactLines].filter(Boolean).join('. '))}</footer>
</div>
`,
};
