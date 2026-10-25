import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, notesBlock, para, paymentBlock, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Grid: for architects, design studios and photographers. Everything placed on six columns, the number set wide
 * across the top, and the amount due in one framed cell of the brand colour.
 */
export const grid: ProtoTemplate = {
  id: 'grid',
  name: 'Grid',
  fonts: ['Mona Sans'],
  footer: { font: 'Mona Sans', inset: '0' },
  css: (v: DocumentView) => `
@page{size:A4;margin:14mm 14mm 18mm}
:root{--brand:${v.brandColour};--on:#F5EEE6;--ink:#151515;--soft:#6f6d6a;--hair:#dedbd6}
body{font-family:'Mona Sans',sans-serif;font-size:8.8pt;line-height:1.45;color:var(--ink);font-variant-numeric:lining-nums proportional-nums}
.g{display:grid;grid-template-columns:repeat(6,1fr);column-gap:4mm}
.lab{font-size:7.4pt;font-weight:600;color:var(--soft);margin-bottom:1.2mm;font-stretch:90%}
.top{align-items:start;padding-top:1mm}
.brand{grid-column:1/4;display:flex;gap:4.5mm;align-items:flex-start}
.logo{flex:none;width:13mm;height:13mm}
.logo img{width:100%;height:100%;object-fit:contain}
.logo .sq{width:100%;height:100%;background:var(--ink);color:#fff;display:flex;align-items:flex-end;justify-content:flex-end;padding:1.2mm 1.6mm;font-weight:800;font-stretch:125%;font-size:15pt;line-height:1;box-shadow:inset -5mm -5mm 0 0 var(--brand)}
.who .n{font-weight:700;font-size:10pt;line-height:1.25;margin-top:-.3mm}
.contact{grid-column:4/6;color:var(--soft)}
.kind{grid-column:6/7;text-align:right;font-weight:600}
.no{margin:13mm 0 8mm;font-weight:800;font-stretch:125%;font-size:62pt;line-height:.86;letter-spacing:-.045em;white-space:nowrap}
.rule{grid-column:1/7;border-top:1pt solid var(--ink);margin-bottom:2.5mm}
.facts{row-gap:6mm;margin-bottom:9mm}
.f-to{grid-column:1/3}.f-proj{grid-column:3/5}.f-dates{grid-column:5/7}
.f-to .n{font-weight:700}
.f-proj .t{font-weight:700;font-size:10pt;line-height:1.3}
.f-proj p{color:var(--soft);margin-top:.6mm}
.dates{display:grid;grid-template-columns:1fr auto;gap:.4mm 3mm;margin:0}
.dates dt{color:var(--soft)}.dates dd{margin:0;text-align:right;font-weight:500}
table.lines{table-layout:fixed}
table.lines th{font-size:7.4pt;font-weight:600;font-stretch:90%;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:1pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.8mm 0 3.2mm;border-bottom:.5pt solid var(--hair);vertical-align:top}
.c-desc{width:auto}.c-qty,.c-unit,.c-tax{width:31mm}.c-amt{width:27mm}
.l-title{font-weight:650;font-size:9.4pt}.l-desc{color:var(--soft)}
.after{margin-top:6mm;align-items:start;break-inside:avoid}
.after .payc{grid-column:1/4;padding-right:10mm;display:grid;gap:6mm}
.after .totc{grid-column:4/7}
.t-row{display:flex;justify-content:space-between;gap:4mm;padding:.8mm 0}
.t-total{border-top:1pt solid var(--ink);margin-top:1.2mm;padding-top:1.8mm;font-weight:700}
.t-payment,.t-note{color:var(--soft)}
.p-title{font-weight:700;margin-bottom:.8mm}
.pay{display:grid;gap:3mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.2mm 4mm;margin:0}
.pay dt{color:var(--soft)}.pay dd{margin:0}
.cell{margin-top:5mm;background:var(--brand);color:var(--on);padding:2.2mm}
.cell .in{border:.5pt solid color-mix(in srgb,var(--on) 45%,transparent);padding:4mm 4mm 4.2mm;min-height:36mm;display:flex;flex-direction:column;justify-content:space-between}
.cell .top2{display:flex;justify-content:space-between;font-size:7.6pt;font-weight:500;font-stretch:112%;letter-spacing:.06em;text-transform:uppercase}
.cell .d-value{font-weight:500;font-stretch:118%;font-size:30pt;line-height:1;letter-spacing:-.035em;white-space:nowrap}
.cell .d-when{font-size:8.2pt;margin-top:1.6mm;opacity:.85}
.notes{display:grid;gap:2.5mm;color:#333}
.n-title{font-weight:700;color:var(--ink)}
.legal{margin-top:9mm;padding-top:2.2mm;border-top:.5pt solid var(--hair);color:var(--soft);font-size:7.4pt}
`,
  body: (v: DocumentView, logo: string | null) => `
<header class="g top">
  <div class="brand"><div class="logo">${logo ? `<img src="${esc(logo)}" alt="">` : `<span class="sq">${esc(v.seller.name.slice(0, 1))}</span>`}</div>
  <div class="who"><div class="n word">${esc(v.seller.name)}</div><div class="word">${lines(v.seller.addressLines)}</div></div></div>
  <div class="contact word">${lines([...v.seller.contactLines])}</div>
  <div class="kind">${esc(v.heading)}</div>
</header>
<div class="no">${esc(v.number)}</div>
<section class="g facts">
  <div class="rule"></div>
  <div class="f-to"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'To'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <div class="f-proj">${v.title || v.summary ? `<div class="lab">Project</div>${v.title ? `<div class="t">${esc(v.title)}</div>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}` : ''}</div>
  <div class="f-dates"><div class="lab">Dates</div><dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div>
</section>
${linesTable(v)}
<section class="g after"><div class="payc">${paymentBlock(v)}${notesBlock(v)}</div><div class="totc">${totalsBlock(v)}<div class="cell"><div class="in"><div class="top2"><span>${esc(v.amountDue.label)}</span><span>${esc(v.number)}</span></div><div><div class="d-value">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</div></div></div></div></section>
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`,
};
