import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, para, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Feature: for interior designers, stylists and makers. The job is the headline, set large like the opening page of a
 * magazine feature with a standfirst under it, and the amount due closes the page on a band of the business's colour.
 */
export const editorial: ProtoTemplate = {
  id: 'editorial',
  name: 'Feature',
  fonts: ['Instrument Serif', 'Schibsted Grotesk'],
  footer: { font: 'Schibsted Grotesk', inset: '0', color: '#6d706a' },
  css: (v: DocumentView) => `
@page{size:A4;margin:14mm 16mm 18mm}
:root{--brand:${v.brandColour};--ink:#1d1f1c;--soft:#666a63;--line:#dcdad3;--on:#F2EEE5}
body{font-family:'Schibsted Grotesk',sans-serif;font-size:8.8pt;line-height:1.5;color:var(--ink);font-variant-numeric:lining-nums proportional-nums}
.is{font-family:'Instrument Serif',serif;font-weight:400}
.mast{display:flex;justify-content:space-between;align-items:center;padding-bottom:3.4mm;border-bottom:1.4pt solid var(--ink)}
.mast .who{display:flex;align-items:center;gap:3mm}
.mast img{width:9mm;height:9mm}
.mast .n{font-family:'Instrument Serif';font-size:17pt;line-height:1}
.mast .no{font-size:8.6pt;text-align:right}
.mast .no b{font-weight:600}
.open{display:grid;grid-template-columns:1fr 52mm;gap:10mm;margin-top:12mm;align-items:end}
.head{font-family:'Instrument Serif';font-size:58pt;line-height:.92;letter-spacing:-.012em;margin:0}
.stand{font-family:'Instrument Serif';font-style:italic;font-size:15pt;line-height:1.25;color:var(--soft);margin:4mm 0 0;max-width:120mm}
.byline{font-size:8.4pt;border-left:.6pt solid var(--line);padding-left:5mm}
.lab{font-weight:600;font-size:7.6pt;letter-spacing:.02em;color:var(--brand);margin-bottom:.8mm}
.byline .n{font-family:'Instrument Serif';font-size:13pt;line-height:1.2}
.byline .blk+.blk{margin-top:4mm}
.byline dl{display:grid;grid-template-columns:auto 1fr;gap:.2mm 4mm;margin:0}
.byline dt{color:var(--soft)}.byline dd{margin:0}
.rule{border-top:.6pt solid var(--line);margin:10mm 0 2mm}
table.lines th{font-weight:600;font-size:7.6pt;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:3mm 0;border-bottom:.6pt solid var(--line);vertical-align:baseline}
table.lines td+td,table.lines th+th{padding-left:6mm}
.l-title{font-family:'Instrument Serif';font-size:14pt;line-height:1.15}
.l-desc{color:var(--soft);font-size:8.4pt;margin-top:.6mm}
.c-amt{font-weight:500}
.sum{display:grid;grid-template-columns:1fr 72mm;gap:12mm;margin-top:3mm}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.9mm 0}
.t-total{border-top:.6pt solid var(--ink);margin-top:1.2mm;padding-top:1.8mm;font-weight:600}
.t-payment,.t-note{color:var(--soft)}
.small{font-size:8.4pt;color:var(--soft)}
.close{margin-top:10mm;background:var(--brand);color:var(--on);display:grid;grid-template-columns:1fr 1fr;gap:10mm;padding:8mm 9mm 8mm;break-inside:avoid}
.close .lab{color:color-mix(in srgb,var(--on) 72%,transparent)}
.close .amt{font-family:'Instrument Serif';font-size:44pt;line-height:1;letter-spacing:-.01em}
.close .when{font-family:'Instrument Serif';font-style:italic;font-size:13pt;margin-top:1.6mm}
.close dl{display:grid;grid-template-columns:auto 1fr;gap:.4mm 5mm;margin:0;font-size:8.6pt}
.close dt{color:color-mix(in srgb,var(--on) 72%,transparent)}.close dd{margin:0}
.close .link{margin-top:2.4mm;font-size:8.6pt}
.foot{display:grid;grid-template-columns:auto 1fr;gap:12mm;margin-top:4mm;font-size:7.6pt;color:var(--soft)}
.foot span{margin-right:4mm;white-space:nowrap}
.foot .lg{text-align:right;text-wrap:balance}
`,
  body: (v: DocumentView, logo: string | null) => {
    const bank = v.payment[0];
    const others = v.payment.slice(1);
    return `
<header class="mast">
  <div class="who">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div class="n word">${esc(v.seller.name)}</div></div>
  <div class="no">${esc(v.heading)} <b>${esc(v.number)}</b></div>
</header>
<section class="open">
  <div>
    <h1 class="head word">${esc(v.title ?? v.heading)}</h1>
    ${v.summary ? `<p class="stand">${para(v.summary)}</p>` : ''}
  </div>
  <div class="byline">
    <div class="blk"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'For'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
    <div class="blk"><dl>${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div>
  </div>
</section>
<div class="rule"></div>
${linesTable(v)}
<section class="sum keep">
  <div>${[v.notes, v.creditNote, v.reverseChargeNote, v.sterlingRateNote, v.terms].filter(Boolean).map((x) => `<p class="small">${para(x)}</p>`).join('')}</div>
  <div>${totalsBlock(v)}</div>
</section>
<section class="close">
  <div><div class="lab">${esc(v.amountDue.label)}</div><div class="amt">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
  <div>${bank ? `<div class="lab">${esc(bank.title)}</div><dl>${bank.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>` : ''}${others.map((p) => `<div class="lab" style="margin-top:2.4mm">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>`).join('')}${v.paymentLink ? `<div class="link">Or pay online at ${esc(v.paymentLink)}</div>` : ''}</div>
</section>
<footer class="foot keep"><div>${esc(v.seller.addressLines.join(', '))}<br>${v.seller.contactLines.map((c) => `<span>${esc(c)}</span>`).join('')}</div><div class="lg">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `<br>${esc(v.seller.taxLine)}` : ''}</div></footer>
`;
  },
};
