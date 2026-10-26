import type { DocumentView } from '../view';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from './shared';

/**
 * Monochrome, from the first Invoica: the business's name large in grey at the left, the kind of document larger and
 * lighter at the right over its number and dates in mono, a grey band over the lines, the figures in mono and the total
 * under a heavier rule. No colour at all: the logo is set in grey too.
 */
export const monochrome = {
  id: 'monochrome',
  footer: { font: 'Onest', inset: '0', color: '#6b6b6b' },
  fonts: ['Sora', 'Onest', 'JetBrains Mono'] as const,
  css: (_v: DocumentView) => `
@page{size:A4;margin:16mm 17mm 18mm}
@media screen{body{padding:16mm 17mm 18mm}}
body{font-family:'Onest',sans-serif;font-size:9.2pt;line-height:1.5;color:#4a4a4a;font-variant-numeric:tabular-nums}
.s{font-family:'Sora',sans-serif;letter-spacing:-.02em}
.m{font-family:'JetBrains Mono',monospace;letter-spacing:-.01em}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;padding-bottom:5mm;border-bottom:.6pt solid #e2e2e2}
.who{min-width:0}
.who img{height:10mm;width:auto;max-width:40mm;object-fit:contain;display:block;margin-bottom:3mm;filter:grayscale(1) contrast(1.05);opacity:.85}
.who .n{font-weight:800;font-size:19pt;line-height:1.1;color:#5c5c5c}
.who .a{font-size:8.6pt;color:#707070;margin-top:2mm;line-height:1.55}
.kind{text-align:right;flex:none}
.kind .k{font-weight:800;font-size:27pt;line-height:1;color:#a8a8a8}
.kind dl{display:grid;grid-template-columns:auto auto;justify-content:end;gap:.6mm 3mm;margin:3mm 0 0;font-size:8.6pt;color:#5c5c5c}
.kind dt{color:#8a8a8a}.kind dd{margin:0;color:#333333}
.billed{margin:6mm 0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10mm;align-items:end}
.lab{font-family:'Sora',sans-serif;font-weight:600;font-size:8pt;color:#8a8a8a;letter-spacing:.06em;margin-bottom:1.6mm}
.billed .nm{font-weight:600;font-size:12pt;color:#3d3d3d;line-height:1.25}
.billed .x{font-size:8.8pt;color:#666666}
.due{text-align:right}
.due .v{font-weight:700;font-size:16pt;color:#333333;line-height:1.1;white-space:nowrap}
.due .w{font-size:8.4pt;color:#707070;margin-top:1mm}
.intro{margin:0 0 6mm;max-width:150mm}
.intro h2{font-weight:600;font-size:11.5pt;margin:0 0 1mm;color:#3d3d3d}
.intro p{color:#666666;margin:0}
table.lines th{background:#ececec;font-family:'JetBrains Mono',monospace;font-size:7.6pt;font-weight:600;letter-spacing:.04em;color:#555555;text-align:left;padding:2.6mm 3mm}
table.lines th:first-child{border-radius:1.6mm 0 0 1.6mm}
table.lines th:last-child{border-radius:0 1.6mm 1.6mm 0}
table.lines th.num{text-align:right}
table.lines td{padding:2mm 3mm;border-bottom:.4pt solid #efefef;vertical-align:top;font-size:8.8pt}
table.lines td.num,table.lines td.c-date{font-family:'JetBrains Mono',monospace;font-size:8.4pt;color:#666666}
.c-date{width:24mm;white-space:nowrap}
.l-title{color:#3d3d3d}.l-desc{color:#808080;font-size:8.4pt;margin-top:.4mm}
.after{display:flex;justify-content:flex-end;margin-top:4mm}
.totals{width:78mm;font-family:'JetBrains Mono',monospace;font-size:8.6pt}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0;color:#707070}
.t-row .num{font-family:'Onest',sans-serif;font-weight:600;color:#4a4a4a}
.t-total{border-top:1.6pt solid #a3a3a3;margin-top:2.4mm;padding-top:3mm;font-size:10.5pt;font-weight:700;color:#333333}
.t-total .num{font-size:12pt;font-weight:700;color:#222222}
.t-payment,.t-note{color:#707070}
.below{margin:6mm 0 0;padding-top:4.5mm;border-top:.6pt solid #e2e2e2;display:grid;grid-template-columns:1fr 1fr;gap:10mm}
.below .h{font-family:'Sora',sans-serif;font-weight:700;font-size:8pt;letter-spacing:.06em;color:#8a8a8a;margin-bottom:2.4mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.8mm 4mm;margin:0;font-size:8.8pt}
.pay dt{font-weight:600;color:#555555}.pay dd{margin:0;color:#444444;overflow-wrap:anywhere}
.pay dd.m{font-size:8.4pt}
.pay .t{font-weight:600;color:#3d3d3d;margin:0 0 1.4mm}
.pay>div+div{margin-top:4mm}
.notes{display:grid;gap:3mm;font-size:8.6pt;color:#666666}
.n-title{font-weight:600;color:#4a4a4a}
.n-rc,.n-credit{font-weight:500;color:#333333}
.foot{margin-top:6mm;display:flex;justify-content:space-between;align-items:flex-end;gap:8mm;padding-top:4mm;border-top:.6pt solid #e2e2e2;font-size:7.6pt;color:#7a7a7a}
.foot .thanks{font-family:'Sora',sans-serif;font-weight:600;font-size:9pt;color:#5c5c5c}
.foot .r{text-align:right;display:grid;gap:1mm;justify-items:end}
`,
  body: (v: DocumentView, logo: string | null) => {
    const due = v.dates.find((d) => d.label === 'Due');
    const pay = [
      ...v.payment.map(
        (p) =>
          `<div><p class="t">${esc(p.title)}</p><dl>${p.rows
            .map(
              (r) =>
                `<dt>${esc(r.label)}</dt><dd class="${/\d/.test(r.value) ? 'm' : ''}">${esc(r.value)}</dd>`,
            )
            .join('')}</dl></div>`,
      ),
      v.paymentLink
        ? `<div><p class="t">Pay online</p><div class="word">${esc(v.paymentLink)}</div></div>`
        : '',
    ].join('');
    const notes = notesBlock(v);
    return `
<header class="head">
  <div class="who">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div class="n s word">${esc(v.seller.name)}</div><div class="a">${lines(v.seller.addressLines)}${
    v.seller.taxLine ? `<br>${esc(v.seller.taxLine)}` : ''
  }</div></div>
  <div class="kind"><div class="k s">${esc(v.heading)}</div><dl class="m"><dt>No.</dt><dd>${esc(v.number)}</dd>${v.dates
    .map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`)
    .join('')}</dl></div>
</header>
<section class="billed">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="nm s word">${esc(v.buyer.name)}</div><div class="x word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${
    v.buyer.detailLines.length ? `<div class="x word">${lines(v.buyer.detailLines)}</div>` : ''
  }</div>
  <div class="due"><div class="lab">${esc(v.amountDue.label)}</div><div class="v s">${esc(v.amountDue.value)}</div>${
    due ? `<div class="w">by ${esc(due.value)}</div>` : ''
  }</div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2 class="s word">${esc(v.title)}</h2>` : ''}${v.summary ? `<p class="word">${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep">${totalsBlock(v)}</section>
${pay || notes ? `<section class="below keep"><div>${pay ? `<div class="h">Payment</div><div class="pay">${pay}</div>` : ''}</div><div>${notes ? `<div class="h">Terms and notes</div>${notes}` : ''}</div></section>` : ''}
<footer class="foot keep"><div><div class="thanks">Thank you for your business.</div><div style="margin-top:1mm">${esc(v.seller.companyLine ?? v.legalLine)}</div></div><div class="r m">${v.seller.contactLines
      .map((c) => `<div>${esc(c)}</div>`)
      .join('')}</div></footer>
`;
  },
};
