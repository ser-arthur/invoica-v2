import type { DocumentView } from '../../../../packages/documents/src/view';
import { esc, lines, linesTable, notesBlock, para, totalsBlock } from '../../../../packages/documents/src/templates/shared';
import { onDark } from '../colour';
import { poweredBy } from '../mark';

/**
 * Signature, direction B: the route. The page's own corner is turned in the business's colour, the way Invoica's i
 * is; across the top runs the invoice's route from issued to due, in Invoica's lime to teal, with the days between;
 * the amount due is the largest thing on the page. Light, or dark on Night.
 */
export function route(dark: boolean) {
  const ground = dark ? '#09191c' : '#ffffff';
  return {
    id: dark ? 'route-dark' : 'route',
    name: dark ? 'Signature B, dark' : 'Signature B, light',
    fonts: ['Sora', 'Onest'] as const,
    footer: { font: 'Onest', inset: '0', color: dark ? '#8fa19c' : '#5b6862' },
    css: (v: DocumentView) => {
      const brand = dark ? onDark(v.brandColour, ground) : v.brandColour;
      return `
@page{size:A4;margin:0}
html,body{background:${ground}}
body{padding:16mm 16mm 16mm;min-height:297mm;font-family:'Onest',sans-serif;font-size:9.2pt;line-height:1.5;color:${dark ? 'rgb(255 255 255 / .84)' : '#16201b'};position:relative;overflow:hidden}
:root{--brand:${brand};--ink:${dark ? '#ffffff' : '#16201b'};--soft:${dark ? 'rgb(255 255 255 / .6)' : '#5b6862'};--hair:${dark ? 'rgb(255 255 255 / .12)' : '#dfe5e1'};--panel:${dark ? 'rgb(255 255 255 / .05)' : '#f3f6f4'}}
.s{font-family:'Sora',sans-serif;letter-spacing:-.025em}
.corner{position:absolute;top:0;right:0;width:26mm;height:26mm;background:linear-gradient(to bottom left,color-mix(in oklab,var(--brand) 70%,#fff),var(--brand) 55%,color-mix(in oklab,var(--brand) 70%,#000));clip-path:polygon(0 0,0 100%,100% 100%);border-bottom-left-radius:2.5mm}
.head{display:flex;align-items:center;gap:4.5mm;padding-right:30mm}
.head img{height:13mm;width:auto;max-width:44mm;object-fit:contain;display:block${dark ? ';background:#fff;border-radius:2mm;padding:1.4mm' : ''}}
.head .n{font-weight:700;font-size:18pt;line-height:1.1;color:var(--ink)}
.head .a{font-size:8.2pt;color:var(--soft);margin-top:.8mm}
.route{position:relative;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:4mm;margin:13mm 0 9mm}
.stop{display:flex;align-items:center;gap:2.6mm}
.dot{width:3.6mm;height:3.6mm;border-radius:50%;background:#cff26a;box-shadow:0 0 0 1.2mm ${dark ? 'rgb(207 242 106 / .18)' : 'rgb(55 198 107 / .15)'}}
.stop.due .dot{background:var(--brand);box-shadow:0 0 0 1.2mm color-mix(in oklab,var(--brand) 22%,transparent)}
.stop .k{font-size:7.8pt;color:var(--soft)}
.stop .v{font-weight:600;color:var(--ink);line-height:1.2}
.track{position:relative;height:.8mm;border-radius:.4mm;background:linear-gradient(90deg,#cff26a,#37c66b 55%,#138c86)}
.track span{position:absolute;left:50%;top:-6.4mm;translate:-50% 0;font-size:7.8pt;color:var(--soft);white-space:nowrap}
.big{display:grid;grid-template-columns:1fr auto;align-items:end;gap:10mm;padding-bottom:7mm;border-bottom:1.4pt solid var(--ink)}
.lab{font-size:7.8pt;color:var(--soft);margin-bottom:.8mm}
.no{font-weight:700;font-size:15pt;color:var(--ink)}
.amt{font-weight:700;font-size:40pt;line-height:.95;color:var(--ink);text-align:right;white-space:nowrap}
.amt .lab{font-family:'Onest',sans-serif;font-weight:400;letter-spacing:0;line-height:1.4;margin-bottom:1.6mm}
.amt small{display:block;font-family:'Onest',sans-serif;font-weight:500;font-size:9pt;letter-spacing:0;color:var(--brand);margin-top:2mm}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;margin:6mm 0 8mm}
.meta .nm{font-weight:600;color:var(--ink)}
.meta .x{color:var(--soft);font-size:8.6pt;margin-top:.6mm}
.intro{margin:0 0 5mm;max-width:150mm}
.intro h2{font-weight:600;font-size:12.5pt;margin:0 0 1mm;line-height:1.2;color:var(--ink)}
.intro p{color:var(--soft);margin:0}
table.lines th{font-size:7.8pt;font-weight:500;color:var(--soft);text-align:left;padding:0 0 2mm;border-bottom:.6pt solid var(--hair)}
table.lines th.num{text-align:right}
table.lines td{padding:2.6mm 0;border-bottom:.4pt solid var(--hair);vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:500;color:var(--ink)}.l-desc{color:var(--soft);font-size:8.6pt;margin-top:.4mm}
.after{display:grid;grid-template-columns:1fr 70mm;gap:10mm;margin-top:5mm;align-items:start}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{border-top:.6pt solid var(--ink);margin-top:1.2mm;padding-top:2mm;font-weight:600;color:var(--ink)}
.pay{background:var(--panel);padding:4.5mm 5mm;display:grid;gap:3mm;border-radius:2mm;border-left:1.2mm solid var(--brand)}
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
      const issued = v.dates.find((d) => d.label === 'Issued');
      const due = v.dates.find((d) => d.label === 'Due');
      const others = v.dates.filter((d) => d.label !== 'Issued' && d.label !== 'Due');
      const pay = v.payment
        .map(
          (p) =>
            `<div><div class="t">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl></div>`,
        )
        .join('');
      const days =
        issued && due ? Math.trunc((Date.parse(due.value) - Date.parse(issued.value)) / 86_400_000) : null;
      return `
<div class="corner"></div>
<header class="head">${logo ? `<img src="${esc(logo)}" alt="">` : ''}<div><div class="n s">${esc(v.seller.name)}</div><div class="a">${esc(v.seller.addressLines.join(', '))}${v.seller.contactLines.length ? ` &middot; ${esc(v.seller.contactLines.join(', '))}` : ''}</div></div></header>
<section class="route">
  <div class="stop"><span class="dot"></span><div><div class="k">Issued</div><div class="v">${esc(issued?.value ?? '')}</div></div></div>
  <div class="track">${days ? `<span>${days} days to pay</span>` : ''}</div>
  <div class="stop due"><div style="text-align:right"><div class="k">Due</div><div class="v">${esc(due?.value ?? '')}</div></div><span class="dot"></span></div>
</section>
<section class="big">
  <div><div class="lab">${esc(v.heading)}</div><div class="no s">${esc(v.number)}</div></div>
  <div class="amt s"><div class="lab" style="text-align:right">${esc(v.amountDue.label)}</div>${esc(v.amountDue.value)}${v.amountDue.dueLine ? `<small>${esc(v.amountDue.dueLine)}</small>` : ''}</div>
</section>
<section class="meta">
  <div><div class="lab">Billed to</div><div class="nm">${esc(v.buyer.name)}</div><div>${lines([v.buyer.contact, ...v.buyer.addressLines])}</div></div>
  <div><div class="lab">From</div><div class="nm">${esc(v.seller.legalName ?? v.seller.name)}</div><div>${lines(v.seller.addressLines)}</div>${v.seller.taxLine ? `<div class="x">${esc(v.seller.taxLine)}</div>` : ''}</div>
  <div>${others.map((d) => `<div class="lab">${esc(d.label)}</div><div class="nm" style="margin-bottom:2mm">${esc(d.value)}</div>`).join('')}</div>
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
