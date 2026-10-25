import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';
import WIDTHS from '../funnel800.json' with { type: 'json' };
import { contrast } from './marquee';

const TRACK = -0.045;
/** The size, in mm, at which the name fills `width` mm in Funnel Display 800, from its advance widths. */
function fit(name: string, width: number, max: number, min: number) {
  const w = WIDTHS as Record<string, number>;
  const em = [...name].reduce((sum, ch) => sum + (w[ch] ?? 0.6), 0) + TRACK * (name.length - 1);
  return Math.max(min, Math.min(max, (width * 0.985) / em));
}

/**
 * Billboard: for design studios, agencies and developers who want to be loud. The studio's name fills the width of a
 * block of its own colour like a hoarding, and the amount due is the other big thing on the page.
 */
export const billboard: ProtoTemplate & { logoVariant: string } = {
  id: 'billboard',
  name: 'Billboard',
  logoVariant: '-board',
  fonts: ['Funnel Display', 'Inter Tight'],
  footer: { font: 'Inter Tight', inset: '12mm', color: '#6b6b6b' },
  css: (v: DocumentView) => {
    const size = fit(v.seller.name, 186, 62, 20);
    // Black on the board wherever it reads at least as well as white: a hoarding is printed in black.
    const on = contrast(v.brandColour, '#111111') >= contrast(v.brandColour, '#ffffff') ? '#111111' : '#ffffff';
    return `
@page{size:A4;margin:14mm 0 18mm}
@page:first{margin-top:0}
:root{--brand:${v.brandColour};--on:${on};--ink:#111;--soft:#626262;--line:#e4e4e4}
body{font-family:'Inter Tight',sans-serif;font-size:9pt;line-height:1.5;color:var(--ink)}
.f{font-family:'Funnel Display',sans-serif}
.board{background:var(--brand);color:var(--on);padding:10mm 12mm 0;overflow:hidden}
.board .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;font-size:8.6pt;font-weight:500}
.board .top img{width:14mm;height:14mm;display:block;margin-bottom:3mm}
.board .top .r{text-align:right}
.board .ct span{margin-right:4mm;white-space:nowrap}
.board .top .r b{display:block;font-family:'Funnel Display';font-weight:800;font-size:18pt;line-height:1.1;letter-spacing:-.02em}
.board .name{font-family:'Funnel Display';font-weight:800;font-size:${size.toFixed(2)}mm;line-height:.8;letter-spacing:${TRACK}em;margin:${size > 30 ? 9 : 6}mm 0 0;padding-bottom:${(size * (/[gjpqy,]/.test(v.seller.name) ? 0.2 : 0.05)).toFixed(2)}mm;white-space:${size > 20 ? 'nowrap' : 'normal'}}
.wrap{padding:0 12mm}
.open{display:grid;grid-template-columns:1fr 66mm;gap:12mm;margin:8mm 0 6mm}
.open h1{font-family:'Funnel Display';font-weight:800;font-size:22pt;line-height:1.05;letter-spacing:-.025em;margin:0}
.open p{margin:2mm 0 0;font-size:10pt;color:var(--soft);max-width:110mm}
.lab{font-weight:600;font-size:7.6pt;color:var(--soft);margin-bottom:1mm}
.who .n{font-weight:600}
.who+.dl{margin-top:4mm}
.dl dl{display:grid;grid-template-columns:auto 1fr;gap:.3mm 5mm;margin:0}
.dl dt{color:var(--soft)}.dl dd{margin:0;font-weight:500}
table.lines th{font-weight:600;font-size:7.6pt;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:1.8pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.6mm 0;border-bottom:.6pt solid var(--line);vertical-align:baseline}
table.lines td+td,table.lines th+th{padding-left:6mm}
.l-title{font-family:'Funnel Display';font-weight:700;font-size:12.5pt;letter-spacing:-.01em;line-height:1.2}
.l-desc{color:var(--soft);font-size:8.6pt}
.c-amt{font-family:'Funnel Display';font-weight:700;font-size:11pt}
.sum{display:grid;grid-template-columns:1fr 72mm;gap:12mm;margin-top:4mm}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:.9mm 0}
.t-total{border-top:1.8pt solid var(--ink);margin-top:1.2mm;padding-top:1.8mm;font-weight:700}
.t-payment,.t-note{color:var(--soft)}
.notes{display:grid;gap:3mm;font-size:8.8pt}
.n-title{font-weight:600;font-size:7.6pt;color:var(--soft);margin-bottom:.6mm}
.due{margin-top:7mm;background:var(--ink);color:#f2f2f2;display:grid;grid-template-columns:1fr 70mm;gap:10mm;padding:8mm 9mm;break-inside:avoid}
.due .lab{color:#9a9a9a}
.due .amt{font-family:'Funnel Display';font-weight:800;font-size:46pt;line-height:.95;letter-spacing:-.035em;color:var(--brand);white-space:nowrap}
.due .when{margin-top:2mm;font-weight:500}
.due dl{display:grid;grid-template-columns:auto 1fr;gap:.4mm 5mm;margin:0;font-size:8.6pt}
.due dt{color:#9a9a9a}.due dd{margin:0}
.due .link{margin-top:2.4mm;font-size:8.6pt}
.foot{margin-top:4mm;font-size:7.6pt;color:var(--soft)}
`;
  },
  body: (v: DocumentView, logo: string | null) => {
    const bank = v.payment[0];
    const others = v.payment.slice(1);
    return `
<header class="board">
  <div class="top">
    <div>${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div>${esc(v.seller.addressLines.join(', '))}</div><div class="ct">${v.seller.contactLines.map((c) => `<span>${esc(c)}</span>`).join('')}</div></div>
    <div class="r">${esc(v.heading)}<b>${esc(v.number)}</b></div>
  </div>
  <div class="name word">${esc(v.seller.name)}</div>
</header>
<div class="wrap">
<section class="open">
  <div>${v.title ? `<h1>${esc(v.title)}</h1>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</div>
  <div><div class="who"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'For'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <div class="dl"><dl>${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div></div>
</section>
${linesTable(v)}
<section class="sum keep"><div>${notesBlock(v)}</div><div>${totalsBlock(v)}</div></section>
<section class="due">
  <div><div class="lab">${esc(v.amountDue.label)}</div><div class="amt">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
  <div>${bank ? `<div class="lab">${esc(bank.title)}</div><dl>${bank.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>` : ''}${others.map((p) => `<div class="lab" style="margin-top:2.4mm">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl>`).join('')}${v.paymentLink ? `<div class="link">Or pay at ${esc(v.paymentLink)}</div>` : ''}</div>
</section>
<footer class="foot keep"><div>${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</div></footer>
</div>
`;
  },
};
