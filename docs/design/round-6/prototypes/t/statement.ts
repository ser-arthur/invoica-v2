import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, para } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Statement: for bookkeepers, IT contractors, engineers and anyone billed by someone's finance team. The answers
 * first: number, dates and the amount due in a row of boxed cells at the top, then the lines as a ruled sheet with
 * numbered rows and every figure in a mono.
 */
export const statement: ProtoTemplate = {
  id: 'statement',
  name: 'Statement',
  fonts: ['IBM Plex Sans', 'IBM Plex Mono'],
  footer: { font: 'IBM Plex Sans', inset: '0' },
  css: (v: DocumentView) => `
@page{size:A4;margin:14mm 14mm 18mm}
:root{--brand:${v.brandColour};--on:${v.onBrand};--ink:#16191d;--soft:#5b6370;--rule:#c9ced6;--fill:#f2f4f6}
body{font-family:'IBM Plex Sans',sans-serif;font-size:8.9pt;line-height:1.45;color:var(--ink)}
.mono{font-family:'IBM Plex Mono',monospace}
.head{display:flex;justify-content:space-between;align-items:center;gap:8mm;margin-bottom:7mm}
.brand{display:flex;align-items:center;gap:3.5mm}
.brand img{width:12mm;height:12mm;object-fit:contain}
.brand .n{font-weight:600;font-size:15pt;letter-spacing:-.01em}
.contact{text-align:right;font-family:'IBM Plex Mono';font-size:7.8pt;color:var(--soft);line-height:1.5}
.cells{display:grid;border:.8pt solid var(--ink);border-right:0}
.cells>div{border-right:.8pt solid var(--ink);padding:2.4mm 3mm 2.6mm}
.facts{grid-template-columns:1fr 1fr 1fr 1.35fr}
.lab{font-size:7.4pt;color:var(--soft);margin-bottom:.6mm}
.val{font-family:'IBM Plex Mono';font-size:10.5pt}
.facts .due{background:var(--brand);color:var(--on)}
.facts .due .lab{color:inherit;opacity:.85}
.facts .due .val{font-weight:700;font-size:15pt;line-height:1.15}
.facts .kind .val{font-family:'IBM Plex Sans';font-weight:600}
.parties{grid-template-columns:1fr 1fr;border-top:0}
.parties .n{font-weight:600}
.extra{color:var(--soft)}
.sub{margin:6mm 0 3mm;display:flex;justify-content:space-between;align-items:baseline;gap:8mm}
.sub h2{font-size:12pt;font-weight:600;margin:0}
.sub p{color:var(--soft)}
table.sheet{border:.8pt solid var(--ink)}
.sheet th{background:var(--fill);font-weight:500;font-size:7.6pt;color:var(--soft);text-align:left;padding:1.8mm 2.5mm;border-bottom:.8pt solid var(--ink);border-right:.4pt solid var(--rule)}
.sheet th.num{text-align:right}
.sheet td{padding:2.2mm 2.5mm;border-bottom:.4pt solid var(--rule);border-right:.4pt solid var(--rule);vertical-align:top}
.sheet td.num,.sheet td.i{font-family:'IBM Plex Mono';font-size:8.3pt}
.sheet td.i{color:var(--soft);width:9mm}
.sheet .l-desc{color:var(--soft);font-size:8.3pt}
.sheet th:last-child,.sheet td:last-child{border-right:0}
.lower{display:grid;grid-template-columns:1fr 78mm;gap:8mm;margin-top:5mm;align-items:start;break-inside:avoid}
.tot{border:.8pt solid var(--ink)}
.tot .r{display:flex;justify-content:space-between;gap:4mm;padding:1.6mm 2.5mm;border-bottom:.4pt solid var(--rule)}
.tot .r:last-child{border-bottom:0}
.tot .r .v{font-family:'IBM Plex Mono';font-size:8.3pt}
.tot .total{background:var(--fill);font-weight:600}
.tot .soft{color:var(--soft)}
.tot .due{background:var(--brand);color:var(--on);font-weight:600}
.tot .due .v{font-weight:700;font-size:10pt}
.payto{border:.8pt solid var(--ink)}
.payto .h{background:var(--fill);padding:1.8mm 2.5mm;border-bottom:.8pt solid var(--ink);font-weight:600}
.payto dl{display:grid;grid-template-columns:auto 1fr;margin:0}
.payto dt,.payto dd{padding:1.4mm 2.5mm;border-bottom:.4pt solid var(--rule);margin:0}
.payto dt{color:var(--soft);border-right:.4pt solid var(--rule)}
.payto dd{font-family:'IBM Plex Mono';font-size:8.3pt}
.payto dl:last-child dt:nth-last-child(2),.payto dl:last-child dd:last-child{border-bottom:0}
.words{margin-top:6mm;display:grid;gap:2mm;color:#333;max-width:150mm}
.words b{color:var(--ink)}
.legal{margin-top:6mm;font-size:7.4pt;color:var(--soft)}
`,
  body: (v: DocumentView, logo: string | null) => {
    const c = v.columns;
    const head = [
      '<th>#</th>',
      c.date ? '<th>Date</th>' : '',
      '<th>Description</th>',
      c.quantity ? `<th class="num">${esc(c.quantityLabel)}</th>` : '',
      c.unitPrice ? `<th class="num">${esc(c.unitPriceLabel)}</th>` : '',
      c.tax ? `<th class="num">${esc(c.taxLabel)}</th>` : '',
      '<th class="num">Amount</th>',
    ].join('');
    const rows = v.lines
      .map(
        (l, i) =>
          `<tr><td class="i">${String(i + 1).padStart(2, '0')}</td>${c.date ? `<td class="num">${esc(l.date)}</td>` : ''}<td class="word"><div>${esc(l.title)}</div>${l.description ? `<div class="l-desc">${para(l.description)}</div>` : ''}</td>${c.quantity ? `<td class="num">${esc(l.quantity)}</td>` : ''}${c.unitPrice ? `<td class="num">${esc(l.unitPrice)}</td>` : ''}${c.tax ? `<td class="num">${esc(l.tax)}</td>` : ''}<td class="num">${esc(l.amount)}</td></tr>`,
      )
      .join('');
    const dueDate = v.dates.find((d) => d.label === 'Due');
    const facts = [
      { k: 'kind', lab: v.heading, val: v.number },
      ...v.dates.filter((d) => d.label !== 'Due' && d.label !== 'Your reference').slice(0, 1).map((d) => ({ k: '', lab: d.label, val: d.value })),
      ...(dueDate ? [{ k: '', lab: 'Due', val: dueDate.value }] : []),
      { k: 'due', lab: v.amountDue.label, val: v.amountDue.value },
    ];
    const extraDates = v.dates.filter((d) => !facts.some((f) => f.lab === d.label));
    return `
<header class="head">
  <div class="brand">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<span class="n word">${esc(v.seller.name)}</span></div>
  <div class="contact">${lines([...v.seller.contactLines, v.seller.taxLine])}</div>
</header>
<section class="cells facts" style="grid-template-columns:${facts.map((f) => (f.k === 'due' ? '1.35fr' : '1fr')).join(' ')}">${facts
      .map((f) => `<div class="${f.k}"><div class="lab">${esc(f.lab)}</div><div class="val">${esc(f.val)}</div></div>`)
      .join('')}</section>
<section class="cells parties">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${v.buyer.detailLines.length ? `<div class="extra">${lines(v.buyer.detailLines)}</div>` : ''}</div>
  <div><div class="lab">From</div><div class="n word">${esc(v.seller.legalName ?? v.seller.name)}</div><div class="word">${lines(v.seller.addressLines)}</div>${extraDates.length ? `<div class="extra">${extraDates.map((d) => `${esc(d.label)} ${esc(d.value)}`).join('<br>')}</div>` : ''}</div>
</section>
${v.title || v.summary ? `<div class="sub">${v.title ? `<h2>${esc(v.title)}</h2>` : '<span></span>'}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</div>` : '<div style="height:6mm"></div>'}
<table class="sheet"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
<section class="lower">
  <div>${v.payment
    .map((p) => `<div class="payto"><div class="h">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl></div>`)
    .join('')}${v.paymentLink ? `<p style="margin-top:2mm">Or pay online: <span class="mono">${esc(v.paymentLink)}</span></p>` : ''}</div>
  <div class="tot">${v.totals
    .map((t) => `<div class="r ${t.kind === 'total' ? 'total' : t.kind === 'payment' || t.kind === 'note' ? 'soft' : ''}"><span>${esc(t.label)}</span><span class="v">${esc(t.value)}</span></div>`)
    .join('')}<div class="r due"><span>${esc(v.amountDue.label)}</span><span class="v">${esc(v.amountDue.value)}</span></div></div>
</section>
<section class="words">${[
      v.creditNote ? `<p><b>${esc(v.creditNote)}</b></p>` : '',
      v.reverseChargeNote ? `<p><b>${esc(v.reverseChargeNote)}</b></p>` : '',
      v.sterlingRateNote ? `<p>${esc(v.sterlingRateNote)}</p>` : '',
      v.notes ? `<p><b>Notes.</b> ${para(v.notes)}</p>` : '',
      v.terms ? `<p><b>Terms.</b> ${para(v.terms)}</p>` : '',
    ].join('')}</section>
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`;
  },
};
