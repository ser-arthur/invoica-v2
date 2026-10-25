import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, para, paymentBlock, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Arch: for wedding planners, stylists and venues. The page is warm paper, the business sits in an arched window in
 * its own colour at the head, set like wedding stationery, and the balance closes the page under a smaller arch.
 */
export const olive: ProtoTemplate & { logoVariant: string } = {
  id: 'olive',
  name: 'Arch',
  logoVariant: '-light',
  fonts: ['Cormorant Garamond', 'DM Sans'],
  footer: { font: 'DM Sans', inset: '0', color: '#7a7c6c' },
  css: (v: DocumentView) => `
@page{size:A4;margin:16mm 20mm 20mm;background:#F6F1E6}
@page:first{margin-top:14mm}
:root{--brand:${v.brandColour};--on:#F3ECDA;--ink:#2E3125;--soft:#6c6f5f;--line:color-mix(in oklab,${v.brandColour} 28%,#F6F1E6);--paper:#F6F1E6}
body{font-family:'DM Sans',sans-serif;font-size:9pt;line-height:1.5;color:var(--ink)}
.cg{font-family:'Cormorant Garamond',serif}
.arch{width:84mm;margin:0 auto;background:var(--brand);color:var(--on);border-radius:42mm 42mm 0 0;padding:10mm 8mm 7mm;text-align:center}
.arch img{width:19mm;height:19mm;display:block;margin:0 auto 3mm}
.arch .name{font-family:'Cormorant Garamond';font-style:italic;font-weight:500;font-size:27pt;line-height:1}
.foot{margin-top:5mm;padding-top:3mm;border-top:.6pt solid var(--line)}
.contact{text-align:center;font-size:8.2pt;color:var(--ink);letter-spacing:.02em}
.contact span{display:inline-block;margin:0 2.6mm}
.feature{text-align:center;margin:7mm auto 0;max-width:150mm}
.feature h1{font-family:'Cormorant Garamond';font-weight:500;font-size:24pt;line-height:1.1;margin:0}
.feature p{font-family:'Cormorant Garamond';font-style:italic;font-size:12.5pt;color:var(--soft);margin:1.6mm 0 0}
.band{display:grid;grid-template-columns:1.25fr 1fr 1fr;margin:6mm 0 4mm;border-top:.6pt solid var(--line);border-bottom:.6pt solid var(--line)}
.band>div{padding:3mm 0;text-align:center}
.band>div+div{border-left:.6pt solid var(--line)}
.lab{font-size:7.4pt;letter-spacing:.18em;text-transform:uppercase;color:var(--brand);margin-bottom:1.4mm}
.band .n{font-family:'Cormorant Garamond';font-weight:600;font-size:12.5pt;line-height:1.2}
.band .x{font-size:8.4pt;color:var(--soft)}
.band dl{display:inline-grid;grid-template-columns:auto auto;gap:.2mm 4mm;margin:0;text-align:left;font-size:8.6pt}
.band dt{color:var(--soft)}.band dd{margin:0}
table.lines th{font-size:7.2pt;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--soft);text-align:left;padding:0 0 2.2mm;border-bottom:.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2mm 0;border-bottom:.6pt solid var(--line);vertical-align:baseline}
table.lines td+td,table.lines th+th{padding-left:6mm}
.l-title{font-family:'Cormorant Garamond';font-weight:600;font-size:12.5pt;line-height:1.2}
.l-desc{color:var(--soft);font-size:8.4pt}
.after{display:grid;grid-template-columns:1fr 74mm;gap:14mm;margin-top:4mm;align-items:end;break-inside:avoid}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.8mm 0}
.t-total{border-top:.6pt solid var(--ink);margin-top:1.2mm;padding-top:1.8mm;font-weight:500}
.t-payment,.t-note{color:var(--soft)}
.due{margin-top:4mm;background:var(--brand);color:var(--on);border-radius:37mm 37mm 0 0;padding:6.5mm 6mm 4mm;text-align:center}
.due .d-label{font-size:7.4pt;letter-spacing:.18em;text-transform:uppercase;opacity:.85}
.due .d-value{font-family:'Cormorant Garamond';font-weight:500;font-size:28pt;line-height:1.1;margin-top:1mm}
.due .d-when{font-size:8.4pt;opacity:.85}
.pay{display:grid;gap:3mm;font-size:8.6pt}
.p-title{font-size:7.4pt;letter-spacing:.18em;text-transform:uppercase;color:var(--brand);margin-bottom:1.2mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.2mm 5mm;margin:0}
.pay dt{color:var(--soft)}.pay dd{margin:0}
.thanks{margin-top:5mm;text-align:center;font-family:'Cormorant Garamond';font-style:italic;font-size:15pt;color:var(--brand)}
.small{text-align:center;font-size:8.2pt;color:var(--soft);margin-top:2mm}
.legal{margin-top:1.4mm;text-align:center;font-size:7.4pt;color:var(--soft)}
`,
  body: (v: DocumentView, logo: string | null) => `
<header>
  <div class="arch">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div class="name word">${esc(v.seller.name)}</div></div>
</header>
${v.title || v.summary ? `<section class="feature">${v.title ? `<h1>${esc(v.title)}</h1>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
<section class="band">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'For'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="x word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <div><div class="lab">${esc(v.heading)}</div><div class="n">${esc(v.number)}</div></div>
  <div><div class="lab">Dates</div><dl>${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div>
</section>
${linesTable(v)}
<section class="after">
  <div>${paymentBlock(v)}</div>
  <div>${totalsBlock(v)}<div class="due"><div class="d-label">${esc(v.amountDue.label)}</div><div class="d-value">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</div></div>
</section>
${v.notes ? `<p class="thanks">${para(v.notes)}</p>` : ''}
${[v.creditNote, v.reverseChargeNote, v.sterlingRateNote, v.terms].filter(Boolean).map((x) => `<p class="small">${para(x)}</p>`).join('')}
<footer class="foot keep"><div class="contact"><div>${esc(v.seller.addressLines.join(', '))}</div>${v.seller.contactLines.map((c) => `<span>${esc(c)}</span>`).join('')}</div><div class="legal">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</div></footer>
`,
};
