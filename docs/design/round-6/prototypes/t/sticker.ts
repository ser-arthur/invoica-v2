import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, linesTable, notesBlock, para, paymentBlock, totalsBlock } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/**
 * Sticker: for cafés, bakers, makers and classes. Soft, round type; the logo as a die-cut sticker on a
 * tinted card; the amount due on a rounded label set at a slight tilt.
 */
export const sticker: ProtoTemplate = {
  id: 'sticker',
  name: 'Sticker',
  fonts: ['Fraunces', 'Figtree'],
  footer: { font: 'Figtree', inset: '0', color: '#8a6f68' },
  css: (v: DocumentView) => `
@page{size:A4;margin:14mm 14mm 18mm}
:root{--brand:${v.brandColour};--on:${v.onBrand};--tint:color-mix(in oklab,${v.brandColour} 13%,#fff);--tint2:color-mix(in oklab,${v.brandColour} 6%,#fff);--ink:#3a2320;--soft:#7b605a}
body{font-family:'Figtree',sans-serif;font-size:9.6pt;line-height:1.5;color:var(--ink)}
.disp{font-family:'Fraunces',serif;font-variation-settings:'SOFT' 100,'WONK' 1;font-optical-sizing:auto}
.card{position:relative;background:var(--tint);border-radius:9mm;padding:11mm 11mm 9mm 46mm;margin-top:4mm;display:grid;grid-template-columns:1fr auto;gap:6mm;align-items:end}
.sticker{position:absolute;top:-6mm;left:-3mm;width:41mm;height:41mm;border-radius:50%;background:#fff;padding:2.2mm;transform:rotate(-9deg);display:grid;place-items:center}
.sticker img{width:100%;height:100%;object-fit:contain;border-radius:50%}
.sticker .mono{width:100%;height:100%;border-radius:50%;background:var(--brand);color:var(--on);display:grid;place-items:center;font-size:30pt;font-weight:800}
.name{font-size:27pt;font-weight:800;line-height:.98;letter-spacing:-.015em;max-width:110mm}
.from{margin-top:3.5mm;color:var(--soft);font-size:8.8pt;line-height:1.45}
.ident{text-align:right;padding-right:1mm}
.kind{font-size:13pt;font-style:italic;font-weight:500}
.no{font-size:20pt;font-weight:700;letter-spacing:-.01em;white-space:nowrap}
.meta{display:grid;grid-template-columns:1.2fr 1fr;gap:10mm;margin:7mm 2mm 6mm}
.lab{font-weight:700;font-size:8.2pt;color:var(--brand);margin-bottom:1mm;filter:brightness(.82)}
.who .name2{font-weight:700;font-size:10.5pt}
.dates{display:grid;grid-template-columns:auto 1fr;gap:1.2mm 6mm;align-content:start}
.dates dt{color:var(--soft)}.dates dd{margin:0;text-align:right;font-weight:600}
.intro{margin:0 2mm 6mm}
.intro h2{font-size:17pt;font-weight:700;line-height:1.15;margin:0 0 1.4mm;letter-spacing:-.01em}
.intro p{color:var(--soft);max-width:150mm}
table.lines{margin:0 0 2mm}
table.lines th{font-size:8.2pt;font-weight:700;color:var(--soft);text-align:left;padding:0 3mm 2mm}
table.lines th.num{text-align:right}
table.lines td{padding:2.6mm 3mm;vertical-align:top}
table.lines tbody tr:nth-child(odd) td{background:var(--tint2)}
table.lines tbody tr td:first-child{border-radius:3.5mm 0 0 3.5mm}
table.lines tbody tr td:last-child{border-radius:0 3.5mm 3.5mm 0}
.l-title{font-weight:650}.l-desc{color:var(--soft);font-size:8.8pt;margin-top:.4mm}
.c-amt{font-weight:650}
.after{display:grid;grid-template-columns:1fr 78mm;gap:12mm;margin-top:5mm;align-items:start}
.totals{padding:0 3mm}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{font-weight:750;font-size:10.5pt;border-top:1.4pt dotted var(--ink);margin-top:1.5mm;padding-top:2mm}
.t-payment,.t-note{color:var(--soft)}
.due{margin:7mm 0 0 auto;width:max-content;max-width:100%;background:var(--brand);color:var(--on);border-radius:20mm;padding:4.5mm 9mm 4.8mm;transform:rotate(-3deg);text-align:center}
.due .d-label{font-weight:700;font-size:8.6pt;opacity:.9}
.due .d-value{font-size:25pt;font-weight:800;line-height:1.05;letter-spacing:-.01em}
.due .d-when{font-size:8.6pt;font-weight:600;margin-top:.6mm}
.pay{background:var(--tint2);border-radius:6mm;padding:5mm 6mm;display:grid;gap:3.5mm}
.p-title{font-family:'Fraunces',serif;font-variation-settings:'SOFT' 100,'WONK' 1;font-weight:700;font-size:11pt;margin-bottom:1mm}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.7mm 5mm;margin:0;font-size:9pt}
.pay dt{color:var(--soft)}.pay dd{margin:0;font-weight:600}
.notes{margin:7mm 2mm 0;display:grid;gap:3mm;max-width:150mm}
.notes .n-title{display:none}
.notes p{font-family:'Fraunces',serif;font-variation-settings:'SOFT' 100,'WONK' 1;font-style:italic;font-size:13pt;line-height:1.35}
.notes .n-rc,.notes .n-credit{font-family:'Figtree',sans-serif;font-style:normal;font-size:9pt}
.legal{margin:6mm 2mm 0;font-size:7.8pt;color:var(--soft)}
`,
  body: (v: DocumentView, logo: string | null) => `
<header class="card">
  <div class="sticker">${logo ? `<img src="${esc(logo)}" alt="${esc(v.seller.name)}">` : `<div class="mono disp">${esc(v.seller.name.slice(0, 1))}</div>`}</div>
  <div><div class="name disp word">${esc(v.seller.name)}</div><div class="from">${lines([v.seller.addressLines.join(', '), ...v.seller.contactLines, v.seller.taxLine])}</div></div>
  <div class="ident"><div class="kind disp">${esc(v.heading)}</div><div class="no disp">${esc(v.number)}</div></div>
</header>
<section class="meta">
  <div class="who"><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'For'}</div><div class="name2 word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2 class="disp">${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep">
  <div>${paymentBlock(v)}</div>
  <div>${totalsBlock(v)}<div class="due"><div class="d-label">${esc(v.amountDue.label)}</div><div class="d-value disp">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="d-when">${esc(v.amountDue.dueLine)}</div>` : ''}</div></div>
</section>
${notesBlock(v)}
<footer class="legal keep">${esc(v.legalLine)}</footer>
`,
};
