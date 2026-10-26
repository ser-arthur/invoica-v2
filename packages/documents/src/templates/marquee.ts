import { contrastRatio } from '@invoica/core';
import type { DocumentView } from '../view';
import { esc, lines, linesTable, logoTile, notesBlock, para, totalsBlock } from './shared';

/** A colour taken towards black: each channel scaled by `keep`. */
function darker(hex: string, keep: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = (shift: number) =>
    Math.trunc(((n >> shift) & 255) * keep)
      .toString(16)
      .padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}

/** The ticket's ground and the colour of the amount on it, from the brand colour and the second colour. */
function ticketColours(brand: string, accent: string): { ground: string; amount: string } {
  const ground = contrastRatio(accent, '#ffffff') >= 7 ? accent : darker(brand, 0.3);
  const amount = [brand, accent].find((c) => contrastRatio(c, ground) >= 3) ?? '#ffffff';
  return { ground, amount };
}

/**
 * Marquee: for events, DJs, venues and photographers. The job billed like a gig poster in the business's colour, the
 * title in the second colour, and the amount due on a ticket at the foot with everything needed to pay it.
 */
export const marquee = {
  id: 'marquee',
  footer: { font: 'Manrope', inset: '0' },
  fonts: ['Bricolage Grotesque', 'Manrope'] as const,
  css: (v: DocumentView) => {
    const ticket = ticketColours(v.brandColour, v.accentColour);
    const tile = logoTile(v);
    return `
@page{size:A4;margin:12mm 12mm 17mm}
@media screen{body{padding:12mm 12mm 17mm}}
:root{--brand:${v.brandColour};--on:${v.onBrand};--accent:${v.accentColour};--ink:#141414;--soft:#5c5c5c;--line:#e2ded7;--amt:${ticket.amount};--ticket:${ticket.ground}}
body{font-family:'Manrope',sans-serif;font-size:9.2pt;line-height:1.5;color:var(--ink)}
.d{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;letter-spacing:-.03em}
.poster{background:var(--brand);color:var(--on);border-radius:3mm;padding:8mm 9mm 7mm;break-inside:avoid}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm}
.brand{display:flex;align-items:center;gap:4mm}
.brand .lg{flex:none;display:grid;place-items:center${tile ? `;background:${tile};border-radius:2.4mm;padding:1.6mm` : ''}}
.brand img{height:${tile ? 11 : 13}mm;width:auto;max-width:40mm;object-fit:contain;display:block}
.brand .n{font-weight:800;font-size:11pt;letter-spacing:-.01em;line-height:1.2}
.brand .a{font-size:8.2pt;opacity:.8;margin-top:.4mm}
.ident{text-align:right;font-size:8.4pt;opacity:.9}
.ident b{display:block;font-size:15pt;line-height:1.1;margin-top:.6mm;color:var(--accent)}
.bill{margin-top:9mm;font-size:42pt;line-height:.92;letter-spacing:-.045em;max-width:176mm;color:var(--accent)}
.strap{margin-top:3mm;font-size:10pt;font-weight:600}
.reach{display:flex;flex-wrap:wrap;gap:1.5mm 8mm;margin-top:6mm;padding-top:3.2mm;border-top:.8pt solid color-mix(in srgb,var(--on) 35%,transparent);font-size:8.4pt;font-weight:600}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin:6mm 1mm 5mm}
.lab{font-weight:800;font-size:7.6pt;letter-spacing:.02em;color:var(--soft);margin-bottom:1.2mm}
.party .n{font-weight:700}
.extra{color:var(--soft);font-size:8.6pt}
.dates{display:grid;grid-template-columns:auto auto;justify-content:end;gap:.8mm 8mm;margin:0;align-content:start}
.dates dt{color:var(--soft)}.dates dd{margin:0;text-align:right;font-weight:600}
table.lines{margin:0 1mm;width:calc(100% - 2mm)}
table.lines th{font-weight:800;font-size:7.6pt;letter-spacing:.02em;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:1.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.3mm 0;border-bottom:.6pt solid var(--line);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:700}.l-desc{color:var(--soft);font-size:8.6pt}
.c-amt{font-weight:700}
.sum{display:grid;grid-template-columns:1fr 78mm;gap:12mm;margin:4mm 1mm 0}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{border-top:1.6pt solid var(--ink);margin-top:1.4mm;padding-top:2mm;font-weight:800;font-size:10.4pt}
.t-payment,.t-note{color:var(--soft)}
.notes{display:grid;gap:3mm;font-size:8.8pt;color:#333}
.n-title{font-weight:800;font-size:7.6pt;color:var(--soft);margin-bottom:.6mm}
.n-rc,.n-credit{font-weight:600;color:var(--ink)}
.ticket{margin-top:7mm;break-inside:avoid}
.stub{position:relative;display:grid;grid-template-columns:1.05fr 1.3fr 48mm;background:var(--ticket);color:#f4f1ec;border-radius:3mm}
.stub>div{padding:7mm 0 7mm 8mm;min-width:0}
.stub>div:last-child{padding:7mm 8mm 7mm 8mm;border-left:1.4pt dashed rgb(255 255 255 / .3)}
.notch{position:absolute;right:48mm;width:8mm;height:8mm;margin-right:-4mm;border-radius:50%;background:#fff}
.notch.t{top:-4mm}.notch.b{bottom:-4mm}
.stub .lab{color:rgb(255 255 255 / .62)}
.stub .amt{font-size:27pt;line-height:1.05;color:var(--amt);white-space:nowrap}
.stub .when{margin-top:1.5mm;color:rgb(255 255 255 / .84);font-size:8.8pt}
.stub dl{display:grid;grid-template-columns:auto 1fr;gap:.4mm 4mm;margin:0;font-size:8.4pt}
.stub dt{color:rgb(255 255 255 / .62)}.stub dd{margin:0}
.stub .no{font-size:14pt;color:#f4f1ec}
.stub .link{margin-top:2mm;font-size:8.4pt;color:rgb(255 255 255 / .84);overflow-wrap:anywhere}
.legal{margin:5mm 1mm 0;font-size:7.6pt;color:var(--soft)}
`;
  },
  body: (v: DocumentView, logo: string | null) => {
    const bank = v.payment[0];
    const others = v.payment.slice(1);
    return `
<section class="poster">
  <div class="top">
    <div class="brand">${logo ? `<span class="lg"><img src="${esc(logo)}" alt="${esc(v.seller.name)}"></span>` : ''}<div><div class="n word">${esc(v.seller.name)}</div><div class="a word">${esc(v.seller.addressLines.join(', '))}</div></div></div>
    <div class="ident">${esc(v.heading)}<b class="d">${esc(v.number)}</b></div>
  </div>
  <div class="bill d word">${esc(v.title ?? v.heading)}</div>
  ${v.summary ? `<div class="strap word">${para(v.summary)}</div>` : ''}
  ${v.seller.contactLines.length ? `<div class="reach">${v.seller.contactLines.map((c) => `<span class="word">${esc(c)}</span>`).join('')}</div>` : ''}
</section>
<section class="meta">
  <div class="party"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${v.buyer.detailLines.length ? `<div class="extra word">${lines(v.buyer.detailLines)}</div>` : ''}</div>
  <dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl>
</section>
${linesTable(v)}
<section class="sum keep"><div>${notesBlock(v)}</div><div>${totalsBlock(v)}</div></section>
<section class="ticket">
  <div class="stub"><span class="notch t"></span><span class="notch b"></span>
    <div><div class="lab">${esc(v.amountDue.label)}</div><div class="amt d">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
    <div>${
      bank
        ? `<div class="lab">${esc(bank.title)}</div><dl>${bank.rows
            .filter((r) => r.label !== 'Reference')
            .map((r) => `<dt>${esc(r.label)}</dt><dd class="word">${esc(r.value)}</dd>`)
            .join('')}</dl>`
        : ''
    }${others.map((p) => `<div class="lab" style="margin-top:2mm">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd class="word">${esc(r.value)}</dd>`).join('')}</dl>`).join('')}</div>
    <div><div class="lab">Reference</div><div class="no d">${esc(v.number)}</div>${v.paymentLink ? `<div class="link">Or pay at ${esc(v.paymentLink)}</div>` : ''}</div>
  </div>
</section>
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
`;
  },
};
