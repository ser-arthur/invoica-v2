import type { DocumentView } from '../view';
import { creaseCss, creaseNumber, onNight, POWERED_CSS, poweredByInvoica } from './invoica';
import { esc, fitPt, lines, linesTable, logoTile, notesBlock, onWhite, para, totalsBlock } from './shared';

/**
 * Invoica's own template, the default and the free plan's, in four styles (docs/specs/invoice-templates.md):
 *
 * - Night head (`signature`): the top of the page is the sign-in panel's sheet, Night with its corner turned in the
 *   business's colour. The number is set large and crossed by the crease, and past the crease the band is a shade
 *   lighter, along the same line. The amount due stands at the right of the band. Below it the page is light.
 * - Light (`signature-light`): the number crossed by the crease, its far side grey; the amount due on a slip of the
 *   business's colour with its corner turned, the way Invoica's mark turns the corner of its i.
 * - Route and Route on Night (`signature-route`, `signature-route-dark`): the page's corner turned in the business's
 *   colour, the way from issue to due along Invoica's line, and the amount due the largest thing on the page.
 *
 * Every style ends with "Powered by" and Invoica's wordmark.
 */

const NIGHT = '#09191c';
const NIGHT_TONE = '#0f2427';
const MINT = '#6ce4a2';
const LIME = '#cff26a';
const LINE_ON_NIGHT: [string, string, string] = ['#cff26a', '#46da80', '#2fb3a6'];
const LINE_ON_WHITE: [string, string, string] = ['#cff26a', '#37c66b', '#138c86'];

/** The parts below the top, the same in every style; `c` carries the colours for a light or a Night page. */
function lower(c: { ink: string; soft: string; hair: string; panel: string; brand: string }) {
  return `
.parties{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-bottom:6mm}
.parties .nm{font-weight:600;color:${c.ink}}
.parties .x{color:${c.soft};font-size:8.6pt;margin-top:.8mm}
.intro{margin:0 0 5mm;max-width:150mm}
.intro h2{font-family:'Sora',sans-serif;letter-spacing:-.02em;font-weight:600;font-size:12.5pt;margin:0 0 1.2mm;line-height:1.2;color:${c.ink}}
.intro p{color:${c.soft};margin:0}
table.lines th{font-size:7.8pt;font-weight:500;color:${c.soft};text-align:left;padding:0 0 2mm;border-bottom:.6pt solid ${c.ink}}
table.lines th.num{text-align:right}
table.lines td{padding:2.1mm 0;border-bottom:.4pt solid ${c.hair};vertical-align:top}
table.lines td+td,table.lines th+th{padding-left:5mm}
.l-title{font-weight:500;color:${c.ink}}.l-desc{color:${c.soft};font-size:8.6pt;margin-top:.4mm}
.c-date{width:24mm;white-space:nowrap}
.c-amt{font-weight:500}
.after{display:grid;grid-template-columns:1fr 72mm;gap:10mm;margin-top:4mm;align-items:start}
.t-row{display:flex;justify-content:space-between;gap:6mm;padding:1mm 0}
.t-total{border-top:.6pt solid ${c.ink};margin-top:1.2mm;padding-top:2mm;font-weight:600;color:${c.ink}}
.t-payment,.t-note{color:${c.soft}}
.t-due{margin-top:2.4mm;padding:2.4mm 0 0;border-top:1.4pt solid ${c.brand};font-weight:600;font-size:10.5pt;color:${c.ink}}
.pay{background:${c.panel};padding:4.5mm 5mm;display:grid;gap:3.5mm;border-radius:1.5mm}
.pay .t{font-weight:600;margin-bottom:1mm;color:${c.ink}}
.pay dl{display:grid;grid-template-columns:auto 1fr;gap:.5mm 5mm;margin:0;font-size:8.8pt}
.pay dt{color:${c.soft}}.pay dd{margin:0;font-weight:500;overflow-wrap:anywhere;color:${c.ink}}
.notes{margin-top:5mm;display:grid;gap:3mm;font-size:8.8pt;color:${c.soft};max-width:150mm}
.n-title{font-weight:600;color:${c.ink};margin-bottom:.5mm}
.n-rc,.n-credit{font-weight:500;color:${c.ink}}
.legal{margin-top:5mm;padding-top:2.6mm;border-top:.4pt solid ${c.hair};font-size:7.8pt;color:${c.soft};display:flex;justify-content:space-between;align-items:center;gap:8mm}
.lab{font-size:7.8pt;color:${c.soft};margin-bottom:.6mm}
${POWERED_CSS}`;
}

/** The parties, the summary, the lines, how to pay beside the totals, the notes and the foot. */
function lowerBody(v: DocumentView, mark: string) {
  const pay =
    v.payment.length || v.paymentLink
      ? `<div class="pay">${v.payment
          .map(
            (p) =>
              `<div><div class="t">${esc(p.title)}</div><dl>${p.rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd>`).join('')}</dl></div>`,
          )
          .join(
            '',
          )}${v.paymentLink ? `<div><div class="t">Pay online</div><div class="word">${esc(v.paymentLink)}</div></div>` : ''}</div>`
      : '';
  return `
<section class="parties">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="nm word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${
    v.buyer.detailLines.length ? `<div class="x word">${lines(v.buyer.detailLines)}</div>` : ''
  }</div>
  <div><div class="lab">From</div><div class="nm word">${esc(v.seller.legalName ?? v.seller.name)}</div><div class="word">${lines(v.seller.addressLines)}</div>${
    v.seller.taxLine ? `<div class="x">${esc(v.seller.taxLine)}</div>` : ''
  }</div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2 class="word">${esc(v.title)}</h2>` : ''}${v.summary ? `<p class="word">${para(v.summary)}</p>` : ''}</section>` : ''}
${linesTable(v)}
<section class="after keep">
  <div>${pay}</div>
  <div>${totalsBlock(v)}${
    v.totals.some((t) => t.kind === 'payment')
      ? `<div class="t-row t-due"><span>${esc(v.amountDue.label)}</span><span>${esc(v.amountDue.value)}</span></div>`
      : ''
  }</div>
</section>
${notesBlock(v)}
<footer class="legal keep"><span>${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</span>${mark}</footer>`;
}

const facts = (v: DocumentView, skip: string[] = []) =>
  v.dates
    .filter((d) => !skip.includes(d.label))
    .sort((a, b) => Number(a.label === 'Due') - Number(b.label === 'Due'))
    .map((d) => `<div><div class="lab">${esc(d.label)}</div><div class="v">${esc(d.value)}</div></div>`)
    .join('');

const who = (v: DocumentView, logo: string | null, tile: string | null) =>
  `<div class="who">${logo ? `<span class="lg"${tile ? ` style="background:${tile}"` : ''}><img src="${esc(logo)}" alt=""></span>` : ''}<div><div class="n word">${esc(v.seller.name)}</div><div class="a">${esc(
    [v.seller.addressLines.join(', '), ...v.seller.contactLines].filter(Boolean).join(' · '),
  )}</div></div></div>`;

const whoCss = (size: number, ink: string, soft: string, tiled: boolean) => `
.who{display:flex;gap:4.5mm;align-items:center;min-width:0}
.who .lg{display:block;flex:none${tiled ? ';border-radius:2mm;padding:1.4mm' : ''}}
.who img{height:${tiled ? 10.5 : 12}mm;width:auto;max-width:44mm;object-fit:contain;display:block}
.who .n{font-family:'Sora',sans-serif;letter-spacing:-.02em;font-weight:600;font-size:${size}pt;line-height:1.15;color:${ink}}
.who .a{font-size:8.2pt;color:${soft};margin-top:.8mm}`;

const amountPt = (v: DocumentView, widthMm: number, max: number, min: number) =>
  fitPt(v.amountDue.value, widthMm, 0.62, max, min);

/** Night head: the default. */
export const signature = {
  id: 'signature',
  footer: { font: 'Onest', inset: '16mm', color: '#5b6862' },
  fonts: ['Sora', 'Onest'] as const,
  css: (v: DocumentView) => {
    const tile = logoTile(v) ?? '#ffffff';
    return `
@page{size:A4;margin:15mm 0 18mm}
@page:first{margin-top:0}
@media screen{body{padding:0 0 18mm}}
body{font-family:'Onest',sans-serif;font-size:9.2pt;line-height:1.5;color:#16201b;font-variant-numeric:tabular-nums}
.head{position:relative;overflow:hidden;padding:11mm 16mm 9mm;background:${NIGHT};color:rgb(255 255 255 / .78);clip-path:polygon(0 0,calc(100% - 18mm) 0,100% 18mm,100% 100%,0 100%);margin-bottom:7mm}
.flap{position:absolute;top:0;right:0;width:18mm;height:18mm;z-index:2;border-bottom-left-radius:2.4mm;background:linear-gradient(to bottom left,color-mix(in oklab,${v.brandColour} 55%,#fff),${v.brandColour} 50%,color-mix(in oklab,${v.brandColour} 75%,#000));clip-path:polygon(0 0,0 100%,100% 100%)}
.head .who{padding-right:18mm}
${whoCss(13, '#ffffff', 'rgb(255 255 255 / .62)', !!tile)}
.title{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10mm;align-items:end;margin-top:11mm}
.head .lab{font-size:7.8pt;color:${MINT};margin-bottom:.6mm}
${creaseCss(fitPt(v.number, 96, 0.64, 46, 20), '#ffffff', MINT)}
.due{text-align:right}
.due .amt{font-family:'Sora',sans-serif;font-weight:700;letter-spacing:-.02em;font-size:${amountPt(v, 78, 25, 15)}pt;line-height:1.05;color:#ffffff;white-space:nowrap}
.due .when{font-size:8.8pt;color:${LIME};margin-top:1mm}
.wrap{padding:0 16mm}
.facts{display:flex;flex-wrap:wrap;gap:0 9mm;margin:0 0 6mm;padding:0 0 2.6mm;border-bottom:.6pt solid #dfe5e1}
.facts .v{font-weight:500}
${lower({ ink: '#16201b', soft: '#5b6862', hair: '#dfe5e1', panel: `color-mix(in oklab,${v.brandColour} 6%,#fff)`, brand: v.brandColour })}
`;
  },
  body: (v: DocumentView, logo: string | null) => `
<header class="head">
  <span class="flap" aria-hidden="true"></span>
  ${who(v, logo, logoTile(v) ?? '#ffffff')}
  <div class="title">
    <div><div class="lab">${esc(v.heading)}</div>${creaseNumber(v.number, { line: LINE_ON_NIGHT, tone: NIGHT_TONE })}</div>
    <div class="due"><div class="lab">${esc(v.amountDue.label)}</div><div class="amt">${esc(v.amountDue.value)}</div>${
      v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''
    }</div>
  </div>
</header>
<div class="wrap">
<section class="facts">${facts(v)}</section>
${lowerBody(v, poweredByInvoica(NIGHT, '#37c66b', '#5b6862'))}
</div>
`,
};

/** Light: the number crossed by the crease and the amount due on the slip. */
export const signatureLight = {
  id: 'signature-light',
  footer: { font: 'Onest', inset: '0', color: '#5b6862' },
  fonts: ['Sora', 'Onest'] as const,
  css: (v: DocumentView) => `
@page{size:A4;margin:15mm 16mm 18mm}
@media screen{body{padding:15mm 16mm 18mm}}
:root{--brand:${v.brandColour};--on:${v.onBrand};--fold:color-mix(in oklab,${v.brandColour} 62%,#000)}
body{font-family:'Onest',sans-serif;font-size:9.2pt;line-height:1.5;color:#16201b;font-variant-numeric:tabular-nums}
${whoCss(13, '#16201b', '#5b6862', false)}
.title{display:grid;grid-template-columns:minmax(0,1fr) 70mm;gap:10mm;align-items:end;margin-top:10mm}
${creaseCss(fitPt(v.number, 92, 0.64, 44, 20), '#16201b', '#8a949a')}
.slip{position:relative;background:var(--brand);color:var(--on);padding:5mm 7mm 5.5mm;clip-path:polygon(0 0,calc(100% - 9mm) 0,100% 9mm,100% 100%,0 100%);break-inside:avoid}
.slip::after{content:'';position:absolute;top:0;right:0;width:9mm;height:9mm;background:linear-gradient(to bottom left,transparent 50%,var(--fold) 50%)}
.slip .k{font-size:8.2pt;opacity:.85}
.slip .amt{font-family:'Sora',sans-serif;font-weight:700;letter-spacing:-.02em;font-size:${amountPt(v, 56, 23, 14)}pt;line-height:1.08;margin-top:.8mm;white-space:nowrap}
.slip .when{font-size:8.8pt;margin-top:1mm}
.facts{display:flex;flex-wrap:wrap;gap:0 9mm;margin:6mm 0;padding:2.4mm 0;border-top:.6pt solid #dfe5e1;border-bottom:.6pt solid #dfe5e1}
.facts .v{font-weight:500}
${lower({ ink: '#16201b', soft: '#5b6862', hair: '#dfe5e1', panel: `color-mix(in oklab,${v.brandColour} 6%,#fff)`, brand: v.brandColour })}
`,
  body: (v: DocumentView, logo: string | null) => `
<header>${who(v, logo, null)}</header>
<section class="title">
  <div><div class="lab">${esc(v.heading)}</div>${creaseNumber(v.number, { line: LINE_ON_WHITE })}</div>
  <div class="slip"><div class="k">${esc(v.amountDue.label)}</div><div class="amt">${esc(v.amountDue.value)}</div>${
    v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''
  }</div>
</section>
<section class="facts">${facts(v)}</section>
${lowerBody(v, poweredByInvoica(NIGHT, '#37c66b', '#5b6862'))}
`,
};

/** Route, on white or on Night. */
function route(dark: boolean) {
  const ink = dark ? '#ffffff' : '#16201b';
  const soft = dark ? 'rgb(255 255 255 / .62)' : '#5b6862';
  const hair = dark ? 'rgb(255 255 255 / .14)' : '#dfe5e1';
  return {
    id: dark ? 'signature-route-dark' : 'signature-route',
    footer: { font: 'Onest', inset: '16mm', color: dark ? '#93a3a0' : '#5b6862' },
    fonts: ['Sora', 'Onest'] as const,
    css: (v: DocumentView) => {
      const brand = dark ? onNight(v.brandColour, NIGHT, 3) : v.brandColour;
      const brandText = dark ? onNight(v.brandColour, NIGHT) : onWhite(v.brandColour);
      const tile = dark ? (logoTile(v) ?? '#ffffff') : null;
      return `
@page{size:A4;margin:15mm 0 18mm${dark ? `;background:${NIGHT}` : ''}}
@page:first{margin-top:0}
@media screen{html,body{background:${dark ? NIGHT : '#ffffff'}}body{padding:0 0 18mm}}
body{font-family:'Onest',sans-serif;font-size:9.2pt;line-height:1.5;color:${dark ? 'rgb(255 255 255 / .86)' : '#16201b'};font-variant-numeric:tabular-nums}
.corner{position:absolute;top:0;right:0;width:24mm;height:24mm;border-bottom-left-radius:2.5mm;background:linear-gradient(to bottom left,color-mix(in oklab,${brand} 70%,#fff),${brand} 55%,color-mix(in oklab,${brand} 70%,#000));clip-path:polygon(0 0,0 100%,100% 100%)}
.wrap{padding:14mm 16mm 0}
.wrap>header{padding-right:20mm}
${whoCss(18, ink, soft, !!tile)}
.who .n{font-weight:700}
.route{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:4mm;margin:12mm 0 8mm}
.stop{display:flex;align-items:center;gap:2.6mm}
.dot{width:3.6mm;height:3.6mm;border-radius:50%;flex:none;background:${LIME};box-shadow:0 0 0 1.2mm ${dark ? 'rgb(207 242 106 / .18)' : 'rgb(55 198 107 / .16)'}}
.stop.end .dot{background:${brand};box-shadow:0 0 0 1.2mm color-mix(in oklab,${brand} 24%,transparent)}
.stop.end{text-align:right}
.stop .k{font-size:7.8pt;color:${soft}}
.stop .v{font-weight:600;color:${ink};line-height:1.2;white-space:nowrap}
.track{position:relative;height:.8mm;border-radius:.4mm;background:linear-gradient(90deg,${LIME},#37c66b 55%,#138c86)}
.track span{position:absolute;left:50%;top:-6.4mm;translate:-50% 0;font-size:7.8pt;color:${soft};white-space:nowrap}
.big{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:10mm;padding-bottom:7mm;border-bottom:1.4pt solid ${ink};margin-top:9mm}
.route+.big{margin-top:0}
.no{font-family:'Sora',sans-serif;letter-spacing:-.025em;font-weight:700;font-size:${fitPt(v.number, 70, 0.64, 15, 10)}pt;color:${ink};white-space:nowrap}
.amt{text-align:right}
.amt .fig{font-family:'Sora',sans-serif;font-weight:700;letter-spacing:-.035em;font-size:${amountPt(v, 112, 40, 20)}pt;line-height:.95;color:${ink};white-space:nowrap}
.amt .when{font-weight:500;font-size:9pt;color:${brandText};margin-top:2mm}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;margin:5mm 0 6mm}
.meta .nm{font-weight:600;color:${ink}}
.meta .x{color:${soft};font-size:8.6pt;margin-top:.6mm}
.meta .v{font-weight:600;color:${ink};margin-bottom:2mm}
${lower({ ink, soft, hair, panel: dark ? 'rgb(255 255 255 / .05)' : '#f3f6f4', brand })}
.pay{border-left:1.2mm solid ${brand}}
`;
    },
    body: (v: DocumentView, logo: string | null) => {
      const r = v.route;
      const tile = dark ? (logoTile(v) ?? '#ffffff') : null;
      const skip = r ? ['Issued', 'Due'] : [];
      const others = v.dates.filter((d) => !skip.includes(d.label));
      return `
<span class="corner" aria-hidden="true"></span>
<div class="wrap">
<header>${who(v, logo, tile)}</header>
${
  r
    ? `<section class="route">
  <div class="stop"><span class="dot"></span><div><div class="k">Issued</div><div class="v">${esc(r.issued)}</div></div></div>
  <div class="track"><span>${r.days} ${r.days === 1 ? 'day' : 'days'} to pay</span></div>
  <div class="stop end"><div><div class="k">Due</div><div class="v">${esc(r.due)}</div></div><span class="dot"></span></div>
</section>`
    : ''
}
<section class="big">
  <div><div class="lab">${esc(v.heading)}</div><div class="no">${esc(v.number)}</div></div>
  <div class="amt"><div class="lab">${esc(v.amountDue.label)}</div><div class="fig">${esc(v.amountDue.value)}</div>${
    v.amountDue.dueLine ? `<div class="when">${esc(v.amountDue.dueLine)}</div>` : ''
  }</div>
</section>
<section class="meta">
  <div><div class="lab">${v.kind === 'credit_note' ? 'Credit to' : 'Billed to'}</div><div class="nm word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines])}</div>${
    v.buyer.detailLines.length ? `<div class="x word">${lines(v.buyer.detailLines)}</div>` : ''
  }</div>
  <div><div class="lab">From</div><div class="nm word">${esc(v.seller.legalName ?? v.seller.name)}</div><div class="word">${lines(v.seller.addressLines)}</div>${
    v.seller.taxLine ? `<div class="x">${esc(v.seller.taxLine)}</div>` : ''
  }</div>
  <div>${others.map((d) => `<div class="lab">${esc(d.label)}</div><div class="v">${esc(d.value)}</div>`).join('')}</div>
</section>
${lowerBody(v, poweredByInvoica(dark ? '#ffffff' : NIGHT, dark ? '#46da80' : '#37c66b', soft)).replace(/<section class="parties">[\s\S]*?<\/section>/, '')}
</div>
`;
    },
  };
}

export const signatureRoute = route(false);
export const signatureRouteDark = route(true);
