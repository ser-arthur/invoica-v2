import type { DocumentView } from '../view';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from './shared';

/**
 * Invoica's own template, the default and the free plan's. The amount due comes first, on a slip of the business's
 * colour at the top right with its corner turned down, the way Invoica's mark turns the corner of its i. Everything
 * else is quiet and exact: one row of facts, the parties, the lines on hairlines, and how to pay beside the totals.
 */
export const signature = {
  id: 'signature',
  footer: { font: 'Onest', inset: '0', color: '#5b6862' },
  fonts: ['Sora', 'Onest'] as const,
  css: (v: DocumentView) => `
@page{size:A4;margin:15mm 16mm 18mm}
@media screen{body{padding:15mm 16mm 18mm}}
:root{--brand:${v.brandColour};--on:${v.onBrand};--fold:color-mix(in oklab,${v.brandColour} 62%,#000);--ink:#16201b;--soft:#5b6862;--hair:#dfe5e1;--tint:color-mix(in oklab,${v.brandColour} 6%,#fff)}
body{font-family:'Onest',sans-serif;font-size:9.2pt;line-height:1.5;color:var(--ink);font-variant-numeric:tabular-nums}
.s{font-family:'Sora',sans-serif;letter-spacing:-.02em}
.head{display:grid;grid-template-columns:1fr 74mm;gap:12mm;align-items:start}
.who{display:flex;gap:4.5mm;align-items:center;min-width:0}
.who img{height:13mm;width:auto;max-width:44mm;object-fit:contain;display:block;flex:none}
.who .n{font-weight:600;font-size:15pt;line-height:1.15}
.who .a{font-size:8.4pt;color:var(--soft);margin-top:.8mm}
.who .a span{margin-right:3.5mm;white-space:nowrap}
.slip{position:relative;background:var(--brand);color:var(--on);padding:5.5mm 7mm 6mm;clip-path:polygon(0 0,calc(100% - 9mm) 0,100% 9mm,100% 100%,0 100%);break-inside:avoid}
.slip::after{content:'';position:absolute;top:0;right:0;width:9mm;height:9mm;background:linear-gradient(to bottom left,transparent 50%,var(--fold) 50%)}
.slip .k{font-size:8.4pt;opacity:.85}
.slip .amt{font-weight:600;font-size:25pt;line-height:1.08;margin-top:1mm;white-space:nowrap}
.slip .when{font-size:9pt;margin-top:1.2mm}
.facts{display:flex;flex-wrap:wrap;margin:8mm 0 6mm;border-top:1.4pt solid var(--ink);border-bottom:.5pt solid var(--hair)}
.facts>div{flex:1 1 27mm;padding:2.6mm 4mm 2.8mm 0;min-width:0}
.facts>div:first-child{flex:1.4 1 34mm}
.lab{font-size:7.8pt;color:var(--soft);margin-bottom:.6mm}
.facts .no{font-weight:600;font-size:13pt;line-height:1.15;overflow-wrap:anywhere}
.facts .v{font-weight:500}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-bottom:7mm}
.parties .nm{font-weight:600}
.parties .x{color:var(--soft);font-size:8.6pt;margin-top:.8mm}
.intro{margin:0 0 5mm;max-width:150mm}
.intro h2{font-weight:600;font-size:13pt;margin:0 0 1.2mm;line-height:1.2}
.intro p{color:#3a4640;margin:0}
table.lines th{font-size:7.8pt;font-weight:500;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.4mm 0;border-bottom:.4pt solid var(--hair);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:500}.l-desc{color:var(--soft);font-size:8.6pt;margin-top:.4mm}
.c-date{width:24mm;white-space:nowrap}
.c-amt{font-weight:500}
.after{display:grid;grid-template-columns:1fr 74mm;gap:12mm;margin-top:5mm;align-items:start}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{border-top:.6pt solid var(--ink);margin-top:1.2mm;padding-top:2mm;font-weight:600}
.t-payment,.t-note{color:var(--soft)}
.t-due{margin-top:2.4mm;padding:2.4mm 0 0;border-top:1.4pt solid var(--brand);font-weight:600;font-size:10.5pt}
.pay{background:var(--tint);padding:4.5mm 5mm;display:grid;gap:3.5mm}
.pay .t{font-weight:600;margin-bottom:1mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.5mm 5mm;margin:0;font-size:8.8pt}
.pay dt{color:var(--soft)}.pay dd{margin:0;font-weight:500;overflow-wrap:anywhere}
.notes{margin-top:6mm;display:grid;gap:3mm;font-size:8.8pt;color:#3a4640;max-width:150mm}
.n-title{font-weight:600;color:var(--ink);margin-bottom:.5mm}
.n-rc,.n-credit{font-weight:500;color:var(--ink)}
.legal{margin-top:6mm;padding-top:2.6mm;border-top:.4pt solid var(--hair);font-size:7.8pt;color:var(--soft)}
`,
  body: (v: DocumentView, logo: string | null) => {
    const due = v.dates.find((d) => d.label === 'Due');
    const facts = [...v.dates.filter((d) => d.label !== 'Due'), ...(due ? [due] : [])];
    const pay =
      v.payment.length || v.paymentLink
        ? `<div class="pay">${v.payment
            .map(
              (p) =>
                `<div><div class="t">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl></div>`,
            )
            .join(
              '',
            )}${v.paymentLink ? `<div><div class="t">Pay online</div><div class="word">${esc(v.paymentLink)}</div></div>` : ''}</div>`
        : '';
    return `
<header class="head">
  <div class="who">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><div class="n s word">${esc(v.seller.name)}</div><div class="a">${esc(v.seller.addressLines.join(', '))}</div>${
    v.seller.contactLines.length
      ? `<div class="a">${v.seller.contactLines.map((c) => `<span>${esc(c)}</span>`).join('')}</div>`
      : ''
  }</div></div>
  <div class="slip"><div class="k">${esc(v.amountDue.label)}</div><div class="amt s">${esc(v.amountDue.value)}</div>${
    v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''
  }</div>
</header>
<section class="facts">
  <div><div class="lab">${esc(v.heading)}</div><div class="no s">${esc(v.number)}</div></div>
  ${facts.map((d) => `<div><div class="lab">${esc(d.label)}</div><div class="v">${esc(d.value)}</div></div>`).join('')}
</section>
<section class="parties">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="nm word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${
    v.buyer.detailLines.length ? `<div class="x word">${lines(v.buyer.detailLines)}</div>` : ''
  }</div>
  <div><div class="lab">From</div><div class="nm word">${esc(v.seller.legalName ?? v.seller.name)}</div><div class="word">${lines(v.seller.addressLines)}</div>${
    v.seller.taxLine ? `<div class="x">${esc(v.seller.taxLine)}</div>` : ''
  }</div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2 class="s word">${esc(v.title)}</h2>` : ''}${v.summary ? `<p class="word">${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep">
  <div>${pay}</div>
  <div>${totalsBlock(v)}${
    v.totals.some((t) => t.kind === 'payment')
      ? `<div class="t-row t-due"><span>${esc(v.amountDue.label)}</span><span>${esc(v.amountDue.value)}</span></div>`
      : ''
  }</div>
</section>
${notesBlock(v)}
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`;
  },
};
