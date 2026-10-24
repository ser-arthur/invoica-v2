import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, para, paymentBlock, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Atelier: for florists, stylists, interiors, photographers and fashion. A centred letterhead with the mark above
 * the name, a narrow serif with its italic, wide margins and a quiet tint behind the amount due.
 */
export const atelier: ProtoTemplate = {
  id: 'atelier',
  name: 'Atelier',
  fonts: ['Instrument Serif', 'Instrument Sans'],
  footer: { font: 'Instrument Sans', inset: '0' },
  css: (v: DocumentView) => `
@page{size:A4;margin:16mm 18mm 20mm}
:root{--brand:${v.brandColour};--ink:color-mix(in oklab,${v.brandColour} 35%,#141414);--soft:#68706b;--line:color-mix(in oklab,${v.brandColour} 18%,#fff);--tint:color-mix(in oklab,${v.brandColour} 9%,#fff)}
body{font-family:'Instrument Sans',sans-serif;font-size:9.2pt;line-height:1.55;color:var(--ink)}
.serif{font-family:'Instrument Serif',serif;font-weight:400}
.letterhead{text-align:center}
.mark{height:14mm;margin:0 auto 2.5mm;display:block}
.mark-word{font-family:'Instrument Serif';font-style:italic;font-size:15pt;color:var(--brand);margin-bottom:1mm}
.name{font-family:'Instrument Serif';font-size:31pt;line-height:1;color:var(--brand);letter-spacing:-.005em}
.addr{margin-top:2.5mm;font-size:8.4pt;color:var(--soft);line-height:1.5}
.rule{width:28mm;height:0;border-top:.8pt solid var(--brand);margin:6mm auto 6mm}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:12mm}
.lab{font-size:8pt;color:var(--soft);margin-bottom:1mm}
.who .n{font-family:'Instrument Serif';font-size:14pt;line-height:1.2}
.right{justify-self:end;text-align:right}
.inv{font-family:'Instrument Serif';font-size:14pt;line-height:1.2}
.inv i{font-style:italic;color:var(--brand)}
.dates{display:grid;grid-template-columns:auto auto;gap:.6mm 6mm;margin:1.5mm 0 0;justify-content:end}
.dates dt{color:var(--soft);text-align:left}.dates dd{margin:0;text-align:right}
.intro{margin:8mm 0 5mm;text-align:center}
.intro h2{font-family:'Instrument Serif';font-weight:400;font-size:23pt;line-height:1.1;margin:0 0 2mm}
.intro p{font-family:'Instrument Serif';font-style:italic;font-size:12.5pt;color:var(--soft);max-width:150mm;margin:0 auto;line-height:1.35}
table.lines th{font-size:7.8pt;font-weight:500;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:.6pt solid var(--brand)}
table.lines th.num{text-align:right}
table.lines td{padding:2.4mm 0;border-bottom:.5pt solid var(--line);vertical-align:baseline}
table.lines td+td,table.lines th+th{padding-left:6mm}
.l-title{font-family:'Instrument Serif';font-size:12.5pt;line-height:1.25}
.l-desc{color:var(--soft);font-size:8.6pt}
.totals{margin:0}
.mid{display:grid;grid-template-columns:1fr 76mm;gap:12mm;margin-top:5mm;align-items:start;break-inside:avoid}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.9mm 0}
.t-total{border-top:.6pt solid var(--brand);margin-top:1.2mm;padding-top:2mm;font-weight:600}
.t-payment,.t-note{color:var(--soft)}
.due{margin-top:5mm;background:var(--tint);padding:5mm 8mm;display:flex;justify-content:space-between;align-items:baseline;gap:8mm;break-inside:avoid}
.due .d-label{font-family:'Instrument Serif';font-style:italic;font-size:15pt}
.due .d-when{font-size:8.6pt;color:var(--soft)}
.due .d-value{font-family:'Instrument Serif';font-size:31pt;line-height:1;color:var(--brand);white-space:nowrap}
.foot{display:block;max-width:130mm;margin:7mm auto 0;text-align:center;break-inside:avoid}
.pay{display:grid;gap:3mm}
.p-title{font-family:'Instrument Serif';font-size:12pt;margin-bottom:.6mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.3mm 5mm;margin:0;font-size:8.6pt}
.pay dt{color:var(--soft)}.pay dd{margin:0}
.words p{margin-bottom:2mm}
.words .note{font-family:'Instrument Serif';font-style:italic;font-size:13pt;line-height:1.35}
.words .small{font-size:8.6pt;color:var(--soft)}
.legal{margin-top:6mm;text-align:center;font-size:7.6pt;color:var(--soft)}
`,
  body: (v: DocumentView, logo: string | null) => `
<header class="letterhead">
  ${logo ? `<img class="mark" src="${esc(logo)}" alt="">` : ''}
  <div class="name word">${esc(v.seller.name)}</div>
  <div class="addr">${esc(v.seller.addressLines.join(', '))}<br>${lines([v.seller.contactLines.join(', '), v.seller.taxLine])}</div>
</header>
<div class="rule"></div>
<section class="meta">
  <div class="who"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'For'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <div class="right"><div class="inv"><i>${esc(v.heading)}</i> ${esc(v.number)}</div><dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="mid"><div>${paymentBlock(v)}</div>${totalsBlock(v)}</section>
<section class="due"><div><div class="d-label">${esc(v.amountDue.label)}</div>${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</div><div class="d-value">${esc(v.amountDue.value)}</div></section>
<section class="foot">
  <div class="words">${[
    v.creditNote ? `<p class="small">${esc(v.creditNote)}</p>` : '',
    v.reverseChargeNote ? `<p class="small">${esc(v.reverseChargeNote)}</p>` : '',
    v.sterlingRateNote ? `<p class="small">${esc(v.sterlingRateNote)}</p>` : '',
    v.notes ? `<p class="note">${para(v.notes)}</p>` : '',
    v.terms ? `<p class="small">${para(v.terms)}</p>` : '',
  ].join('')}</div>
</section>
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`,
};
