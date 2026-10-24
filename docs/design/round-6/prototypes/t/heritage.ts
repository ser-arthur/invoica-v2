import type { DocumentView } from '../../../../../packages/documents/src/index';
import { esc, lines, para } from '../../../../../packages/documents/src/templates/shared';
import type { ProtoTemplate } from '../lib';

/** The seal: the logo inside a ring with the business's name set round it, drawn in the document's own type. */
function seal(name: string, logo: string | null, colour: string): string {
  const ring = `${name.toUpperCase()}  ·  ${name.toUpperCase()}  ·  `;
  return `<svg class="seal" viewBox="0 0 200 200" aria-hidden="true">
<defs><path id="ring" d="M100 100 m-76 0 a76 76 0 1 1 152 0 a76 76 0 1 1 -152 0"/></defs>
<circle cx="100" cy="100" r="97" fill="none" stroke="${colour}" stroke-width="1.6"/>
<circle cx="100" cy="100" r="91" fill="none" stroke="${colour}" stroke-width=".7"/>
<circle cx="100" cy="100" r="62" fill="none" stroke="${colour}" stroke-width=".7"/>
<text fill="${colour}" font-family="Cormorant SC" font-weight="700" font-size="15.5" letter-spacing="3.2"><textPath href="#ring" textLength="470" lengthAdjust="spacing">${esc(ring)}</textPath></text>
${logo ? `<image href="${esc(logo)}" x="60" y="60" width="80" height="80"/>` : `<text x="100" y="118" text-anchor="middle" fill="${colour}" font-family="Cormorant" font-weight="700" font-size="56">${esc(name.slice(0, 1))}</text>`}
</svg>`;
}

/**
 * Heritage: for distillers, bakers of long standing, barbers, tailors, jewellers and wine merchants. A double-ruled
 * frame on every page, the logo set in a seal ringed with the name, a numbered heading in red, and the lines set
 * like a price list with dotted leaders.
 */
export const heritage: ProtoTemplate = {
  id: 'heritage',
  name: 'Heritage',
  fonts: ['Cormorant', 'Cormorant SC', 'EB Garamond'],
  footer: { font: 'EB Garamond', inset: '4mm', color: '#7a7466' },
  css: (v: DocumentView) => `
@page{size:A4;margin:11mm 11mm 16mm}
:root{--brand:${v.brandColour};--ink:#26241f;--soft:#6e6859;--red:#9b2c2c}
body{font-family:'EB Garamond',serif;font-size:10pt;line-height:1.45;color:var(--ink)}
.sc{font-family:'Cormorant SC',serif;font-weight:700;letter-spacing:.12em}
.frame{border:3.2pt double var(--brand);padding:8mm 13mm 8mm;-webkit-box-decoration-break:clone;box-decoration-break:clone;min-height:268mm}
.top{text-align:center}
.seal{width:29mm;height:29mm;display:block;margin:0 auto 2.5mm}
.name{font-family:'Cormorant',serif;font-weight:700;font-size:28pt;line-height:1;color:var(--brand);letter-spacing:.01em}
.addr{margin-top:1.8mm;font-size:9.4pt;color:var(--soft)}
.orn{display:flex;align-items:center;gap:3mm;justify-content:center;margin:3.5mm auto;color:var(--brand);width:70mm}
.orn::before,.orn::after{content:'';flex:1;border-top:.7pt solid currentColor}
.orn i{width:2.2mm;height:2.2mm;background:currentColor;transform:rotate(45deg);display:block}
.title-row{display:flex;justify-content:center;align-items:baseline;gap:5mm}
.kind{font-size:13pt;color:var(--brand)}
.no{font-family:'Cormorant',serif;font-weight:700;font-size:20pt;color:var(--red);letter-spacing:.02em}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin:5mm 0 4mm}
.lab{font-size:9pt;color:var(--brand);margin-bottom:.8mm}
.who .n{font-weight:600}
.dates{display:grid;grid-template-columns:auto auto;justify-content:end;gap:.2mm 6mm;margin:0;text-align:right}
.dates dt{color:var(--soft);text-align:left}.dates dd{margin:0}
.right{text-align:right}
.intro{text-align:center;margin:0 0 3.5mm}
.intro h2{font-family:'Cormorant',serif;font-weight:600;font-style:italic;font-size:17pt;margin:0;color:var(--ink)}
.list{margin:0;padding:0;list-style:none;border-top:.7pt solid var(--brand);padding-top:2mm}
.item{padding:1.4mm 0;break-inside:avoid}
.line{display:flex;align-items:baseline;gap:2mm}
.line .t{font-weight:500}
.line .dots{flex:1;border-bottom:1.2pt dotted #9c9584;transform:translateY(-1mm);min-width:8mm}
.line .a{font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.item .d{font-style:italic;color:var(--soft);font-size:9.6pt}
.line .i{font-style:italic;color:var(--soft);font-size:9.6pt;white-space:nowrap}
.totals{width:92mm;margin:4mm 0 0 auto;border-top:.7pt solid var(--brand);padding-top:2mm}
.totals .line{padding:.6mm 0}
.totals .t-total .t{font-weight:700}
.totals .soft{color:var(--soft)}
.due{text-align:center;margin:5mm 0 0;break-inside:avoid}
.due .lab{font-size:10pt}
.due .v{font-family:'Cormorant',serif;font-weight:700;font-size:30pt;line-height:1.05;color:var(--brand)}
.due .w{font-style:italic;color:var(--soft)}
.pay{margin:4mm auto 0;text-align:center;font-size:9.6pt;max-width:150mm;break-inside:avoid}
.pay .lab{margin-bottom:.4mm}
.notes{text-align:center;margin-top:4mm;font-style:italic;font-size:11.5pt;color:var(--ink)}
.small{text-align:center;margin-top:3mm;font-size:9pt;color:var(--soft)}
.legal{text-align:center;margin-top:4mm;font-size:8.4pt;color:var(--soft)}
`,
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
      .map((p) => `<div><span class="lab sc">${esc(p.title)}</span><br>${p.rows.map((r) => `${esc(r.label)} ${esc(r.value)}`).join(', ')}</div>`)
      .join('');
    return `
<div class="frame">
<header class="top">
  ${seal(v.seller.name, logo, v.brandColour)}
  <div class="name word">${esc(v.seller.name)}</div>
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
