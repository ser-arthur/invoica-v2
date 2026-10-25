import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, para, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Statement: for bookkeepers, IT contractors, engineers and anyone paid by someone's finance team. The answers come
 * first, in a summary across the top: how much, by when and where to send it. The lines read like a bank statement,
 * the description on the left and the amount on the right with its working underneath.
 */
export const statement: ProtoTemplate = {
  id: 'statement',
  name: 'Statement',
  fonts: ['Hanken Grotesk', 'IBM Plex Mono'],
  footer: { font: 'Hanken Grotesk', inset: '0', color: '#6a7178' },
  css: (v: DocumentView) => `
@page{size:A4;margin:15mm 16mm 18mm}
:root{--brand:${v.brandColour};--ink:#15191c;--soft:#646c73;--rule:#dde1e4;--tint:color-mix(in oklab,${v.brandColour} 8%,#fff)}
body{font-family:'Hanken Grotesk',sans-serif;font-size:9pt;line-height:1.5;color:var(--ink)}
.mono{font-family:'IBM Plex Mono',monospace;font-size:.94em}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm}
.brand{display:flex;gap:4mm;align-items:center}
.brand img{width:12mm;height:12mm}
.brand .n{font-weight:650;font-size:13pt;line-height:1.2;letter-spacing:-.01em}
.brand .a{color:var(--soft);font-size:8.4pt}
.id{text-align:right}
.id .k{color:var(--soft);font-size:8.4pt}
.id .no{font-weight:600;font-size:13pt;line-height:1.2}
.summary{margin:9mm 0 8mm;background:var(--tint);border-radius:2mm;display:grid;grid-template-columns:1.15fr .85fr 1.2fr;break-inside:avoid}
.summary>div{padding:5.5mm 6mm 5.5mm}
.summary>div+div{border-left:.6pt solid color-mix(in oklab,${v.brandColour} 22%,#fff)}
.lab{font-size:7.8pt;font-weight:600;color:var(--soft);margin-bottom:1.6mm}
.summary .amt{font-weight:600;font-size:25pt;line-height:1;letter-spacing:-.02em;color:var(--brand);white-space:nowrap}
.summary .big{font-weight:600;font-size:14pt;line-height:1.15}
.summary .sub{color:var(--soft);font-size:8.4pt;margin-top:1.4mm}
.summary .acct{font-size:9.4pt;line-height:1.5}
.summary .k2{color:var(--soft);font-size:8.2pt}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-bottom:9mm}
.parties .n{font-weight:600}
.parties dl{display:grid;grid-template-columns:auto 1fr;gap:.4mm 6mm;margin:0}
.parties dt{color:var(--soft)}.parties dd{margin:0}
.sec{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1pt solid var(--ink);padding-bottom:2mm}
.sec h2{font-size:11.5pt;font-weight:650;margin:0}
.sec span{font-size:7.8pt;font-weight:600;color:var(--soft)}
.row{display:grid;grid-template-columns:1fr auto;gap:10mm;padding:3mm 0;border-bottom:.6pt solid var(--rule);break-inside:avoid}
.row .t{font-weight:550}
.row .d{color:var(--soft);font-size:8.6pt}
.row .r{text-align:right}
.row .amt{font-weight:600}
.row .w{color:var(--soft);font-size:8.2pt;white-space:nowrap}
.after{display:grid;grid-template-columns:1fr 72mm;gap:12mm;margin-top:4mm;break-inside:avoid}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.9mm 0}
.t-total{border-top:1pt solid var(--ink);margin-top:1.2mm;padding-top:1.8mm;font-weight:650}
.t-due{font-weight:650;color:var(--brand)}
.t-payment,.t-note{color:var(--soft)}
.small{color:var(--soft);font-size:8.6pt;margin:0 0 2mm}
.pay{margin-top:9mm;display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;border-top:.6pt solid var(--rule);padding-top:4mm;break-inside:avoid}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.3mm 4mm;margin:0;font-size:8.6pt}
.pay dt{color:var(--soft)}.pay dd{margin:0}
.legal{margin-top:10mm;padding-top:3mm;border-top:.6pt solid var(--rule);color:var(--soft);font-size:7.6pt}
.legal .ct{color:var(--ink);font-size:8.4pt;margin-bottom:1mm}
.legal .ct span{margin-right:5mm;white-space:nowrap}
`,
  body: (v: DocumentView, logo: string | null) => {
    const c = v.columns;
    const bank = v.payment.find((p) => p.title === 'Bank transfer');
    const row = (l: string) => bank?.rows.find((r) => r.label === l)?.value ?? null;
    const working = (l: DocumentView['lines'][number]) =>
      [c.quantity && c.unitPrice ? (l.quantity === '1' && !c.tax ? null : `${l.quantity} × ${l.unitPrice}`) : c.quantity ? l.quantity : null, c.tax ? `${c.taxLabel} ${l.tax}` : null, c.date ? l.date : null]
        .filter(Boolean)
        .join(', ');
    return `
<header class="head">
  <div class="brand">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><div class="n word">${esc(v.seller.name)}</div><div class="a">${esc(v.seller.addressLines.join(', '))}</div></div></div>
  <div class="id"><div class="k">${esc(v.heading)}</div><div class="no">${esc(v.number)}</div></div>
</header>
<section class="summary">
  <div><div class="lab">${esc(v.amountDue.label)}</div><div class="amt">${esc(v.amountDue.value)}</div></div>
  <div><div class="lab">Due</div><div class="big">${esc(v.dates.find((d) => d.label === 'Due')?.value ?? v.amountDue.dueLine ?? '')}</div></div>
  <div><div class="lab">${bank ? 'Pay by bank transfer' : 'How to pay'}</div>${
    bank
      ? `<div class="acct">${esc([row('Account name'), row('Bank')].filter(Boolean).join(', '))}<br><span class="k2">Sort code</span> <span class="mono">${esc(row('Sort code'))}</span>&emsp;<span class="k2">Account</span> <span class="mono">${esc(row('Account number'))}</span><br><span class="k2">Reference</span> <span class="mono">${esc(row('Reference') ?? v.number)}</span></div>`
      : v.paymentLink
        ? `<div class="acct">${esc(v.paymentLink)}</div>`
        : ''
  }</div>
</section>
<section class="parties">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <div><div class="lab">Details</div><dl>${v.dates.filter((d) => d.label !== 'Due').map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}${v.seller.contactLines.length ? `<dt>Questions</dt><dd>${esc(v.seller.contactLines[0])}</dd>` : ''}</dl></div>
</section>
<div class="sec"><h2>${esc(v.title ?? 'Charges')}</h2><span>Amount</span></div>
${v.summary ? `<p class="small" style="margin-top:2mm">${para(v.summary)}</p>` : ''}
${v.lines
  .map((l) => {
    const w = working(l);
    return `<div class="row"><div class="word"><div class="t">${esc(l.title)}</div>${l.description ? `<div class="d">${para(l.description)}</div>` : ''}</div><div class="r"><div class="amt">${esc(l.amount)}</div>${w ? `<div class="w">${esc(w)}</div>` : ''}</div></div>`;
  })
  .join('')}
<section class="after">
  <div>${[v.notes, v.creditNote, v.reverseChargeNote, v.sterlingRateNote, v.terms].filter(Boolean).map((x) => `<p class="small">${para(x)}</p>`).join('')}</div>
  <div>${totalsBlock(v)}</div>
</section>
${v.payment.length > 1 || (v.paymentLink && bank) ? `<section class="pay">${v.payment.filter((p) => p !== bank).map((p) => `<div><div class="lab">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl></div>`).join('')}${v.paymentLink && bank ? `<div><div class="lab">Or pay online</div><div class="word">${esc(v.paymentLink)}</div></div>` : ''}</section>` : ''}
<footer class="legal keep"><div class="ct">${v.seller.contactLines.map((c) => `<span>${esc(c)}</span>`).join('')}</div>${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`;
  },
};
