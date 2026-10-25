import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, para } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/** The medallion: the logo inside a double ring. */
function medallion(logo: string | null, name: string, gold: string, colour: string): string {
  return `<svg class="medal" viewBox="0 0 200 200" aria-hidden="true">
<circle cx="100" cy="100" r="96" fill="none" stroke="${gold}" stroke-width="2.2"/>
<circle cx="100" cy="100" r="89" fill="none" stroke="${gold}" stroke-width=".8"/>
${Array.from({ length: 48 }, (_, i) => `<line x1="100" y1="6" x2="100" y2="10" stroke="${gold}" stroke-width=".9" transform="rotate(${i * 7.5} 100 100)"/>`).join('')}
${logo ? `<image href="${esc(logo)}" x="46" y="46" width="108" height="108"/>` : `<text x="100" y="124" text-anchor="middle" fill="${colour}" font-family="Cormorant" font-weight="700" font-size="72">${esc(name.slice(0, 1))}</text>`}
</svg>`;
}

/** The name set on a shallow arch, as on a bottle label, sized to its length. */
function arch(name: string, colour: string): string {
  const size = Math.min(31, 470 / Math.max(name.length, 1));
  return `<svg class="arch" viewBox="0 0 320 84" aria-hidden="true"><defs><path id="arc" d="M 16 80 Q 160 -14 304 80"/></defs>
<text fill="${colour}" font-family="Cormorant SC" font-weight="700" font-size="${size.toFixed(1)}" letter-spacing="${(size * 0.16).toFixed(1)}" text-anchor="middle"><textPath href="#arc" startOffset="50%">${esc(name.toUpperCase())}</textPath></text></svg>`;
}

const CORNER = (gold: string, paper: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M10 1 L19 10 L10 19 L1 10 Z' fill='${paper}' stroke='${gold}' stroke-width='1.1'/><path d='M10 5.5 L14.5 10 L10 14.5 L5.5 10 Z' fill='${gold}'/></svg>`)}")`;

/**
 * Heritage: for distillers, bakers of long standing, barbers, tailors, jewellers and wine merchants. Warm paper inside
 * a gold double frame with a diamond at each corner, the name arched over a medallion like a bottle label, the number
 * in oxblood, and the lines set like a price list with dotted leaders.
 */
export const heritage: ProtoTemplate = {
  id: 'heritage',
  name: 'Heritage',
  fonts: ['Cormorant', 'Cormorant SC', 'EB Garamond'],
  footer: { font: 'EB Garamond', inset: '4mm', color: '#7d7462' },
  css: (v: DocumentView) => {
    const gold = '#A8874A';
    const paper = '#F6EFDF';
    const c = CORNER(gold, paper);
    return `
@page{size:A4;margin:10mm 10mm 15mm;background:${paper}}
:root{--brand:${v.brandColour};--ink:#2a2620;--soft:#6f6654;--gold:${gold};--ox:#7A2430;--paper:${paper};--dot:#bba67a}
body{font-family:'EB Garamond',serif;font-size:10pt;line-height:1.45;color:var(--ink)}
.sc{font-family:'Cormorant SC',serif;font-weight:700;letter-spacing:.14em}
.frame{border:1.1pt solid var(--gold);padding:8mm 15mm 7mm;-webkit-box-decoration-break:clone;box-decoration-break:clone;min-height:268mm;
background:${c} left -.33mm top -.33mm/5.4mm no-repeat,${c} right -.33mm top -.33mm/5.4mm no-repeat,${c} left -.33mm bottom -.33mm/5.4mm no-repeat,${c} right -.33mm bottom -.33mm/5.4mm no-repeat,
linear-gradient(var(--gold),var(--gold)) left 2.2mm top 2.2mm/calc(100% - 4.4mm) .35mm no-repeat,linear-gradient(var(--gold),var(--gold)) left 2.2mm bottom 2.2mm/calc(100% - 4.4mm) .35mm no-repeat,linear-gradient(var(--gold),var(--gold)) left 2.2mm top 2.2mm/.35mm calc(100% - 4.4mm) no-repeat,linear-gradient(var(--gold),var(--gold)) right 2.2mm top 2.2mm/.35mm calc(100% - 4.4mm) no-repeat}
.top{text-align:center}
.arch{width:106mm;height:27.8mm;display:block;margin:0 auto -8.6mm}
.medal{width:24mm;height:24mm;display:block;margin:0 auto 2.4mm}
.addr{font-size:9.2pt;color:var(--soft)}
.orn{display:flex;align-items:center;gap:3mm;justify-content:center;margin:3.4mm auto 3mm;color:var(--gold);width:74mm}
.orn::before,.orn::after{content:'';flex:1;border-top:.7pt solid currentColor}
.orn i{width:2mm;height:2mm;background:currentColor;transform:rotate(45deg);display:block}
.title-row{display:flex;justify-content:center;align-items:baseline;gap:5mm}
.kind{font-size:12.5pt;color:var(--brand)}
.no{font-family:'Cormorant',serif;font-weight:700;font-size:21pt;color:var(--ox);letter-spacing:.02em}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin:5mm 0 4mm}
.lab{font-size:9pt;color:var(--brand);margin-bottom:.8mm}
.who .n{font-weight:600}
.dates{display:grid;grid-template-columns:auto auto;justify-content:end;gap:.2mm 6mm;margin:0;text-align:right}
.dates dt{color:var(--soft);text-align:left}.dates dd{margin:0}
.right{text-align:right}
.intro{text-align:center;margin:0 0 3.5mm}
.intro h2{font-family:'Cormorant',serif;font-weight:600;font-style:italic;font-size:17.5pt;margin:0;color:var(--brand)}
.list{margin:0;padding:0;list-style:none;border-top:.7pt solid var(--gold);padding-top:2.2mm}
.item{padding:1.5mm 0;break-inside:avoid}
.line{display:flex;align-items:baseline;gap:2mm}
.line .t{font-weight:500}
.line .dots{flex:1;border-bottom:1.3pt dotted var(--dot);transform:translateY(-1mm);min-width:8mm}
.line .a{font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.item .d{font-style:italic;color:var(--soft);font-size:9.6pt}
.line .i{font-style:italic;color:var(--soft);font-size:9.6pt;white-space:nowrap}
.totals{width:92mm;margin:4mm 0 0 auto;border-top:.7pt solid var(--gold);padding-top:2mm}
.totals .line{padding:.6mm 0}
.totals .t-total .t{font-weight:700}
.totals .soft{color:var(--soft)}
.due{text-align:center;margin:5mm auto 0;break-inside:avoid;width:110mm;border-top:.7pt solid var(--gold);border-bottom:.7pt solid var(--gold);padding:2.4mm 0 2.8mm}
.due .lab{font-size:10pt}
.due .v{font-family:'Cormorant',serif;font-weight:700;font-size:31pt;line-height:1.05;color:var(--brand)}
.due .w{font-style:italic;color:var(--soft)}
.pay{margin:4mm auto 0;text-align:center;font-size:9.6pt;break-inside:avoid}
.pay .lab{margin-bottom:1mm}
.pay .pairs{display:flex;flex-wrap:wrap;justify-content:center;gap:.6mm 7mm}
.pay .pairs span{white-space:nowrap}
.pay .pairs em{font-style:italic;color:var(--soft);margin-right:1.6mm}
.notes{text-align:center;margin-top:4mm;font-family:'Cormorant',serif;font-style:italic;font-weight:600;font-size:14pt;color:var(--ox)}
.small{text-align:center;margin-top:3mm;font-size:9pt;color:var(--soft)}
.legal{text-align:center;margin-top:3.5mm;font-size:8.4pt;color:var(--soft)}
`;
  },
  body: (v: DocumentView, logo: string | null) => {
    const c = v.columns;
    const items = v.lines
      .map((l) => {
        const inline = [
          c.quantity && l.quantity && l.unitPrice && l.quantity !== '1' ? `${esc(l.quantity)} at ${esc(l.unitPrice)}` : null,
          c.tax && l.tax ? `${esc(c.taxLabel)} ${esc(l.tax)}` : null,
          l.date,
        ].filter(Boolean);
        return `<li class="item"><div class="line"><span class="t">${esc(l.title)}</span>${inline.length ? `<span class="i">${inline.join(', ')}</span>` : ''}<span class="dots"></span><span class="a">${esc(l.amount)}</span></div>${l.description ? `<div class="d">${para(l.description)}</div>` : ''}</li>`;
      })
      .join('');
    const totals = v.totals
      .map(
        (t) =>
          `<div class="line t-${t.kind}${t.kind === 'payment' || t.kind === 'note' ? ' soft' : ''}"><span class="t">${esc(t.label)}</span><span class="dots"></span><span class="a">${esc(t.value)}</span></div>`,
      )
      .join('');
    const pay = v.payment
      .map((p) => `<div><div class="lab sc">${esc(p.title)}</div><div class="pairs">${p.rows.map((r) => `<span><em>${esc(r.label)}</em>${esc(r.value)}</span>`).join('')}</div></div>`)
      .join('');
    return `
<div class="frame">
<header class="top">
  ${arch(v.seller.name, v.brandColour)}
  ${medallion(logo, v.seller.name, '#A8874A', v.brandColour)}
  <div class="addr">${esc(v.seller.addressLines.join(', '))}<br>${esc(v.seller.contactLines.join(', '))}</div>
  <div class="orn"><i></i></div>
  <div class="title-row"><span class="kind sc">${esc(v.heading)}</span><span class="no">No. ${esc(v.number)}</span></div>
</header>
<section class="meta">
  <div class="who"><div class="lab sc">${v.kind === 'credit_note' ? 'Credited to' : 'Supplied to'}</div><div class="n word">${esc(v.buyer.name)}</div><div class="word">${lines([v.buyer.contact, ...v.buyer.addressLines, ...v.buyer.detailLines])}</div></div>
  <div class="right"><div class="lab sc">Dates</div><dl class="dates">${v.dates.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(d.value)}</dd>`).join('')}</dl></div>
</section>
${v.title || v.summary ? `<section class="intro">${v.title ? `<h2>${esc(v.title)}</h2>` : ''}${v.summary ? `<p>${para(v.summary)}</p>` : ''}</section>` : ''}
<ul class="list">${items}</ul>
<div class="totals">${totals}</div>
<section class="due"><div class="lab sc">${esc(v.amountDue.label)}</div><div class="v">${esc(v.amountDue.value)}</div>${v.amountDue.dueLine ? `<div class="w">${esc(v.amountDue.dueLine)}</div>` : ''}</section>
${pay || v.paymentLink ? `<section class="pay">${pay}${v.paymentLink ? `<div>Or pay online at ${esc(v.paymentLink)}</div>` : ''}</section>` : ''}
${v.notes ? `<p class="notes">${para(v.notes)}</p>` : ''}
${[v.creditNote, v.reverseChargeNote, v.sterlingRateNote, v.terms].filter(Boolean).map((x) => `<p class="small">${para(x)}</p>`).join('')}
<footer class="legal keep">${esc(v.seller.companyLine ?? v.legalLine)}${v.seller.companyLine && v.seller.taxLine ? `. ${esc(v.seller.taxLine)}` : ''}</footer>
</div>
`;
  },
};
