// The round-1 Receipt template, adapted for the spike. One HTML builder serves every browser-based candidate.
// footer: 'tpl' prints no footer from CSS (the engine adds one); 'css' adds @page margin boxes with page x of y.
// polyfill: true adds the Paged.js polyfill script. keepOff: true lets the totals block split (used by probes only).
'use strict';
const fs = require('fs');
const path = require('path');
const { totals, money, date, qty, rate, esc } = require('./core');

const ROOT = path.join(__dirname, '..');
const FONT_DIR = path.join(ROOT, 'node_modules/@fontsource/inter');
const PAGED = path.join(ROOT, 'node_modules/pagedjs/dist/paged.polyfill.js');

// Reads the @fontsource CSS for each weight and points its url()s at the font files, relative to the HTML file.
function fontFaces(htmlDir) {
  const rel = path.relative(htmlDir, path.join(FONT_DIR, 'files')).split(path.sep).join('/');
  return ['400', '500', '600'].map((w) => fs.readFileSync(path.join(FONT_DIR, `${w}.css`), 'utf8').replace(/url\(\.\/files\//g, `url(${rel}/`)).join('\n');
}

const cssString = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ')}"`;
const lines = (arr) => arr.filter(Boolean).map(esc).join('<br>');

function footerText(doc) {
  return `${doc.number}, ${doc.org.legalName}`;
}

// Chromium headerTemplate/footerTemplate markup for candidate 1. It can only use fonts installed on the system.
// print-color-adjust: exact stops Chromium darkening the light grey text, as it does for printed text by default.
function footerTemplate(doc) {
  return `<div style="width:100%;box-sizing:border-box;padding:0 18mm;font-family:'Inter',sans-serif;font-size:7.5pt;color:#8a8a8a;-webkit-print-color-adjust:exact;print-color-adjust:exact;display:flex;justify-content:space-between;gap:6mm"><span>${esc(footerText(doc))}</span><span style="white-space:nowrap">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
}

const BASE = `
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-kerning: normal; font-variant-numeric: lining-nums; }
.num, .when, dd, .sum { font-variant-numeric: tabular-nums lining-nums; }
table { border-collapse: collapse; width: 100%; }
thead { display: table-header-group; }
tr, .keep { break-inside: avoid; page-break-inside: avoid; }
.num { text-align: right; white-space: nowrap; }
p { margin: 0; }
`;

function pageRule(doc, footer) {
  if (footer !== 'css') return '@page { size: A4; margin: 18mm 18mm 20mm; }';
  const box = "font-family: 'Inter', sans-serif; font-size: 7.5pt; font-weight: 400; color: #8a8a8a; vertical-align: middle;";
  return `@page {
  size: A4; margin: 18mm 18mm 20mm;
  @bottom-left { content: ${cssString(footerText(doc))}; ${box} text-align: left; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); ${box} text-align: right; white-space: nowrap; }
}`;
}

function receipt(doc, opts) {
  const { footer = 'css', polyfill = false, keepOff = false, htmlDir } = opts;
  const t = totals(doc), m = money(doc), o = doc.org, c = doc.client;
  const hours = doc.columns === 'hours';
  const css = `
${pageRule(doc, footer)}
body { font-family: 'Inter', sans-serif; color: #3D3D3D; font-size: 8.8pt; line-height: 1.5; }
.mast { display: flex; justify-content: space-between; align-items: flex-start; gap: 8mm; margin-bottom: 14mm; }
.brand { display: flex; align-items: center; gap: 2.4mm; font-weight: 600; font-size: 12pt; color: #000; letter-spacing: -0.01em; }
.brand svg { flex: none; }
.doc { text-align: right; white-space: nowrap; }
.doc .kind { font-size: 12pt; font-weight: 600; color: #000; }
.doc .no { color: #767676; margin-top: 0.6mm; }
.due { font-size: 25pt; line-height: 1.12; letter-spacing: -0.022em; color: #000; font-weight: 600; margin: 0 0 3mm; }
.due span { color: #767676; font-weight: 500; }
.paylink { display: inline-block; color: ${doc.brand}; font-weight: 500; text-decoration: none; border-bottom: 0.8pt solid ${doc.brand}; overflow-wrap: anywhere; }
.parties { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8mm; margin: 12mm 0 10mm; padding-top: 6mm; border-top: 0.5pt solid #E3E3E3; overflow-wrap: break-word; }
.parties .h { color: #767676; margin-bottom: 1.2mm; }
.parties .n { color: #000; font-weight: 500; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 0.8mm 4mm; margin: 0; }
dt { color: #767676; } dd { margin: 0; color: #000; white-space: nowrap; }
table.lines th { font-weight: 500; color: #767676; text-align: left; padding: 0 0 2.4mm; border-bottom: 0.5pt solid #E3E3E3; }
table.lines th.num { text-align: right; }
table.lines td { padding: 2.8mm 0; border-bottom: 0.5pt solid #EFEFEF; vertical-align: top; color: #000; }
table.lines td + td, table.lines th + th { padding-left: 6mm; }
table.lines td.desc { overflow-wrap: anywhere; }
.when { color: #767676; white-space: nowrap; }
.detail { color: #767676; margin-top: 0.4mm; }
.sum { width: 78mm; margin: 6mm 0 0 auto; }
.sum div { display: flex; justify-content: space-between; padding: 1.3mm 0; color: #000; }
.sum .sub span:first-child { color: #767676; }
.sum .total { border-top: 0.5pt solid #E3E3E3; margin-top: 1mm; padding-top: 2.4mm; }
.sum .amountdue { font-weight: 600; font-size: 10.5pt; }
.other { margin-top: 14mm; padding-top: 6mm; border-top: 0.5pt solid #E3E3E3; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; overflow-wrap: break-word; }
.other .h { color: #000; font-weight: 500; margin-bottom: 1.2mm; }
.legal { margin-top: 10mm; color: #9A9A9A; font-size: 7.6pt; }
${keepOff ? '.keep { break-inside: auto !important; page-break-inside: auto !important; }' : ''}
`;
  const mark = `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="4.5" fill="${doc.brand}"/><path d="M5 13V5l8 8V5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const headRow = hours
    ? '<th>Date</th><th>Description</th><th class="num">Hours</th><th class="num">Rate</th><th class="num">Amount</th>'
    : '<th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th>';
  const descCell = (l) => `<td class="desc">${esc(l.title)}${l.detail ? `<div class="detail">${esc(l.detail)}</div>` : ''}</td>`;
  const row = (l) => hours
    ? `<tr><td class="when">${date(doc, l.date, 'short')}</td>${descCell(l)}<td class="num">${qty(l.qty)}</td><td class="num">${m.fmt(l.unitMinor)}</td><td class="num">${m.fmt(l.amountMinor)}</td></tr>`
    : `<tr>${descCell(l)}<td class="num">${qty(l.qty)}</td><td class="num">${m.fmt(l.unitMinor)}</td><td class="num">${m.fmt(l.amountMinor)}</td></tr>`;
  const pagedRel = path.relative(htmlDir, PAGED).split(path.sep).join('/');
  const scripts = polyfill ? `<script>window.PagedConfig = { auto: false };</script><script src="${pagedRel}"></script>` : '';
  const taxRow = o.taxNo ? `<dt>${esc(o.taxLabel)}</dt><dd>${esc(o.taxNo)}</dd>` : '';
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(doc.number)}</title>
<style>${fontFaces(htmlDir)}</style><style>${BASE}${css}</style>${scripts}</head><body>
<header class="mast"><div class="brand">${mark}<span>${esc(o.name)}</span></div><div class="doc"><div class="kind">Invoice</div><div class="no">${esc(doc.number)}</div></div></header>
<p class="due">${m.fmt(t.due)} <span>due ${date(doc, doc.due)}</span></p>
<a class="paylink" href="#">Pay online at ${esc(doc.payLink)}</a>
<section class="parties"><div><div class="h">From</div><div class="n">${esc(o.legalName)}</div>${lines(o.address)}<br>${esc(o.email)}</div>
<div><div class="h">Bill to</div><div class="n">${esc(c.name)}</div>${esc(c.attention)}<br>${lines(c.address)}</div>
<dl><dt>Issued</dt><dd>${date(doc, doc.issued)}</dd><dt>Supply date</dt><dd>${date(doc, doc.supply)}</dd><dt>Due</dt><dd>${date(doc, doc.due)}</dd>${taxRow}</dl></section>
<table class="lines"><thead><tr>${headRow}</tr></thead><tbody>${t.lines.map(row).join('')}</tbody></table>
<section class="sum keep"><div class="sub"><span>Subtotal</span><span class="num">${m.fmt(t.subtotal)}</span></div>
${t.taxes.map((x) => `<div class="sub"><span>${esc(x.name)} ${rate(x.rateBp)}</span><span class="num">${m.fmt(x.taxMinor)}</span></div>`).join('')}
<div class="total"><span>Total</span><span class="num">${m.fmt(t.total)}</span></div><div class="amountdue"><span>Amount due</span><span class="num">${m.fmt(t.due)}</span></div></section>
<section class="other keep"><div><div class="h">${esc(doc.payment.heading)}</div>${lines(doc.payment.lines)}<br>Reference ${esc(doc.number)}</div>
<div><div class="h">Questions about this invoice</div>${esc(o.email)}</div></section>
<p class="legal">${esc(o.legalName)}, ${esc(o.registration)}</p>
</body></html>`;
}

module.exports = { receipt, footerTemplate, footerText };
