// Six invoice template mocks rendered from one document shape. Round 1 design mocks; not production code.
'use strict';
const { totals, money, date, qty, rate, esc } = require('./core');

const path = require('path');
const { pathToFileURL } = require('url');
const FONT_ROOT = pathToFileURL(path.join(__dirname, 'node_modules', '@fontsource')).href;
const fonts = (...specs) => specs.map((s) => `<link rel="stylesheet" href="${FONT_ROOT}/${s}.css">`).join('\n');

const lines = (arr) => arr.filter(Boolean).map(esc).join('<br>');

const BASE = `
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-kerning: normal; font-variant-numeric: lining-nums; }
.num, .when, dd, .mono, .sum, .tab { font-variant-numeric: tabular-nums lining-nums; }
table { border-collapse: collapse; width: 100%; }
thead { display: table-header-group; }
tr, .keep { break-inside: avoid; page-break-inside: avoid; }
.num { text-align: right; white-space: nowrap; }
p { margin: 0; }
`;

function head(title, fontLinks, css) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(title)}</title>${fontLinks}<style>${BASE}${css}</style></head>`;
}

function qtyCell(doc, l, m) {
  if (l.amountOnly) return { q: '', u: '' };
  return { q: qty(l.qty) + (l.unit && doc.columns === 'qty' ? ` <span class="unit">${esc(l.unit)}</span>` : ''), u: m.fmt(l.unitMinor) };
}

/* 1. Counsel: professional practices. */
function counsel(doc) {
  const t = totals(doc), m = money(doc), o = doc.org, c = doc.client;
  const css = `
@page { size: A4; margin: 16mm 20mm 28mm; }
body { font-family: 'Source Serif 4', serif; color: #1F2733; font-size: 9.6pt; line-height: 1.45; }
.letterhead { text-align: center; padding-bottom: 5mm; border-bottom: 0.6pt solid ${doc.brand}; margin-bottom: 1.2mm; }
.letterhead + .rule { border-top: 0.6pt solid ${doc.brand}; margin-bottom: 9mm; }
.firm { font-size: 22pt; font-variant: small-caps; letter-spacing: 0.09em; font-weight: 500; color: ${doc.brand}; line-height: 1.1; }
.strap { font-style: italic; color: #4A5462; margin-top: 1.2mm; font-size: 10pt; }
.contact { color: #5B6573; font-size: 8.4pt; margin-top: 2.2mm; }
.top { display: grid; grid-template-columns: 1fr 72mm; gap: 10mm; margin-bottom: 9mm; }
h1 { font-size: 15pt; font-weight: 600; margin: 0 0 4mm; letter-spacing: 0.01em; }
.label { color: #6A7381; font-size: 8.4pt; font-style: italic; }
.to .name { font-weight: 600; font-size: 10.6pt; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 1.4mm 6mm; margin: 0; font-size: 9.2pt; }
dt { color: #6A7381; font-style: italic; }
dd { margin: 0; text-align: right; }
table.lines th { font-weight: 600; font-size: 8.4pt; text-align: left; padding: 0 0 2mm; border-bottom: 0.6pt solid #1F2733; }
table.lines th.num { text-align: right; }
table.lines td { padding: 3mm 0 3mm; border-bottom: 0.4pt solid #C9CED6; vertical-align: top; }
table.lines td + td, table.lines th + th { padding-left: 5mm; }
.desc { font-weight: 500; }
.detail { color: #5B6573; font-size: 8.6pt; margin-top: 0.6mm; }
.unit { color: #6A7381; }
.after { display: grid; grid-template-columns: 1fr 74mm; gap: 12mm; margin-top: 7mm; }
table.vat td, table.vat th { font-size: 8.4pt; padding: 1.2mm 0; }
table.vat th { text-align: left; font-weight: 600; border-bottom: 0.4pt solid #C9CED6; }
table.vat td + td, table.vat th + th { padding-left: 4mm; }
.sum div { display: flex; justify-content: space-between; padding: 1.4mm 0; }
.sum .grand { border-top: 0.6pt solid #1F2733; border-bottom: 1.8pt double #1F2733; margin-top: 1.5mm; padding: 2.4mm 0; font-weight: 600; font-size: 11.5pt; color: ${doc.brand}; }
.pay { margin-top: 10mm; display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; font-size: 9pt; }
.pay h2 { font-size: 9.6pt; font-weight: 600; margin: 0 0 1.5mm; }
`;
  const vatCol = (l) => l.taxes.length ? rate(l.taxes[0].rateBp) : 'n/a';
  return `${head(doc.number, fonts('source-serif-4/400', 'source-serif-4/400-italic', 'source-serif-4/500', 'source-serif-4/600'), css)}<body>
<header class="letterhead"><div class="firm">${esc(o.name)}</div><div class="strap">${esc(o.strap)}</div>
<div class="contact">${esc(o.address.join(', '))}<br>${esc(o.phone)} &nbsp; ${esc(o.email)}</div></header><div class="rule"></div>
<section class="top"><div class="to"><h1>${esc(doc.title)}</h1><div class="label">To</div><div class="name">${esc(c.name)}</div><div>${esc(c.attention)}<br>${lines(c.address)}</div></div>
<dl><dt>Invoice number</dt><dd>${esc(doc.number)}</dd><dt>Invoice date</dt><dd>${date(doc, doc.issued)}</dd><dt>Tax point</dt><dd>${date(doc, doc.supply)}</dd><dt>Payment due</dt><dd>${date(doc, doc.due)}</dd><dt>Your reference</dt><dd>${esc(doc.reference)}</dd></dl></section>
<table class="lines"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">VAT</th><th class="num">Net</th></tr></thead><tbody>
${t.lines.map((l) => { const q = qtyCell(doc, l, m); return `<tr><td><div class="desc">${esc(l.title)}</div>${l.detail ? `<div class="detail">${esc(l.detail)}</div>` : ''}</td><td class="num">${qty(l.qty)}${l.unit ? ` <span class="unit">${esc(l.unit)}</span>` : ''}</td><td class="num">${q.u}</td><td class="num">${vatCol(l)}</td><td class="num">${m.num(l.amountMinor)}</td></tr>`; }).join('')}
</tbody></table>
<section class="after keep"><div><table class="vat"><thead><tr><th>VAT rate</th><th class="num">Net</th><th class="num">VAT</th></tr></thead><tbody>
${t.taxes.map((x) => `<tr><td>${x.rateBp == null ? esc(x.name) : `Standard ${rate(x.rateBp)}`}</td><td class="num">${m.num(x.baseMinor)}</td><td class="num">${m.num(x.taxMinor)}</td></tr>`).join('')}</tbody></table></div>
<div class="sum"><div><span>Net total</span><span class="num">${m.fmt(t.subtotal)}</span></div><div><span>VAT</span><span class="num">${m.fmt(t.taxTotal)}</span></div><div class="grand"><span>Total due</span><span class="num">${m.fmt(t.total)}</span></div></div></section>
<section class="pay keep"><div><h2>How to pay</h2>${esc(doc.payment.method)} to ${esc(doc.payment.accountName)}<br>Sort code ${esc(doc.payment.sortCode)}, account ${esc(doc.payment.account)}<br>Please quote ${esc(doc.number)} as the reference.</div><div><h2>Terms</h2>${esc(doc.terms)}</div></section>
</body></html>`;
}

/* 2. Receipt: product and tech companies. */
function receipt(doc) {
  const t = totals(doc), m = money(doc), o = doc.org, c = doc.client;
  const hours = doc.columns === 'hours';
  const css = `
@page { size: A4; margin: 18mm 18mm 20mm; }
body { font-family: 'Inter', sans-serif; color: #3D3D3D; font-size: 8.8pt; line-height: 1.5; }
.mast { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14mm; }
.brand { display: flex; align-items: center; gap: 2.4mm; font-weight: 600; font-size: 12pt; color: #000; letter-spacing: -0.01em; }
.doc { text-align: right; }
.doc .kind { font-size: 12pt; font-weight: 600; color: #000; }
.doc .no { color: #767676; margin-top: 0.6mm; }
.due { font-size: 25pt; line-height: 1.12; letter-spacing: -0.022em; color: #000; font-weight: 600; margin: 0 0 3mm; }
.due span { color: #767676; font-weight: 500; }
.paylink { display: inline-block; color: ${doc.brand}; font-weight: 500; text-decoration: none; border-bottom: 0.8pt solid ${doc.brand}; }
.parties { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8mm; margin: 12mm 0 10mm; padding-top: 6mm; border-top: 0.5pt solid #E3E3E3; }
.parties .h { color: #767676; margin-bottom: 1.2mm; }
.parties .n { color: #000; font-weight: 500; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 0.8mm 4mm; margin: 0; }
dt { color: #767676; } dd { margin: 0; color: #000; }
table.lines th { font-weight: 500; color: #767676; text-align: left; padding: 0 0 2.4mm; border-bottom: 0.5pt solid #E3E3E3; }
table.lines th.num { text-align: right; }
table.lines td { padding: 2.8mm 0; border-bottom: 0.5pt solid #EFEFEF; vertical-align: top; color: #000; }
table.lines td + td, table.lines th + th { padding-left: 6mm; }
.when { color: #767676; white-space: nowrap; }
.detail { color: #767676; margin-top: 0.4mm; }
.unit { color: #767676; }
.sum { width: 78mm; margin: 6mm 0 0 auto; }
.sum div { display: flex; justify-content: space-between; padding: 1.3mm 0; color: #000; }
.sum .sub span:first-child { color: #767676; }
.sum .total { border-top: 0.5pt solid #E3E3E3; margin-top: 1mm; padding-top: 2.4mm; }
.sum .amountdue { font-weight: 600; font-size: 10.5pt; }
.other { margin-top: 14mm; padding-top: 6mm; border-top: 0.5pt solid #E3E3E3; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
.other .h { color: #000; font-weight: 500; margin-bottom: 1.2mm; }
.legal { margin-top: 10mm; color: #9A9A9A; font-size: 7.6pt; }
`;
  const mark = `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="4.5" fill="${doc.brand}"/><path d="M5 13V5l8 8V5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const head4 = hours ? `<th>Date</th><th>Description</th><th class="num">Hours</th><th class="num">Rate</th><th class="num">Amount</th>` : `<th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th>`;
  const row = (l) => hours
    ? `<tr><td class="when">${date(doc, l.date, 'short')}</td><td>${esc(l.title)}${l.detail ? `<div class="detail">${esc(l.detail)}</div>` : ''}</td><td class="num">${qty(l.qty)}</td><td class="num">${m.fmt(l.unitMinor)}</td><td class="num">${m.fmt(l.amountMinor)}</td></tr>`
    : `<tr><td>${esc(l.title)}${l.detail ? `<div class="detail">${esc(l.detail)}</div>` : ''}</td><td class="num">${qty(l.qty)}</td><td class="num">${m.fmt(l.unitMinor)}</td><td class="num">${m.fmt(l.amountMinor)}</td></tr>`;
  return `${head(doc.number, fonts('inter/400', 'inter/500', 'inter/600'), css)}<body>
<header class="mast"><div class="brand">${mark}${esc(o.name)}</div><div class="doc"><div class="kind">Invoice</div><div class="no">${esc(doc.number)}</div></div></header>
<p class="due">${m.fmt(t.due)} <span>due ${date(doc, doc.due)}</span></p>
<a class="paylink" href="#">Pay online at ${esc(doc.payLink)}</a>
<section class="parties"><div><div class="h">From</div><div class="n">${esc(o.legalName)}</div>${lines(o.address)}<br>${esc(o.email)}</div>
<div><div class="h">Bill to</div><div class="n">${esc(c.name)}</div>${esc(c.attention)}<br>${lines(c.address)}</div>
<dl><dt>Issued</dt><dd>${date(doc, doc.issued)}</dd><dt>Supply date</dt><dd>${date(doc, doc.supply)}</dd><dt>Due</dt><dd>${date(doc, doc.due)}</dd><dt>VAT number</dt><dd>${esc(o.vatNo)}</dd></dl></section>
<table class="lines"><thead><tr>${head4}</tr></thead><tbody>${t.lines.map(row).join('')}</tbody></table>
<section class="sum keep"><div class="sub"><span>Subtotal</span><span class="num">${m.fmt(t.subtotal)}</span></div>
${t.taxes.map((x) => `<div class="sub"><span>${esc(x.name)} ${rate(x.rateBp)}</span><span class="num">${m.fmt(x.taxMinor)}</span></div>`).join('')}
<div class="total"><span>Total</span><span class="num">${m.fmt(t.total)}</span></div><div class="amountdue"><span>Amount due</span><span class="num">${m.fmt(t.due)}</span></div></section>
<section class="other keep"><div><div class="h">Pay by bank transfer</div>${esc(doc.payment.accountName)}<br>Sort code ${esc(doc.payment.sortCode)}, account ${esc(doc.payment.account)}<br>Reference ${esc(doc.number)}</div>
<div><div class="h">Questions about this invoice</div>${esc(o.email)}</div></section>
<p class="legal">${esc(o.legalName)}, registered in England and Wales, company number ${esc(o.companyNo)}. VAT number ${esc(o.vatNo)}.</p>
</body></html>`;
}

/* 3. Studio: creative agencies. */
function studio(doc) {
  const t = totals(doc), m = money(doc), o = doc.org, c = doc.client;
  const css = `
@page { size: A4; margin: 0; }
body { font-family: 'Instrument Sans', sans-serif; color: #1C1B19; font-size: 9.2pt; line-height: 1.5; }
.band { background: ${doc.brand}; padding: 15mm 18mm 9mm; }
.word { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 46pt; line-height: 0.92; letter-spacing: -0.035em; margin: 0; }
.bandrow { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16mm; font-size: 9.6pt; }
.bandrow b { font-weight: 600; }
main { padding: 11mm 18mm 0; }
.project { display: grid; grid-template-columns: 52mm 1fr; gap: 8mm; margin-bottom: 9mm; }
.project h2 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 600; font-size: 15pt; line-height: 1.15; letter-spacing: -0.015em; margin: 0; }
.project p { color: #4A4843; max-width: 105mm; }
.ph { display: grid; grid-template-columns: 9mm 1fr auto; gap: 4mm; padding: 3.4mm 0; border-top: 0.6pt solid #1C1B19; }
.ph:last-of-type { border-bottom: 0.6pt solid #1C1B19; }
.ph .n { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 600; font-size: 10pt; }
.ph .t { font-weight: 600; font-size: 10pt; }
.ph .d { color: #5A5751; }
.ph .a { font-size: 10pt; }
.close { display: grid; grid-template-columns: 1fr 86mm; gap: 10mm; margin-top: 9mm; }
.mini div { display: flex; justify-content: space-between; padding: 1.2mm 0; color: #4A4843; }
.balance { margin-top: 3mm; }
.balance .lbl { font-size: 9.6pt; }
.balance .big { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 38pt; letter-spacing: -0.03em; line-height: 1; margin: 1.5mm 0 1.5mm; text-align: left; }
.balance .by { color: #4A4843; }
.pay { color: #4A4843; }
.pay b { color: #1C1B19; font-weight: 600; display: block; margin-bottom: 1mm; }
footer { position: absolute; left: 18mm; right: 18mm; bottom: 12mm; display: flex; justify-content: space-between; color: #6E6A62; font-size: 8pt; }
`;
  return `${head(doc.number, fonts('bricolage-grotesque/600', 'bricolage-grotesque/700', 'instrument-sans/400', 'instrument-sans/600'), css)}<body>
<header class="band"><p class="word">${esc(o.name)}</p><div class="bandrow"><div><b>Invoice ${esc(doc.number)}</b><br>Issued ${date(doc, doc.issued)}</div><div style="text-align:right">For <b>${esc(c.name)}</b><br>${esc(c.attention)}</div></div></header>
<main><section class="project"><h2>${esc(doc.project)}</h2><p>${esc(doc.summary)}</p></section>
${t.lines.map((l, i) => `<div class="ph"><div class="n">${i + 1}</div><div><div class="t">${esc(l.title)}</div><div class="d">${esc(l.detail)}</div></div><div class="a num">${m.fmt(l.amountMinor)}</div></div>`).join('')}
<section class="close keep"><div class="pay"><b>Pay by bank transfer</b>${esc(doc.payment.accountName)}<br>Sort code ${esc(doc.payment.sortCode)}, account ${esc(doc.payment.account)}<br>Reference ${esc(doc.number)}<br><br>${esc(doc.note)} Work completed ${date(doc, doc.supply)}.</div>
<div><div class="mini"><div><span>Project total</span><span class="num">${m.fmt(t.total)}</span></div>${(doc.payments || []).map((p) => `<div><span>${esc(p.label)}</span><span class="num">−${m.fmt(p.amountMinor)}</span></div>`).join('')}</div>
<div class="balance"><div class="lbl">Balance due</div><div class="big num">${m.fmt(t.due)}</div><div class="by">by ${date(doc, doc.due)}</div></div></div></section></main>
<footer><span>${esc(o.legalName)}, ${esc(o.address.join(', '))}</span><span>${esc(o.email)}</span></footer>
</body></html>`;
}

/* 4. Folio: personal services. */
function folio(doc) {
  const t = totals(doc), m = money(doc), o = doc.org, c = doc.client;
  const css = `
@page { size: A4; margin: 20mm 22mm 20mm; }
body { font-family: 'Fraunces', serif; color: ${doc.brand}; font-size: 9.8pt; line-height: 1.55; font-variation-settings: 'SOFT' 50; }
.top { display: flex; justify-content: space-between; align-items: baseline; }
.who { font-size: 21pt; font-weight: 500; letter-spacing: -0.01em; line-height: 1.1; }
.strap { font-style: italic; color: #6B6280; margin-top: 1mm; }
.inv { text-align: right; color: #6B6280; }
.inv b { color: ${doc.brand}; font-weight: 600; }
.meta { display: grid; grid-template-columns: 1fr auto; gap: 10mm; margin: 16mm 0 11mm; }
.lbl { color: #6B6280; font-style: italic; }
.client { font-size: 11.5pt; font-weight: 500; }
dl { display: grid; grid-template-columns: auto auto; gap: 1mm 7mm; margin: 0; }
dt { color: #6B6280; font-style: italic; } dd { margin: 0; text-align: right; }
table.lines th { font-weight: 400; font-style: italic; color: #6B6280; text-align: left; padding-bottom: 2mm; border-bottom: 0.6pt solid #D9D2E6; }
table.lines th.num { text-align: right; }
table.lines td { padding: 3.6mm 0; border-bottom: 0.6pt solid #E7E2EF; vertical-align: top; }
table.lines td + td, table.lines th + th { padding-left: 6mm; }
.t { font-weight: 500; } .d { color: #6B6280; font-size: 9pt; }
.sum { width: 82mm; margin: 5mm 0 0 auto; }
.sum div { display: flex; justify-content: space-between; padding: 1.2mm 0; }
.sum .disc span:last-child { color: #8A3D6B; }
.panel { margin-top: 7mm; background: #E6DFF3; border-radius: 3mm; padding: 6mm 7mm; display: flex; justify-content: space-between; align-items: center; }
.panel .l { font-size: 10.5pt; }
.panel .l span { display: block; color: #5C5275; font-size: 9pt; font-style: italic; }
.panel .v { font-size: 26pt; font-weight: 500; letter-spacing: -0.015em; }
.foot { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 12mm; }
.note { font-style: italic; font-size: 11pt; line-height: 1.45; }
.pay .lbl { margin-bottom: 1mm; }
`;
  const sub = `<div><span>Subtotal</span><span class="num">${m.fmt(t.subtotal)}</span></div>`;
  const disc = doc.discount ? `<div class="disc"><span>${esc(doc.discount.label)}</span><span class="num">−${m.fmt(doc.discount.amountMinor)}</span></div>` : '';
  return `${head(doc.number, fonts('fraunces/400', 'fraunces/400-italic', 'fraunces/500', 'fraunces/600'), css)}<body>
<header class="top"><div><div class="who">${esc(o.name)}</div><div class="strap">${esc(o.strap)}</div></div><div class="inv">Invoice <b>${esc(doc.number)}</b></div></header>
<section class="meta"><div><div class="lbl">For</div><div class="client">${esc(c.name)}</div>${lines(c.address)}<br>${esc(c.email)}</div>
<dl><dt>Issued</dt><dd>${date(doc, doc.issued)}</dd><dt>Sessions ended</dt><dd>${date(doc, doc.supply)}</dd><dt>Due</dt><dd>${date(doc, doc.due)}</dd></dl></section>
<table class="lines"><thead><tr><th>Service</th><th class="num">Hours</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>
${t.lines.map((l) => `<tr><td><div class="t">${esc(l.title)}</div><div class="d">${esc(l.detail)}</div></td><td class="num">${l.amountOnly ? '' : qty(l.qty)}</td><td class="num">${l.amountOnly ? '' : m.fmt(l.unitMinor)}</td><td class="num">${m.fmt(l.amountMinor)}</td></tr>`).join('')}
</tbody></table>
<section class="sum keep">${sub}${disc}</section>
<section class="panel keep"><div class="l">Total due<span>by ${date(doc, doc.due)}</span></div><div class="v num">${m.fmt(t.due)}</div></section>
<section class="foot keep"><p class="note">${esc(doc.note)}</p><div class="pay"><div class="lbl">Paying</div>${esc(doc.payment.method)} to ${esc(doc.payment.accountName)}<br>Sort code ${esc(doc.payment.sortCode)}, account ${esc(doc.payment.account)}<br>Reference ${esc(doc.number)}<br>${esc(o.email)}, ${esc(o.phone)}</div></section>
</body></html>`;
}

/* 5. Source: developers and technical freelancers. */
function source(doc) {
  const t = totals(doc), m = money(doc), o = doc.org, c = doc.client;
  const css = `
@page { size: A4; margin: 0; }
body { font-family: 'IBM Plex Sans', sans-serif; color: #1D2330; font-size: 8.9pt; line-height: 1.5; }
.wrap { display: grid; grid-template-columns: 62mm 1fr; min-height: 297mm; }
aside { background: #F1F3F6; padding: 16mm 8mm 14mm 14mm; border-right: 1.2pt solid ${doc.brand}; }
.org { font-weight: 600; font-size: 12.5pt; letter-spacing: -0.01em; }
.who { color: #5A6372; margin-bottom: 12mm; }
.spec { margin: 0 0 7mm; }
.spec .k { color: #5A6372; font-size: 8pt; }
.spec .v { font-family: 'IBM Plex Mono', monospace; font-size: 8.8pt; }
.spec .v.text { font-family: 'IBM Plex Sans', sans-serif; }
main { padding: 16mm 16mm 14mm 11mm; }
h1 { font-size: 20pt; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 1mm; }
.sub { color: #5A6372; margin-bottom: 10mm; }
table.lines th { font-weight: 500; color: #5A6372; font-size: 8pt; text-align: left; padding-bottom: 2mm; border-bottom: 0.6pt solid #C5CBD5; }
table.lines th.num { text-align: right; }
table.lines td { padding: 3mm 0; border-bottom: 0.5pt solid #E2E6EC; vertical-align: top; }
table.lines td + td, table.lines th + th { padding-left: 4mm; }
.t { font-weight: 500; } .d { color: #5A6372; font-size: 8.4pt; }
.mono { font-family: 'IBM Plex Mono', monospace; }
.sum { margin: 6mm 0 0 auto; width: 70mm; }
.sum div { display: flex; justify-content: space-between; padding: 1.2mm 0; }
.sum .due { margin-top: 2mm; padding: 3mm 0 0; border-top: 1.2pt solid ${doc.brand}; font-weight: 600; font-size: 11pt; }
.sum .due .mono { color: ${doc.brand}; font-size: 14pt; }
.note { margin-top: 10mm; color: #5A6372; }
`;
  return `${head(doc.number, fonts('ibm-plex-sans/400', 'ibm-plex-sans/500', 'ibm-plex-sans/600', 'ibm-plex-mono/400', 'ibm-plex-mono/500'), css)}<body><div class="wrap">
<aside><div class="org">${esc(o.name)}</div><div class="who">${esc(o.person)}<br>${esc(o.strap)}</div>
<div class="spec"><div class="k">Invoice</div><div class="v">${esc(doc.number)}</div></div>
<div class="spec"><div class="k">Issued</div><div class="v">${doc.issued}</div></div>
<div class="spec"><div class="k">Work period</div><div class="v">${doc.periodFrom} to<br>${doc.periodTo}</div></div>
<div class="spec"><div class="k">Due</div><div class="v">${doc.due}</div></div>
<div class="spec"><div class="k">Purchase order</div><div class="v">${esc(doc.reference)}</div></div>
<div class="spec"><div class="k">Bill to</div><div class="v text">${esc(c.name)}<br>${esc(c.attention)}<br>${lines(c.address)}</div></div>
<div class="spec"><div class="k">Pay to</div><div class="v text">${esc(doc.payment.accountName)}<br>Sort code <span class="mono">${esc(doc.payment.sortCode)}</span><br>Account <span class="mono">${esc(doc.payment.account)}</span></div></div>
<div class="spec"><div class="k">Contact</div><div class="v text">${esc(o.email)}<br>${esc(o.web)}</div></div></aside>
<main><h1>Invoice</h1><div class="sub">Engineering work for ${esc(c.name)}, ${date(doc, doc.periodFrom, 'short')} to ${date(doc, doc.periodTo, 'short')}</div>
<table class="lines"><thead><tr><th>Work</th><th class="num">Hours</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>
${t.lines.map((l) => `<tr><td><div class="t">${esc(l.title)}</div><div class="d">${esc(l.detail)}</div></td><td class="num mono">${l.amountOnly ? '' : qty(l.qty)}</td><td class="num mono">${l.amountOnly ? '' : m.num(l.unitMinor)}</td><td class="num mono">${m.num(l.amountMinor)}</td></tr>`).join('')}
</tbody></table>
<section class="sum keep"><div><span>Hours</span><span class="mono">${qty(t.lines.filter((l) => !l.amountOnly).reduce((s, l) => s + l.qty, 0))}</span></div>
<div class="due"><span>Due ${date(doc, doc.due, 'short')}</span><span class="mono">${m.fmt(t.due)}</span></div></section>
<p class="note">${esc(doc.note)}</p></main></div></body></html>`;
}

/* 6. Plain: any business, anywhere. */
function plain(doc) {
  const t = totals(doc), m = money(doc), o = doc.org, c = doc.client;
  const css = `
@page { size: A4; margin: 18mm 18mm 20mm; }
body { font-family: 'Public Sans', sans-serif; color: #1A1A1A; font-size: 9pt; line-height: 1.5; }
.top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12mm; }
.logo { display: flex; gap: 3mm; align-items: flex-start; }
.sq { width: 11mm; height: 11mm; background: ${doc.brand}; color: #fff; font-weight: 700; font-size: 9pt; display: flex; align-items: center; justify-content: center; letter-spacing: 0.02em; }
.org { font-weight: 700; font-size: 12pt; }
.small { color: #555; }
h1 { font-size: 20pt; font-weight: 700; margin: 0; text-align: right; }
.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6mm; margin-bottom: 9mm; }
.h { color: #555; margin-bottom: 1mm; }
.b { font-weight: 600; }
table.lines th { font-weight: 600; text-align: left; padding: 2mm 2mm; background: #F2F2F2; }
table.lines th.num { text-align: right; }
table.lines td { padding: 2.6mm 2mm; border-bottom: 0.5pt solid #DDDDDD; vertical-align: top; }
.unit { color: #555; }
.sum { width: 84mm; margin: 5mm 0 0 auto; }
.sum div { display: flex; justify-content: space-between; padding: 1.3mm 2mm; }
.sum .grand { background: #1A1A1A; color: #fff; font-weight: 700; font-size: 11pt; padding: 2.6mm 2mm; margin-top: 1.5mm; }
.sample { color: #8A5A00; font-size: 7.6pt; text-align: right; margin-top: 1mm; }
.bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-top: 11mm; padding-top: 5mm; border-top: 0.5pt solid #DDDDDD; }
`;
  return `${head(doc.number, fonts('public-sans/400', 'public-sans/600', 'public-sans/700'), css)}<body>
<header class="top"><div class="logo"><div class="sq">ABS</div><div><div class="org">${esc(o.name)}</div><div class="small">${lines(o.address)}<br>${esc(o.phone)}, ${esc(o.email)}<br>TIN ${esc(o.tin)}</div></div></div><div><h1>${esc(doc.title)}</h1><div class="small" style="text-align:right">${esc(doc.number)}</div></div></header>
<section class="grid"><div><div class="h">Bill to</div><div class="b">${esc(c.name)}</div>${esc(c.attention)}<br>${lines(c.address)}<br>TIN ${esc(c.tin)}</div>
<div><div class="h">Invoice date</div>${date(doc, doc.issued)}<div class="h" style="margin-top:2.4mm">Date of supply</div>${date(doc, doc.supply)}</div>
<div><div class="h">Payment due</div><span class="b">${date(doc, doc.due)}</span><div class="h" style="margin-top:2.4mm">Currency</div>Ghana cedi (GHS)</div></section>
<table class="lines"><thead><tr><th>Item</th><th class="num">Quantity</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>
${t.lines.map((l) => `<tr><td>${esc(l.title)}</td><td class="num">${qty(l.qty)}${l.unit ? ` <span class="unit">${esc(l.unit)}</span>` : ''}</td><td class="num">${m.num(l.unitMinor)}</td><td class="num">${m.num(l.amountMinor)}</td></tr>`).join('')}
</tbody></table>
<section class="sum keep"><div><span>Subtotal</span><span class="num">${m.fmt(t.subtotal)}</span></div>
${t.taxes.map((x) => `<div><span>${esc(x.name)} ${rate(x.rateBp)}</span><span class="num">${m.fmt(x.taxMinor)}</span></div>`).join('')}
<div class="grand"><span>Total due</span><span class="num">${m.fmt(t.total)}</span></div><div class="sample">${esc(doc.sampleTaxNote)}</div></section>
<section class="bottom keep"><div><div class="h">How to pay</div>${esc(doc.payment.momo)}<br>${esc(doc.payment.bank)}<br>Reference ${esc(doc.number)}</div><div><div class="h">Terms</div>${esc(doc.terms)}</div></section>
</body></html>`;
}

// Page footers printed on every page by the PDF engine.
const footers = {
  counsel: (doc) => `<div style="width:100%;box-sizing:border-box;padding:0 20mm;font-family:'Liberation Serif','Times New Roman',serif;font-size:7.2pt;color:#6A7381;text-align:center;-webkit-print-color-adjust:exact"><div style="border-top:0.4pt solid #C9CED6;padding-top:2.5mm">${esc(doc.org.legalName)}, registered in England and Wales, company number ${esc(doc.org.companyNo)}. VAT registration number ${esc(doc.org.vatNo)}.<br>${esc(doc.number)}, page <span class="pageNumber"></span> of <span class="totalPages"></span></div></div>`,
};

module.exports = { counsel, receipt, studio, folio, source, plain, footers };
