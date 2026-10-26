import type { DocumentView } from '../../../../packages/documents/src/view';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from '../../../../packages/documents/src/templates/shared';
import { contrastRatio } from '../../../../packages/core/src/index';
import { onDark } from '../colour';
import { poweredBy } from '../mark';

/**
 * Signature, direction A: the crease. The invoice's number is set large and crossed by Invoica's crease, the words
 * past it turning grey, the way the website's headline is; the amount due sits on the slip with its corner turned,
 * in the business's colour. Light, or dark on Night with the far side of the fold a shade lighter, as the sign-in
 * panel is.
 */
export function crease(dark: boolean) {
  const ground = dark ? '#09191c' : '#ffffff';
  return {
    id: dark ? 'crease-dark' : 'crease',
    name: dark ? 'Signature A, dark' : 'Signature A, light',
    fonts: ['Sora', 'Onest'] as const,
    footer: { font: 'Onest', inset: '0', color: dark ? '#8fa19c' : '#5b6862' },
    css: (v: DocumentView) => {
      const brand = dark ? onDark(v.brandColour, ground) : v.brandColour;
      // On Night, a colour too close to the ground makes a white slip with its corner turned in the colour itself.
      const paper = dark && contrastRatio(v.brandColour, ground) < 2.2;
      const slip = paper ? '#ffffff' : brand;
      const slipInk = paper ? '#09191c' : dark ? '#09191c' : v.onBrand;
      const fold = paper ? v.brandColour : `color-mix(in oklab,${brand} 62%,#000)`;
      return `
@page{size:A4;margin:0}
html,body{background:${ground}}
body{padding:15mm 16mm 16mm;min-height:297mm;font-family:'Onest',sans-serif;font-size:9.2pt;line-height:1.5;color:${dark ? 'rgb(255 255 255 / .86)' : '#16201b'};position:relative;overflow:hidden}
:root{--brand:${brand};--slip:${slip};--on:${slipInk};--fold:${fold};--ink:${dark ? '#ffffff' : '#16201b'};--soft:${dark ? 'rgb(255 255 255 / .6)' : '#5b6862'};--hair:${dark ? 'rgb(255 255 255 / .12)' : '#dfe5e1'};--panel:${dark ? 'rgb(255 255 255 / .05)' : 'color-mix(in oklab,' + v.brandColour + ' 6%,#fff)'}}
.s{font-family:'Sora',sans-serif;letter-spacing:-.02em}
${dark ? `.tone{position:absolute;inset:0;background:#0f2427;clip-path:polygon(65% 0,100% 0,100% 100%,0 100%,0 29.6%);z-index:0}` : ''}
.top{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:8mm}
.who{display:flex;gap:4mm;align-items:center;min-width:0}
.who img{height:12mm;width:auto;max-width:42mm;object-fit:contain;display:block;flex:none${dark ? ';background:#fff;border-radius:2mm;padding:1.4mm' : ''}}
.who .n{font-weight:600;font-size:13pt;line-height:1.15;color:var(--ink)}
.who .a{font-size:8.2pt;color:var(--soft);margin-top:.6mm}
.kind{font-size:8.4pt;color:var(--soft);text-align:right}
.title{position:relative;z-index:1;display:grid;grid-template-columns:1fr 70mm;gap:10mm;align-items:end;margin-top:12mm}
.fold{position:relative;display:inline-block}
.fold .t{font-weight:700;font-size:44pt;line-height:.95;letter-spacing:-.045em;color:var(--ink);white-space:nowrap;margin:0;padding:.08em .1em .14em 0}
.fold .past{position:absolute;inset:0;color:${dark ? '#6ce4a2' : '#8a949a'};clip-path:polygon(74% -30%,130% -30%,130% 130%,18% 130%)}
.fold .near{clip-path:polygon(-30% -30%,74% -30%,18% 130%,-30% 130%)}
.fold svg{position:absolute;left:0;top:-30%;width:100%;height:160%;overflow:visible}
.lab{font-size:7.8pt;color:var(--soft);margin-bottom:.6mm}
.slip{position:relative;background:var(--slip);color:var(--on);padding:5mm 7mm 5.5mm;clip-path:polygon(0 0,calc(100% - 9mm) 0,100% 9mm,100% 100%,0 100%)}
.slip::after{content:'';position:absolute;top:0;right:0;width:9mm;height:9mm;background:linear-gradient(to bottom left,transparent 50%,var(--fold) 50%)}
.slip .k{font-size:8.2pt;opacity:.85}
.slip .amt{font-weight:700;font-size:23pt;line-height:1.08;margin-top:.8mm;white-space:nowrap}
.slip .when{font-size:8.8pt;margin-top:1mm}
.facts{position:relative;z-index:1;display:flex;gap:9mm;margin:7mm 0 7mm;padding:2.6mm 0;border-top:.6pt solid var(--hair);border-bottom:.6pt solid var(--hair)}
.facts .v{font-weight:500;color:var(--ink)}
.parties{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-bottom:7mm}
.parties .nm{font-weight:600;color:var(--ink)}
.parties .x{color:var(--soft);font-size:8.6pt;margin-top:.6mm}
.intro{position:relative;z-index:1;margin:0 0 5mm;max-width:150mm}
.intro h2{font-weight:600;font-size:12.5pt;margin:0 0 1mm;line-height:1.2;color:var(--ink)}
.intro p{color:var(--soft);margin:0}
table.lines{position:relative;z-index:1}
table.lines th{font-size:7.8pt;font-weight:500;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:.6pt solid var(--ink)}
table.lines th.num{text-align:right}
table.lines td{padding:2.4mm 0;border-bottom:.4pt solid var(--hair);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:500;color:var(--ink)}.l-desc{color:var(--soft);font-size:8.6pt;margin-top:.4mm}
.after{position:relative;z-index:1;display:grid;grid-template-columns:1fr 70mm;gap:10mm;margin-top:5mm;align-items:start}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{border-top:.6pt solid var(--ink);margin-top:1.2mm;padding-top:2mm;font-weight:600;color:var(--ink)}
.pay{background:var(--panel);padding:4.5mm 5mm;display:grid;gap:3mm;border-radius:1.5mm}
.pay .t{font-weight:600;margin-bottom:.8mm;color:var(--ink)}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.5mm 5mm;margin:0;font-size:8.8pt}
.pay dt{color:var(--soft)}.pay dd{margin:0;font-weight:500;color:var(--ink)}
.notes{position:relative;z-index:1;margin-top:6mm;display:grid;gap:3mm;font-size:8.8pt;color:var(--soft);max-width:150mm}
.n-title{font-weight:600;color:var(--ink)}
.foot{position:absolute;left:16mm;right:16mm;bottom:12mm;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:8mm;padding-top:3mm;border-top:.4pt solid var(--hair);font-size:7.6pt;color:var(--soft)}
.powered{display:flex;align-items:center;gap:1.8mm;white-space:nowrap}
`;
    },
    body: (v: DocumentView, logo: string | null) => {
      const due = v.dates.find((d) => d.label === 'Due');
      const facts = [...v.dates.filter((d) => d.label !== 'Due'), ...(due ? [due] : [])];
      const line = dark ? ['#7e8a90', '#e8edef', '#9da9ae'] : ['#cff26a', '#37c66b', '#138c86'];
      const pay = v.payment
        .map(
          (p) =>
            `<div><div class="t">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl></div>`,
        )
        .join('');
      const n = esc(v.number);
      return `
${dark ? '<div class="tone"></div>' : ''}
<header class="top">
  <div class="who">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><div class="n s">${esc(v.seller.name)}</div><div class="a">${esc(v.seller.addressLines.join(', '))}${v.seller.contactLines.length ? ` &middot; ${esc(v.seller.contactLines.join(', '))}` : ''}</div></div></div>
</header>
<section class="title">
  <div><div class="lab">${esc(v.heading)}</div><div class="fold">
    <p class="t s near">${n}</p><p class="t s past" aria-hidden="true">${n}</p>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="cl" x1="18" y1="100" x2="74" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${line[0]}" stop-opacity="0"/><stop offset=".18" stop-color="${line[0]}"/><stop offset=".5" stop-color="${line[1]}"/><stop offset=".82" stop-color="${line[2]}"/><stop offset="1" stop-color="${line[2]}" stop-opacity="0"/></linearGradient></defs><line x1="18" y1="100" x2="74" y2="0" stroke="url(#cl)" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg>
  </div></div>
  <div class="slip"><div class="k">${esc(v.amountDue.label)}</div><div class="amt s">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''}</div>
</section>
<section class="facts">${facts.map((d) => `<div><div class="lab">${esc(d.label)}</div><div class="v">${esc(d.value)}</div></div>`).join('')}</section>
<section class="parties">
  <div><div class="lab">Billed to</div><div class="nm">${esc(v.buyer.name)}</div><div>${lines([v.buyer.contact, ...v.buyer.addressLines])}</div></div>
  <div><div class="lab">From</div><div class="nm">${esc(v.seller.legalName ?? v.seller.name)}</div><div>${lines(v.seller.addressLines)}</div>${v.seller.taxLine ? `<div class="x">${esc(v.seller.taxLine)}</div>` : ''}</div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2 class="s">${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep"><div>${pay ? `<div class="pay">${pay}</div>` : ''}</div><div>${totalsBlock(v)}</div></section>
${notesBlock(v)}
<footer class="foot"><span>${esc(v.seller.companyLine ?? v.legalLine)}</span>${poweredBy(dark ? '#ffffff' : '#09191c', '#37c66b', dark ? 'rgb(255 255 255 / .6)' : '#5b6862')}</footer>
`;
    },
  };
}
