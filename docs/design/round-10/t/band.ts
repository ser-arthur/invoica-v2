import type { DocumentView } from '../../../../packages/documents/src/view';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from '../../../../packages/documents/src/templates/shared';
import { mix } from '../colour';
import { poweredBy } from '../mark';

/**
 * Signature, direction A with a Night head: a light page whose top is the sign-in panel's sheet, Night with its corner
 * turned in the business's colour and one shade lighter past the crease. The number is set large across it and
 * crossed by the crease; the amount due stands at its right. Everything below is the light page, so it prints light.
 */
export function band() {
  const night = '#09191c';
  return {
    id: 'crease-band',
    name: 'Signature A, Night head',
    fonts: ['Sora', 'Onest'] as const,
    footer: { font: 'Onest', inset: '0', color: '#5b6862' },
    css: (v: DocumentView) => {
      const brand = v.brandColour;
      return `
@page{size:A4;margin:0}
html,body{background:#fff}
body{padding:0 16mm 16mm;min-height:297mm;font-family:'Onest',sans-serif;font-size:9.2pt;line-height:1.5;color:#16201b;position:relative;overflow:hidden}
:root{--brand:${brand};--ink:#16201b;--soft:#5b6862;--hair:#dfe5e1;--panel:color-mix(in oklab,${brand} 6%,#fff);--f:18mm}
.s{font-family:'Sora',sans-serif;letter-spacing:-.02em}
.head{position:relative;margin:0 -16mm 8mm;padding:12mm 16mm 10mm;background:${night};color:rgb(255 255 255 / .78);clip-path:polygon(0 0,calc(100% - var(--f)) 0,100% var(--f),100% 100%,0 100%)}
.head .tone{position:absolute;inset:0;background:#0f2427;clip-path:polygon(58% 0,100% 0,100% 100%,40% 100%)}
.flap{position:absolute;top:0;right:0;width:var(--f);height:var(--f);border-bottom-left-radius:2.4mm;background:linear-gradient(to bottom left,${mix(brand, '#ffffff', 0.45)},${brand} 50%,${mix(brand, '#000000', 0.25)});clip-path:polygon(0 0,0 100%,100% 100%);z-index:2}
.top{position:relative;z-index:1;display:flex;gap:4mm;align-items:center;padding-right:16mm}
.top img{height:11mm;width:auto;max-width:40mm;object-fit:contain;display:block;flex:none;background:#fff;border-radius:2mm;padding:1.4mm}
.top .n{font-weight:600;font-size:13pt;line-height:1.15;color:#fff}
.top .a{font-size:8.2pt;color:rgb(255 255 255 / .6);margin-top:.6mm}
.title{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto;gap:10mm;align-items:end;margin-top:14mm}
.lab{font-size:7.8pt;color:var(--soft);margin-bottom:.6mm}
.head .lab{color:#6ce4a2}
.fold{position:relative;display:inline-block}
.fold .t{font-weight:700;font-size:46pt;line-height:.95;letter-spacing:-.045em;color:#fff;white-space:nowrap;margin:0;padding:.08em .1em .14em 0}
.fold .past{position:absolute;inset:0;color:#6ce4a2;clip-path:polygon(74% -30%,130% -30%,130% 130%,18% 130%)}
.fold .near{clip-path:polygon(-30% -30%,74% -30%,18% 130%,-30% 130%)}
.fold svg{position:absolute;left:0;top:-30%;width:100%;height:160%;overflow:visible}
.due{text-align:right}
.due .amt{font-weight:700;font-size:25pt;line-height:1.05;color:#fff;white-space:nowrap}
.due .when{font-size:8.8pt;color:#cff26a;margin-top:1mm}
.facts{display:flex;gap:9mm;margin:0 0 7mm;padding:0 0 3mm;border-bottom:.6pt solid var(--hair)}
.facts .v{font-weight:500;color:var(--ink)}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-bottom:7mm}
.parties .nm{font-weight:600;color:var(--ink)}
.parties .x{color:var(--soft);font-size:8.6pt;margin-top:.6mm}
.intro{margin:0 0 5mm;max-width:150mm}
.intro h2{font-weight:600;font-size:12.5pt;margin:0 0 1mm;line-height:1.2;color:var(--ink)}
.intro p{color:var(--soft);margin:0}
table.lines th{font-size:7.8pt;font-weight:500;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.4mm 0;border-bottom:.4pt solid var(--hair);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:500;color:var(--ink)}.l-desc{color:var(--soft);font-size:8.6pt;margin-top:.4mm}
.after{display:grid;grid-template-columns:1fr 70mm;gap:10mm;margin-top:5mm;align-items:start}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{border-top:.6pt solid var(--ink);margin-top:1.2mm;padding-top:2mm;font-weight:600;color:var(--ink)}
.pay{background:var(--panel);padding:4.5mm 5mm;display:grid;gap:3mm;border-radius:1.5mm}
.pay .t{font-weight:600;margin-bottom:.8mm;color:var(--ink)}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.5mm 5mm;margin:0;font-size:8.8pt}
.pay dt{color:var(--soft)}.pay dd{margin:0;font-weight:500;color:var(--ink)}
.notes{margin-top:6mm;display:grid;gap:3mm;font-size:8.8pt;color:var(--soft);max-width:150mm}
.n-title{font-weight:600;color:var(--ink)}
.foot{position:absolute;left:16mm;right:16mm;bottom:12mm;display:flex;justify-content:space-between;align-items:center;gap:8mm;padding-top:3mm;border-top:.4pt solid var(--hair);font-size:7.6pt;color:var(--soft)}
.powered{display:flex;align-items:center;gap:1.8mm;white-space:nowrap}
`;
    },
    body: (v: DocumentView, logo: string | null) => {
      const pay = v.payment
        .map(
          (p) =>
            `<div><div class="t">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl></div>`,
        )
        .join('');
      const n = esc(v.number);
      return `
<header class="head">
  <div class="tone"></div><div class="flap"></div>
  <div class="top">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><div class="n s">${esc(v.seller.name)}</div><div class="a">${esc(v.seller.addressLines.join(', '))}${v.seller.contactLines.length ? ` &middot; ${esc(v.seller.contactLines.join(', '))}` : ''}</div></div></div>
  <div class="title">
    <div><div class="lab">${esc(v.heading)}</div><div class="fold">
      <p class="t s near">${n}</p><p class="t s past" aria-hidden="true">${n}</p>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="cl" x1="18" y1="100" x2="74" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#cff26a" stop-opacity="0"/><stop offset=".2" stop-color="#cff26a"/><stop offset=".55" stop-color="#46da80"/><stop offset=".85" stop-color="#2fb3a6"/><stop offset="1" stop-color="#2fb3a6" stop-opacity="0"/></linearGradient></defs><line x1="18" y1="100" x2="74" y2="0" stroke="url(#cl)" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg>
    </div></div>
    <div class="due"><div class="lab">${esc(v.amountDue.label)}</div><div class="amt s">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
  </div>
</header>
<section class="facts">${v.dates.map((d) => `<div><div class="lab">${esc(d.label)}</div><div class="v">${esc(d.value)}</div></div>`).join('')}</section>
<section class="parties">
  <div><div class="lab">Billed to</div><div class="nm">${esc(v.buyer.name)}</div><div>${lines([v.buyer.contact, ...v.buyer.addressLines])}</div></div>
  <div><div class="lab">From</div><div class="nm">${esc(v.seller.legalName ?? v.seller.name)}</div><div>${lines(v.seller.addressLines)}</div>${v.seller.taxLine ? `<div class="x">${esc(v.seller.taxLine)}</div>` : ''}</div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2 class="s">${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep"><div>${pay ? `<div class="pay">${pay}</div>` : ''}</div><div>${totalsBlock(v)}</div></section>
${notesBlock(v)}
<footer class="foot"><span>${esc(v.seller.companyLine ?? v.legalLine)}</span>${poweredBy('#09191c', '#37c66b', '#5b6862')}</footer>
`;
    },
  };
}
