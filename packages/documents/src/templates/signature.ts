import type { DocumentView } from '../view';
import { esc, linesTable, lines, notesBlock, paymentBlock, para, totalsBlock } from './shared';

/** Invoica's own template: quiet, exact, with the amount due as the one strong moment. */
export const signature = {
  id: 'signature',
  footer: { font: 'Onest', inset: '0' },
  fonts: ['Sora', 'Onest'] as const,
  css: (v: DocumentView) => `
@page{size:A4;margin:16mm 16mm 20mm}
@media screen{body{padding:16mm 16mm 20mm}}
body{font-family:'Onest',sans-serif;font-size:9.4pt;line-height:1.5;color:#18211d}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:12mm;padding-bottom:7mm;border-bottom:1.6pt solid ${v.brandColour}}
.brand{font-family:'Sora',sans-serif;font-weight:600;font-size:15pt;letter-spacing:-.02em;line-height:1.15;max-width:95mm}
.brand img{max-height:16mm;max-width:60mm;display:block}
.brand .legal{font-family:'Onest',sans-serif;font-weight:400;font-size:8.4pt;letter-spacing:0;color:#56635c;margin-top:1.2mm}
.ident{text-align:right}
.ident .kind{font-size:8.6pt;color:#56635c}
.ident .no{font-family:'Sora',sans-serif;font-size:21pt;font-weight:600;letter-spacing:-.03em;line-height:1.1}
.parties{display:grid;grid-template-columns:1fr 1fr 62mm;gap:8mm;margin:7mm 0 8mm}
.label{font-size:8pt;color:#56635c;margin-bottom:1mm}
.party .name{font-weight:600}
.party .extra{color:#56635c;font-size:8.6pt;margin-top:1mm}
.dates{display:grid;grid-template-columns:auto 1fr;gap:1mm 5mm;font-size:8.8pt;align-content:start}
.dates dt{color:#56635c}.dates dd{margin:0;text-align:right}
.intro{margin:0 0 6mm;max-width:150mm}
.intro h2{font-family:'Sora',sans-serif;font-size:12.5pt;font-weight:600;letter-spacing:-.01em;margin:0 0 1.5mm}
.intro p{color:#3a4640}
table.lines th{font-size:8pt;font-weight:500;color:#56635c;text-align:left;padding:0 0 2.2mm;border-bottom:.6pt solid #18211d}
table.lines th.num{text-align:right}
table.lines td{padding:2.8mm 0;border-bottom:.4pt solid #dfe5e1;vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:500}.l-desc{color:#56635c;font-size:8.6pt;margin-top:.6mm}
.c-date{width:24mm;white-space:nowrap}
.after{display:grid;grid-template-columns:1fr 76mm;gap:12mm;margin-top:6mm;align-items:start}
.totals .t-row{display:flex;justify-content:space-between;gap:6mm;padding:1.1mm 0;font-size:9pt}
.totals .t-total{border-top:.6pt solid #18211d;margin-top:1.4mm;padding-top:2.2mm;font-weight:600}
.totals .t-payment,.totals .t-note{color:#56635c}
.due{margin-top:4mm;background:${v.brandColour};color:${v.onBrand};border-radius:2.5mm;padding:4mm 5mm}
.due .d-label{font-size:8.6pt;opacity:.85}
.due .d-value{font-family:'Sora',sans-serif;font-size:19pt;font-weight:600;letter-spacing:-.03em;line-height:1.15}
.due .d-when{font-size:8.6pt;margin-top:.6mm;opacity:.9}
.pay{background:#f3f6f4;border-radius:2.5mm;padding:4mm 5mm;display:grid;gap:3.5mm}
.p-title{font-weight:600;margin-bottom:1mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.6mm 5mm;margin:0;font-size:8.8pt}
.pay dt{color:#56635c}.pay dd{margin:0}
.notes{margin-top:8mm;display:grid;gap:3.5mm;font-size:8.8pt;color:#3a4640;max-width:150mm}
.n-title{font-weight:600;color:#18211d;margin-bottom:.6mm}
.n-rc,.n-credit{font-weight:500;color:#18211d}
.legal{margin-top:9mm;padding-top:3mm;border-top:.4pt solid #dfe5e1;font-size:7.8pt;color:#56635c}
`,
  body: (v: DocumentView, logo: string | null) => `
<header class="head">
  <div class="brand">${logo ? `<img src="${esc(logo)}" alt="${esc(v.seller.name)}">` : esc(v.seller.name)}${
    v.seller.legalName ? `<div class="legal">${esc(v.seller.legalName)}</div>` : ''
  }</div>
  <div class="ident"><div class="kind">${esc(v.heading)}</div><div class="no">${esc(v.number)}</div></div>
</header>
<section class="parties">
  <div class="party"><div class="label">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="name word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${
    v.buyer.detailLines.length ? `<div class="extra">${lines(v.buyer.detailLines)}</div>` : ''
  }</div>
  <div class="party"><div class="label">From</div><div class="name word">${esc(v.seller.name)}</div><div class="word">${lines(v.seller.addressLines)}</div><div class="extra">${lines([...v.seller.contactLines, v.seller.taxLine])}</div></div>
  <dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep">
  <div>${paymentBlock(v)}</div>
  <div>${totalsBlock(v)}<div class="due"><div class="d-label">${esc(v.amountDue.label)}</div><div class="d-value">${esc(v.amountDue.value)}</div>${
    v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''
  }</div></div>
</section>
${notesBlock(v)}
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`,
};
