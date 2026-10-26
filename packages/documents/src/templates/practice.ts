import type { DocumentView } from '../view';
import { esc, lines, linesTable, logoTile, onWhite, para, readable, totalsBlock } from './shared';

/**
 * Practice: for accountants, solicitors, surveyors, consultants and clinics. A letterhead in the firm's own deep
 * colour with a fine gold line, the invoice set out as a letter on warm paper, the amount due in a gold-ruled frame,
 * and how to pay written as one plain sentence.
 */
export const practice = {
  id: 'practice',
  fonts: ['Libre Caslon Display', 'Libre Caslon Text', 'Source Sans 3'] as const,
  footer: { font: 'Source Sans 3', inset: '18mm', color: '#6d6a62' },
  css: (v: DocumentView) => {
    const tile = logoTile(v);
    return `
@page{size:A4;margin:16mm 0 20mm;background:#FBF8F2}
@page:first{margin-top:0}
@media screen{body{padding:0 0 20mm 0}html{background:#FBF8F2}}
:root{--brand:${v.brandColour};--bt:${onWhite(v.brandColour)};--gold:#B08D57;--ink:#1f2228;--soft:#66635c;--line:#e2dccf;--paper:#FBF8F2;--ivory:${readable(v.brandColour, '#F3EEE4', '#1f2228')}}
body{font-family:'Libre Caslon Text',serif;font-size:9pt;line-height:1.55;color:var(--ink)}
.sans{font-family:'Source Sans 3',sans-serif}
.lh{background:var(--brand);color:var(--ivory);padding:11mm 18mm 0;position:relative}
.lh .row{display:flex;justify-content:space-between;align-items:center;gap:10mm;padding-bottom:9mm}
.lock{display:flex;align-items:center;gap:6mm}
.lock .lg{flex:none;display:grid;place-items:center${tile ? `;background:${tile};border-radius:2.4mm;padding:2.4mm` : ''}}
.lock img{height:${tile ? 17 : 21}mm;width:auto;max-width:64mm;object-fit:contain;display:block}
.lock .n{font-family:'Libre Caslon Display',serif;font-size:27pt;line-height:1;letter-spacing:.01em}
.lh .ct{font-family:'Source Sans 3';font-size:8.4pt;line-height:1.6;text-align:right;color:color-mix(in srgb,var(--ivory) 78%,transparent)}
.lh .gold{height:0;border-top:.7pt solid var(--gold);position:relative;top:-3.2mm}
.wrap{padding:0 18mm}
.letter{display:grid;grid-template-columns:1fr 66mm;gap:12mm;margin-top:9mm;align-items:start}
.to .n{font-weight:700}
.title{font-family:'Libre Caslon Display';font-size:22pt;line-height:1;color:var(--bt);margin:0 0 3mm}
.title+.no{font-family:'Source Sans 3';font-weight:600;font-size:9.6pt;letter-spacing:.04em;margin-bottom:3mm}
.dates{display:grid;grid-template-columns:auto 1fr;gap:.3mm 5mm;margin:0;font-family:'Source Sans 3';font-size:8.8pt}
.dates dt{color:var(--soft)}.dates dd{margin:0}
.re{margin:8mm 0 4mm;font-size:10.5pt}
.re i{color:var(--soft);margin-right:1.6mm}
.sum{margin:-2mm 0 4mm;color:#3a3833}
table.lines th{font-family:'Source Sans 3';font-weight:600;font-size:7.8pt;letter-spacing:.04em;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:.6pt solid var(--brand)}
table.lines th.num{text-align:right}
table.lines td{padding:2.8mm 0;border-bottom:.5pt solid var(--line);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-desc{color:var(--soft);font-size:8.4pt;font-style:italic}
td.num{font-family:'Source Sans 3';font-size:9.2pt}
.end{display:grid;grid-template-columns:1fr 78mm;gap:12mm;margin-top:4mm;break-inside:avoid}
.totals{font-family:'Source Sans 3';font-size:9.2pt}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.8mm 0}
.t-total{border-top:.6pt solid var(--ink);margin-top:1mm;padding-top:1.6mm;font-weight:700}
.t-payment,.t-note{color:var(--soft)}
.due{margin-top:4mm;border:.7pt solid var(--gold);padding:1.2mm}
.due .in{border:.35pt solid var(--gold);padding:4mm 5mm;display:flex;justify-content:space-between;align-items:baseline;background:#fff}
.due .d-label{font-family:'Source Sans 3';font-weight:600;font-size:8.4pt;letter-spacing:.08em;text-transform:uppercase;color:var(--bt)}
.due .d-value{font-family:'Libre Caslon Display';font-size:22pt;line-height:1;color:var(--bt)}
.how{border-left:1.6pt solid var(--gold);padding:.6mm 0 .6mm 5mm;align-self:center}
.how b{font-weight:700}
.how .alt{margin-top:1.5mm;color:var(--soft)}
.small{margin-top:5mm;color:#3a3833;display:grid;gap:2mm}
.sign{margin-top:5mm;break-inside:avoid}
.sign .by{font-style:italic;color:var(--soft)}
.sign .firm{font-family:'Libre Caslon Display';font-size:15pt;color:var(--bt);margin-top:1mm}
.legal{margin-top:7mm;padding-top:2.6mm;border-top:.5pt solid var(--gold);font-family:'Source Sans 3';font-size:7.6pt;color:var(--soft);text-align:center}
`;
  },
  body: (v: DocumentView, logo: string | null) => {
    const bank = v.payment.find((p) => p.title === 'Bank transfer');
    const r = (l: string) => bank?.rows.find((x) => x.label === l)?.value ?? null;
    const payee = r('Account name');
    const parts = [
      r('Bank') ? `${esc(r('Bank'))}` : null,
      r('Sort code') ? `sort code ${esc(r('Sort code'))}` : null,
      r('Account number') ? `account ${esc(r('Account number'))}` : null,
      r('IBAN') ? `IBAN ${esc(r('IBAN'))}` : null,
    ].filter(Boolean);
    const sentence =
      v.kind === 'credit_note'
        ? ''
        : `Please pay <b>${esc(v.amountDue.value)}</b>${v.amountDue.dueLine ? ` by ${esc(v.amountDue.dueLine.replace(/^Due /, ''))}` : ''}${payee ? ` to ${esc(payee)}` : ''}${parts.length ? `, ${parts.join(', ')}` : ''}${r('Reference') ? `, quoting <b>${esc(r('Reference'))}</b>` : ''}.`;
    return `
<header class="lh">
  <div class="row">
    <div class="lock">${logo ? `<span class="lg"><img src="${esc(logo)}" alt="${esc(v.seller.name)}"></span>` : ''}<div class="n word">${esc(v.seller.name)}</div></div>
    <div class="ct">${lines([v.seller.addressLines.join(', '), ...v.seller.contactLines])}</div>
  </div>
  <div class="gold"></div>
</header>
<div class="wrap">
<section class="letter">
  <div class="to word"><div class="n">${esc(v.buyer.name)}</div>${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div>
  <div><h1 class="title">${esc(v.heading)}</h1><div class="no">${esc(v.number)}</div><dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div>
</section>
${v.title ? `<p class="re"><i>For</i>${esc(v.title)}</p>` : ''}
${v.summary ? `<p class="sum">${para(v.summary)}</p>` : ''}
${linesTable(v)}
<section class="end">
  ${sentence ? `<div class="how">${sentence}${v.paymentLink ? `<div class="alt">Or pay online at ${esc(v.paymentLink)}</div>` : ''}</div>` : '<div></div>'}
  <div>${totalsBlock(v)}<div class="due"><div class="in"><span class="d-label">${esc(v.amountDue.label)}</span><span class="d-value">${esc(v.amountDue.value)}</span></div></div></div>
</section>
<div class="small">${[v.creditNote, v.reverseChargeNote, v.sterlingRateNote, v.notes, v.terms]
      .filter(Boolean)
      .map((x) => `<p>${para(x)}</p>`)
      .join('')}</div>
<div class="sign"><div class="by">With thanks,</div><div class="firm">${esc(v.seller.name)}</div></div>
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
</div>
`;
  },
};
