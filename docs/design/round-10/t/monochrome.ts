import type { DocumentView } from '../../../../packages/documents/src/view';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from '../../../../packages/documents/src/templates/shared';
import { poweredBy } from '../mark';

/**
 * Monochrome, from the first Invoica: the business's name large in grey at the left, the document's kind larger and
 * lighter at the right over its number and dates in mono, a grey band over the lines, the figures in mono, the total
 * under a heavier rule. No brand colour anywhere: the logo is set in grey too.
 */
export function monochrome() {
  return {
    id: 'monochrome',
    name: 'Monochrome',
    fonts: ['Sora', 'Onest', 'JetBrains Mono'] as const,
    footer: { font: 'Onest', inset: '0', color: '#6b6b6b' },
    css: (_v: DocumentView) => `
@page{size:A4;margin:0}
html,body{background:#fff}
body{padding:16mm 17mm 13mm;min-height:297mm;font-family:'Onest',sans-serif;font-size:9.2pt;line-height:1.5;color:#4a4a4a;display:flex;flex-direction:column}
.s{font-family:'Sora',sans-serif;letter-spacing:-.02em}
.m{font-family:'JetBrains Mono',monospace;letter-spacing:-.01em}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;padding-bottom:6mm;border-bottom:.6pt solid #e2e2e2}
.who img{height:10mm;width:auto;max-width:40mm;object-fit:contain;display:block;margin-bottom:4mm;filter:grayscale(1) contrast(1.05);opacity:.85}
.who .n{font-weight:800;font-size:21pt;line-height:1.1;color:#5c5c5c}
.who .a{font-size:8.6pt;color:#707070;margin-top:2mm;line-height:1.55}
.kind{text-align:right}
.kind .k{font-weight:800;font-size:30pt;line-height:1;color:#a8a8a8}
.kind dl{display:grid;grid-template-columns:auto auto;justify-content:end;gap:.6mm 3mm;margin:3mm 0 0;font-size:8.6pt;color:#5c5c5c}
.kind dt{color:#8a8a8a}.kind dd{margin:0;color:#333}
.billed{margin:7mm 0 7mm;display:grid;grid-template-columns:1fr auto;gap:10mm;align-items:end}
.lab{font-weight:600;font-size:8pt;color:#8a8a8a;letter-spacing:.06em;margin-bottom:1.6mm}
.billed .nm{font-weight:600;font-size:12pt;color:#3d3d3d;line-height:1.25}
.billed .x{font-size:8.8pt;color:#666}
.due{text-align:right}
.due .v{font-weight:700;font-size:16pt;color:#333;line-height:1.1}
.due .w{font-size:8.4pt;color:#707070;margin-top:1mm}
.intro{margin:0 0 6mm;max-width:150mm}
.intro h2{font-weight:600;font-size:11.5pt;margin:0 0 1mm;color:#3d3d3d}
.intro p{color:#666;margin:0}
table.lines th{background:#ececec;font-family:'JetBrains Mono',monospace;font-size:7.6pt;font-weight:600;letter-spacing:.04em;color:#555;text-align:left;padding:2.6mm 3mm}
table.lines th:first-child{border-radius:1.6mm 0 0 1.6mm}
table.lines th:last-child{border-radius:0 1.6mm 1.6mm 0}
table.lines th.num{text-align:right}
table.lines td{padding:2.3mm 3mm;border-bottom:.4pt solid #efefef;vertical-align:top;font-size:8.8pt}
table.lines td.num,table.lines td.c-date{font-family:'JetBrains Mono',monospace;font-size:8.4pt;color:#666}
.l-title{color:#3d3d3d}.l-desc{color:#808080;font-size:8.4pt;margin-top:.4mm}
.after{display:flex;justify-content:flex-end;margin-top:6mm}
.totals{width:76mm;font-family:'JetBrains Mono',monospace;font-size:8.6pt}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0;color:#707070}
.t-row .num{font-family:'Onest',sans-serif;font-weight:600;color:#4a4a4a}
.t-total{border-top:1.6pt solid #a3a3a3;margin-top:2.4mm;padding-top:3mm;font-size:10.5pt;font-weight:700;color:#333}
.t-total .num{font-size:12pt;font-weight:700;color:#222}
.t-payment{color:#707070}
.below{margin:7mm 0 6mm;padding-top:5mm;border-top:.6pt solid #e2e2e2;display:grid;grid-template-columns:1fr 1fr;gap:10mm}
.below .h{font-family:'Sora',sans-serif;font-weight:700;font-size:8pt;letter-spacing:.06em;color:#8a8a8a;margin-bottom:2.4mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.8mm 4mm;margin:0;font-size:8.8pt}
.pay dt{font-weight:600;color:#555}.pay dd{margin:0;color:#444}
.pay dd.m{font-size:8.4pt}
.pay .t{font-weight:600;color:#3d3d3d;margin:0 0 1.4mm}
.pay > div + div{margin-top:4mm}
.notes{display:grid;gap:3mm;font-size:8.6pt;color:#666}
.n-title{font-weight:600;color:#4a4a4a}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:8mm;padding-top:4mm;border-top:.6pt solid #e2e2e2;font-size:7.6pt;color:#7a7a7a}
.foot .thanks{font-family:'Sora',sans-serif;font-weight:600;font-size:9pt;color:#5c5c5c}
.foot .r{text-align:right;display:grid;gap:1mm;justify-items:end}
.powered{display:flex;align-items:center;gap:1.8mm;white-space:nowrap}
`,
    body: (v: DocumentView, logo: string | null) => {
      const due = v.dates.find((d) => d.label === 'Due');
      const pay = v.payment
        .map(
          (p) =>
            `<div><p class="t">${esc(p.title)}</p><dl>${p.rows
              .map((r) => `<dt>${esc(r.label)}</dt><dd class="${/\d/.test(r.value) ? 'm' : ''}">${esc(r.value)}</dd>`)
              .join('')}</dl></div>`,
        )
        .join('');
      const notes = notesBlock(v);
      return `
<header class="head">
  <div class="who">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div class="n s">${esc(v.seller.name)}</div><div class="a">${lines(v.seller.addressLines)}${v.seller.taxLine ? `<br>${esc(v.seller.taxLine)}` : ''}</div></div>
  <div class="kind"><div class="k s">${esc(v.heading)}</div><dl class="m"><dt>No.</dt><dd>${esc(v.number)}</dd>${v.dates
    .map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`)
    .join('')}</dl></div>
</header>
<section class="billed">
  <div><div class="lab s">Billed to</div><div class="nm s">${esc(v.buyer.name)}</div><div class="x">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div></div>
  <div class="due"><div class="lab s">${esc(v.amountDue.label)}</div><div class="v s">${esc(v.amountDue.value)}</div>${due ? `<div class="w">by ${esc(due.value)}</div>` : ''}</div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2 class="s">${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep">${totalsBlock(v)}</section>
${pay || notes ? `<section class="below keep"><div>${pay ? `<div class="h">Payment</div><div class="pay">${pay}</div>` : ''}</div><div>${notes ? `<div class="h">Terms and notes</div>${notes}` : ''}</div></section>` : ''}
<footer class="foot"><div><div class="thanks">Thank you for your business.</div><div style="margin-top:1mm">${esc(v.seller.companyLine ?? v.legalLine)}</div></div><div class="r m">${v.seller.contactLines.map((c) => `<div>${esc(c)}</div>`).join('')}${poweredBy('#8a8a8a', '#b5b5b5', '#8a8a8a')}</div></footer>
`;
    },
  };
}
