import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Marquee: for events, DJs, venues, sound and photography. The job billed like a gig poster at the top, and the
 * amount due on a ticket at the foot, with everything needed to pay it.
 */
export const marquee: ProtoTemplate = {
  id: 'marquee',
  name: 'Marquee',
  fonts: ['Unbounded', 'Manrope'],
  footer: { font: 'Manrope', inset: '0' },
  css: (v: DocumentView) => `
@page{size:A4;margin:12mm 12mm 17mm}
:root{--brand:${v.brandColour};--ink:#141414;--soft:#5c5c5c;--line:#dedad3}
body{font-family:'Manrope',sans-serif;font-size:9.2pt;line-height:1.5;color:var(--ink)}
.wide{font-family:'Unbounded',sans-serif}
.poster{background:var(--ink);color:#f4f1ec;border-radius:3mm;padding:8mm 9mm 9mm;break-inside:avoid}
.top{display:flex;justify-content:space-between;align-items:center;gap:8mm}
.brand{display:flex;align-items:center;gap:3.5mm}
.brand img{height:12mm;width:12mm;object-fit:contain}
.brand .n{font-family:'Unbounded';font-weight:600;font-size:11pt;letter-spacing:-.01em}
.ident{text-align:right;font-size:8.6pt;color:#bdb8b0}
.ident b{display:block;font-family:'Unbounded';font-weight:700;font-size:13pt;color:var(--brand);letter-spacing:-.01em}
.bill{margin-top:13mm;font-family:'Unbounded';font-weight:800;font-size:27pt;line-height:1.02;letter-spacing:-.035em;max-width:160mm}
.strap{margin-top:5mm;display:flex;gap:4mm;align-items:center;font-size:9.6pt;color:#d9d4cc}
.strap::before{content:'';flex:none;width:14mm;height:2.2mm;background:var(--brand);border-radius:2mm}
.meta{display:grid;grid-template-columns:1fr 1fr 58mm;gap:7mm;margin:8mm 1mm 7mm}
.lab{font-family:'Unbounded';font-weight:600;font-size:7.2pt;letter-spacing:.02em;color:var(--soft);margin-bottom:1.2mm}
.party .n{font-weight:700}
.extra{color:var(--soft);font-size:8.6pt}
.dates{display:grid;grid-template-columns:auto 1fr;gap:.8mm 4mm;margin:0;align-content:start}
.dates dt{color:var(--soft)}.dates dd{margin:0;text-align:right;font-weight:600}
table.lines{margin:0 1mm;width:calc(100% - 2mm)}
table.lines th{font-family:'Unbounded';font-weight:600;font-size:7.2pt;letter-spacing:.02em;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:1.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.8mm 0;border-bottom:.6pt solid var(--line);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:700}.l-desc{color:var(--soft);font-size:8.6pt}
.c-amt{font-weight:700}
.sum{display:grid;grid-template-columns:1fr 78mm;gap:12mm;margin:4mm 1mm 0}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{border-top:1.6pt solid var(--ink);margin-top:1.4mm;padding-top:2mm;font-weight:800;font-size:10.4pt}
.t-payment,.t-note{color:var(--soft)}
.notes{display:grid;gap:3mm;font-size:8.8pt;color:#333}
.n-title{font-family:'Unbounded';font-weight:600;font-size:7.2pt;color:var(--soft);margin-bottom:.6mm}
.ticket{margin-top:9mm;break-inside:avoid}
.stub{position:relative;display:grid;grid-template-columns:1.05fr 1.3fr 48mm;background:var(--ink);color:#f4f1ec;border-radius:3mm}
.stub>div{padding:7mm 0 7mm 8mm}
.stub>div:last-child{padding:7mm 8mm 7mm 8mm;border-left:1.4pt dashed #5c5c5c}
.notch{position:absolute;right:48mm;width:8mm;height:8mm;margin-right:-4mm;border-radius:50%;background:#fff}
.notch.t{top:-4mm}.notch.b{bottom:-4mm}
.stub .lab{color:#a9a39a}
.stub .amt{font-family:'Unbounded';font-weight:800;font-size:25pt;line-height:1.05;letter-spacing:-.035em;color:var(--brand);white-space:nowrap}
.stub .when{margin-top:1.5mm;color:#d9d4cc;font-size:8.8pt}
.stub dl{display:grid;grid-template-columns:auto 1fr;gap:.4mm 4mm;margin:0;font-size:8.4pt}
.stub dt{color:#a9a39a}.stub dd{margin:0}
.stub .no{font-family:'Unbounded';font-weight:700;font-size:11pt;color:#f4f1ec}
.stub .link{margin-top:2mm;font-size:8.4pt;color:#d9d4cc;overflow-wrap:anywhere}
.legal{margin:5mm 1mm 0;font-size:7.6pt;color:var(--soft)}
`,
  body: (v: DocumentView, logo: string | null) => {
    const bank = v.payment[0];
    const others = v.payment.slice(1);
    return `
<section class="poster">
  <div class="top">
    <div class="brand">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<span class="n">${esc(v.seller.name)}</span></div>
    <div class="ident">${esc(v.heading)}<b>${esc(v.number)}</b></div>
  </div>
  <div class="bill word">${esc(v.title ?? v.heading)}</div>
  ${v.summary ? `<div class="strap"><span>${para(v.summary)}</span></div>` : ''}
</section>
<section class="meta">
  <div class="party"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${v.buyer.detailLines.length ? `<div class="extra">${lines(v.buyer.detailLines)}</div>` : ''}</div>
  <div class="party"><div class="lab">From</div><div class="n word">${esc(v.seller.legalName ?? v.seller.name)}</div><div class="word">${lines(v.seller.addressLines)}</div><div class="extra">${lines([...v.seller.contactLines, v.seller.taxLine])}</div></div>
  <dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl>
</section>
${linesTable(v)}
<section class="sum keep"><div>${notesBlock(v)}</div><div>${totalsBlock(v)}</div></section>
<section class="ticket">
  <div class="stub"><span class="notch t"></span><span class="notch b"></span>
    <div><div class="lab">${esc(v.amountDue.label)}</div><div class="amt">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
    <div>${bank ? `<div class="lab">${esc(bank.title)}</div><dl>${bank.rows.filter((r) => r.label !== 'Reference').map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>` : ''}${others.map((p) => `<div class="lab" style="margin-top:2mm">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>`).join('')}</div>
    <div><div class="lab">Quote this</div><div class="no">${esc(v.number)}</div>${v.paymentLink ? `<div class="link">Or pay at ${esc(v.paymentLink)}</div>` : ''}</div>
  </div>
</section>
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`;
  },
};
