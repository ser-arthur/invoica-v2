import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, para, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Practice: for accountants, solicitors, surveyors, consultants and clinics. A letterhead with the firm's details in
 * a margin column, the invoice set out like a letter, and how to pay written as one plain sentence.
 */
export const practice: ProtoTemplate = {
  id: 'practice',
  name: 'Practice',
  fonts: ['Source Serif 4', 'Source Sans 3'],
  footer: { font: 'Source Sans 3', inset: '0' },
  css: (v: DocumentView) => `
@page{size:A4;margin:18mm 16mm 20mm}
:root{--brand:${v.brandColour};--ink:#1b1d22;--soft:#5f646e;--line:#d9dbe0}
body{font-family:'Source Serif 4',serif;font-size:9.8pt;line-height:1.5;color:var(--ink);font-optical-sizing:auto}
.sans{font-family:'Source Sans 3',sans-serif}
.page{display:grid;grid-template-columns:49mm 1fr;gap:0 9mm;margin-bottom:7mm}
.side{font-family:'Source Sans 3',sans-serif;font-size:8.2pt;line-height:1.5;color:var(--soft);border-right:.5pt solid var(--line);padding-right:6mm}
.lock{display:block;margin-bottom:7mm}
.lock img{width:13mm;height:13mm;display:block;margin-bottom:3.5mm}
.lock .n{font-family:'Source Serif 4',serif;font-weight:600;font-size:14pt;line-height:1.15;color:var(--brand);letter-spacing:-.005em}
.side .grp{margin-bottom:4.5mm}
.side .grp b{display:block;color:var(--ink);font-weight:600}
.main{min-width:0}
.to{margin-top:21mm;min-height:28mm}
.to .n{font-weight:600}
.headline{display:flex;justify-content:space-between;align-items:baseline;gap:8mm;border-bottom:.8pt solid var(--brand);padding-bottom:2.5mm;margin:6mm 0 3mm}
.headline h1{font-weight:600;font-size:21pt;line-height:1;margin:0;color:var(--brand);letter-spacing:-.01em}
.headline .no{font-family:'Source Sans 3';font-weight:600;font-size:10pt}
.dates{display:grid;grid-template-columns:repeat(4,auto);justify-content:start;gap:0 8mm;margin:0;font-family:'Source Sans 3';font-size:8.6pt}
.dates div span{display:block;color:var(--soft)}
.re{font-weight:600;margin:0 0 1.5mm}
.re i{font-style:italic;font-weight:400;color:var(--soft);margin-right:1.5mm}
.sum{margin-bottom:5mm;color:#333}
table.lines th{font-family:'Source Sans 3';font-weight:600;font-size:8pt;color:var(--soft);text-align:left;padding:0 0 1.8mm;border-bottom:.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.6mm 0;border-bottom:.5pt solid var(--line);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:500}.l-desc{color:var(--soft);font-size:9pt;font-style:italic}
.end{break-inside:avoid}
.totals{width:80mm;margin:3mm 0 0 auto;font-family:'Source Sans 3';font-size:9.2pt}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.7mm 0}
.t-total{border-top:.6pt solid var(--ink);margin-top:1mm;padding-top:1.6mm;font-weight:700}
.t-payment,.t-note{color:var(--soft)}
.due{width:80mm;margin:2mm 0 0 auto;border-top:.6pt solid var(--ink);border-bottom:2.2pt double var(--ink);padding:2.2mm 0 2.4mm;display:flex;justify-content:space-between;align-items:baseline}
.due .d-label{font-weight:600}
.due .d-value{font-weight:700;font-size:15pt;color:var(--brand)}
.how{margin-top:7mm;padding:4.5mm 5mm;background:color-mix(in oklab,${v.brandColour} 5%,#fff);border-radius:1mm;break-inside:avoid}
.how b{font-weight:600}
.how .alt{margin-top:1.5mm;color:var(--soft);font-size:9pt}
.small{margin-top:5mm;font-size:8.8pt;color:#333;display:grid;gap:2mm}
.sign{margin-top:8mm;break-inside:avoid}
.sign .by{font-style:italic;color:var(--soft)}
.sign .firm{font-weight:600;color:var(--brand)}
`,
  body: (v: DocumentView, logo: string | null) => {
    const bank = v.payment.find((p) => p.title === 'Bank transfer');
    const r = (l: string) => bank?.rows.find((x) => x.label === l)?.value ?? null;
    const payee = r('Account name');
    const parts = [
      r('Sort code') ? `sort code ${esc(r('Sort code'))}` : null,
      r('Account number') ? `account ${esc(r('Account number'))}` : null,
      r('IBAN') ? `IBAN ${esc(r('IBAN'))}` : null,
    ].filter(Boolean);
    const sentence =
      v.kind === 'credit_note'
        ? ''
        : `Please pay <b>${esc(v.amountDue.value)}</b>${v.amountDue.dueLine ? ` by ${esc(v.amountDue.dueLine.replace(/^Due /, ''))}` : ''}${payee ? ` to ${esc(payee)}` : ''}${parts.length ? `, ${parts.join(', ')}` : ''}${r('Reference') ? `, quoting <b>${esc(r('Reference'))}</b>` : ''}.`;
    const contact = v.seller.contactLines;
    return `
<div class="page">
  <aside class="side">
    <div class="lock">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div class="n word">${esc(v.seller.name)}</div></div>
    <div class="grp">${lines(v.seller.addressLines)}</div>
    <div class="grp">${lines(contact)}</div>
    ${v.seller.taxLine ? `<div class="grp">${esc(v.seller.taxLine)}</div>` : ''}
    ${v.seller.companyLine ? `<div class="grp">${esc(v.seller.companyLine)}</div>` : ''}
  </aside>
  <div class="main">
    <div class="to word"><div class="n">${esc(v.buyer.name)}</div>${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div>
    <div class="headline"><h1>${esc(v.heading)}</h1><div class="no">${esc(v.number)}</div></div>
    <div class="dates">${v.dates.map((d) => `<div><span>${esc(d.label)}</span>${esc(d.value)}</div>`).join('')}</div>
  </div>
</div>
<main>
    ${v.title ? `<p class="re"><i>For</i>${esc(v.title)}</p>` : ''}
    ${v.summary ? `<p class="sum">${para(v.summary)}</p>` : ''}
    ${linesTable(v)}
    <div class="end">
    ${totalsBlock(v)}
    <div class="due"><span class="d-label sans">${esc(v.amountDue.label)}</span><span class="d-value">${esc(v.amountDue.value)}</span></div>
    </div>
    ${sentence ? `<div class="how">${sentence}${v.paymentLink ? `<div class="alt">Or pay online at ${esc(v.paymentLink)}</div>` : ''}</div>` : ''}
    <div class="small">${[
      v.creditNote ? `<p>${esc(v.creditNote)}</p>` : '',
      v.reverseChargeNote ? `<p>${esc(v.reverseChargeNote)}</p>` : '',
      v.sterlingRateNote ? `<p>${esc(v.sterlingRateNote)}</p>` : '',
      v.notes ? `<p>${para(v.notes)}</p>` : '',
      v.terms ? `<p>${para(v.terms)}</p>` : '',
    ].join('')}</div>
    <div class="sign"><div class="by">With thanks,</div><div class="firm">${esc(v.seller.name)}</div></div>
</main>
`;
  },
};
