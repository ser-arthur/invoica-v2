import type { DocumentView } from '../view';
import { esc, linesTable, lines, para } from './shared';

/** A personal letter: addressed by name, the work described in a sentence, the items with dotted leaders, signed off. */
export const letter = {
  id: 'letter',
  footer: { font: 'Newsreader', inset: '0' },
  fonts: ['Newsreader'] as const,
  css: (v: DocumentView) => `
@page{size:A4;margin:18mm 22mm 20mm}
@media screen{body{padding:18mm 22mm 20mm}}
body{font-family:'Newsreader',serif;font-size:10.6pt;line-height:1.5;color:#22201c}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:12mm;margin-bottom:10mm}
.from .name{font-size:20pt;font-style:italic;font-weight:500;letter-spacing:-.01em;color:${v.brandColour};line-height:1.1}
.from img{max-height:16mm;max-width:70mm;display:block}
.from .addr{font-size:9.4pt;color:#5d5850;margin-top:2mm}
.meta{text-align:right;font-size:9.6pt;color:#5d5850;min-width:0;overflow-wrap:anywhere}
.meta strong{color:#22201c;font-weight:600}
.to{margin-bottom:7mm}
.dear{margin:0 0 4mm}
.body p{margin:0 0 3mm;max-width:150mm}
.items{margin:6mm 0 2mm;max-width:150mm}
.item{display:flex;align-items:baseline;gap:2mm;padding:1.4mm 0;break-inside:avoid}
.item .t{flex:0 1 auto}
.item .t small{display:block;color:#6d675e;font-size:9.4pt;font-style:italic}
.item .dots{flex:1 1 auto;border-bottom:1pt dotted #9a9286;transform:translateY(-1.2mm);min-width:8mm}
.item .a{white-space:nowrap;font-variant-numeric:tabular-nums}
.sum{max-width:150mm;margin-top:2mm}
.sum .r{display:flex;justify-content:space-between;padding:.8mm 0;color:#5d5850}
.sum .total{color:#22201c;font-weight:600;font-size:12.5pt;border-top:.6pt solid #22201c;margin-top:1.5mm;padding-top:2mm}
table.lines{max-width:150mm;margin:5mm 0 2mm;font-size:10pt}
table.lines th{font-weight:500;font-style:italic;color:#6d675e;text-align:left;border-bottom:.6pt solid #22201c;padding:0 0 1.4mm}
table.lines th.num{text-align:right}
table.lines td{padding:1.4mm 0;border-bottom:.35pt dotted #9a9286;vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:4mm}
.l-desc{color:#6d675e;font-style:italic;font-size:9.4pt}
.pay{margin-top:6mm;padding-top:2.6mm;border-top:.4pt solid #cfc8bb;font-size:9.8pt;max-width:150mm;break-inside:avoid}
.pay .h{font-style:italic;color:#6d675e}
.sign{margin-top:6mm;break-inside:avoid}
.sign .n{font-style:italic;font-size:15pt;color:${v.brandColour}}
.small{margin-top:6mm;font-size:8.8pt;color:#6d675e;max-width:150mm}
`,
  body: (v: DocumentView, logo: string | null) => {
    const first =
      (v.buyer.contact ?? v.buyer.name).split(/\s+/)[0] && v.buyer.contact ? v.buyer.contact : v.buyer.name;
    const structured = v.columns.quantity || v.columns.tax || v.columns.date;
    const items = structured
      ? linesTable(v)
      : `<div class="items">${v.lines
          .map(
            (l) =>
              `<div class="item"><span class="t">${esc(l.title)}${l.description ? `<small>${para(l.description)}</small>` : ''}</span><span class="dots"></span><span class="a">${esc(l.amount)}</span></div>`,
          )
          .join('')}</div>`;
    const sums = v.totals
      .map(
        (t) =>
          `<div class="r${t.kind === 'total' ? ' total' : ''}"><span>${esc(t.label)}</span><span>${esc(t.value)}</span></div>`,
      )
      .join('');
    const isCredit = v.kind === 'credit_note';
    return `
<header class="top">
  <div class="from">${logo ? `<img src="${esc(logo)}" alt="${esc(v.seller.name)}">` : `<div class="name">${esc(v.seller.name)}</div>`}<div class="addr">${lines([...v.seller.addressLines, ...v.seller.contactLines])}</div></div>
  <div class="meta"><strong>${esc(v.heading)} ${esc(v.number)}</strong><br>${v.dates.map((d) => `${esc(d.label)} ${esc(d.value)}`).join('<br>')}</div>
</header>
<section class="to">${lines([v.buyer.name, v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</section>
<section class="body">
  <p class="dear">Dear ${esc(first)},</p>
  ${
    isCredit
      ? `<p>${esc(v.creditNote ?? 'This credit note reduces what you owe.')}</p>`
      : `<p>${v.title ? `This is my invoice for ${esc(v.title.charAt(0).toLowerCase() + v.title.slice(1))}.` : 'This is my invoice for the work below.'}${v.summary ? ` ${para(v.summary)}` : ''}</p>`
  }
</section>
${items}
<div class="sum keep">${sums}</div>
${
  isCredit
    ? ''
    : `<section class="body keep"><p style="margin-top:6mm">The ${esc(v.amountDue.label.toLowerCase())} is <strong>${esc(v.amountDue.value)}</strong>${v.amountDue.dueLine ? `, ${esc(v.amountDue.dueLine.charAt(0).toLowerCase() + v.amountDue.dueLine.slice(1))}` : ''}.</p></section>`
}
${v.notes ? `<section class="body"><p>${para(v.notes)}</p></section>` : ''}
<div class="sign"><div>With thanks,</div><div class="n">${esc(v.seller.name)}</div></div>
${
  v.payment.length || v.paymentLink
    ? `<section class="pay"><div class="h">How to pay</div>${v.payment.map((p) => `<div><strong>${esc(p.title)}:</strong> ${p.rows.map((r) => `${esc(r.label)} ${esc(r.value)}`).join(', ')}</div>`).join('')}${v.paymentLink ? `<div><strong>Online:</strong> ${esc(v.paymentLink)}</div>` : ''}</section>`
    : ''
}
<section class="small">${[v.reverseChargeNote, v.terms, v.legalLine]
      .filter(Boolean)
      .map((t) => `<p>${para(t)}</p>`)
      .join('')}</section>
`;
  },
};
