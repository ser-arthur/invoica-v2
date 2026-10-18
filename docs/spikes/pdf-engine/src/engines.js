// Every candidate behind one interface: render(doc, { keepOff }) returns the PDF bytes.
// Chromium candidates share one browser per fontconfig file and reuse one page each, so timed runs are warm.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { receipt, footerTemplate } = require('./receipt-html');

const ROOT = path.join(__dirname, '..');
const CHROMIUM = '/opt/pw-browsers/chromium';
const FONTCONFIG = {
  'no-system-inter': path.join(ROOT, 'fontconfig/no-system-inter.conf'),
  'with-inter': path.join(ROOT, 'fontconfig/with-inter.conf'),
};
const VIVLIOSTYLE = path.join(ROOT, 'node_modules/.bin/vivliostyle');

// Header and footer templates shaped like the Chrome print dialog's own (date and title on top, URL and n/N below).
const DIALOG_STYLE = 'font-family:sans-serif;font-size:8px;width:100%;display:flex;justify-content:space-between;padding:0 5mm';
const DIALOG_HEADER = `<div style="${DIALOG_STYLE}"><span class="date"></span><span class="title"></span><span></span></div>`;
const DIALOG_FOOTER = `<div style="${DIALOG_STYLE}"><span class="url"></span><span><span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`;

const CANDIDATES = [
  { id: 'c1-footer-template', kind: 'chromium', fc: 'no-system-inter', variant: 'tpl',
    label: 'Chromium page.pdf with footerTemplate',
    pdf: (doc) => ({ printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footerTemplate(doc) }) },
  { id: 'c1b-footer-template-installed-font', kind: 'chromium', fc: 'with-inter', variant: 'tpl',
    label: 'As c1, with Inter installed as a system font (fontconfig)',
    pdf: (doc) => ({ printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footerTemplate(doc) }) },
  { id: 'c2-pagedjs', kind: 'chromium', fc: 'no-system-inter', variant: 'paged', polyfill: true,
    label: 'Chromium with the Paged.js polyfill, CSS margin boxes',
    pdf: () => ({ printBackground: true, preferCSSPageSize: true }) },
  { id: 'c3-react-pdf', kind: 'react-pdf', label: '@react-pdf/renderer, no browser' },
  { id: 'c4-vivliostyle', kind: 'vivliostyle', fc: 'no-system-inter', variant: 'css',
    label: 'Vivliostyle CLI with the local Chromium, CSS margin boxes' },
  { id: 'c5-browser-print', kind: 'chromium', fc: 'no-system-inter', variant: 'css',
    label: 'User\'s browser print simulated: CSS only, backgrounds off, no browser header/footer',
    pdf: () => ({ printBackground: false, preferCSSPageSize: true, displayHeaderFooter: false }) },
  { id: 'c5b-browser-print-dialog-headers', kind: 'chromium', fc: 'no-system-inter', variant: 'css',
    label: 'As c5, with header/footer templates shaped like the print dialog\'s "Headers and footers"',
    pdf: () => ({ printBackground: false, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: DIALOG_HEADER, footerTemplate: DIALOG_FOOTER }) },
  { id: 'c6-chromium-margin-boxes', kind: 'chromium', fc: 'no-system-inter', variant: 'css',
    label: 'Chromium page.pdf with native CSS @page margin boxes, no polyfill',
    pdf: () => ({ printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false }) },
];

function writeHtml(doc, variant, { keepOff = false } = {}) {
  const dir = path.join(ROOT, keepOff ? 'out/probe/html' : 'out/html', variant);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${doc.id}${keepOff ? '-keepoff' : ''}.html`);
  const html = receipt(doc, { footer: variant === 'tpl' ? 'tpl' : 'css', polyfill: variant === 'paged', keepOff, htmlDir: dir });
  fs.writeFileSync(file, html);
  return file;
}

async function makeEngines(srv, ids) {
  const browsers = {};
  const failures = [];
  const browserFor = async (fc) => {
    if (!browsers[fc]) browsers[fc] = await chromium.launch({ executablePath: CHROMIUM, env: { ...process.env, FONTCONFIG_FILE: FONTCONFIG[fc] } });
    return browsers[fc];
  };
  const engines = {};
  for (const cand of CANDIDATES.filter((c) => !ids || ids.includes(c.id))) {
    if (cand.kind === 'chromium') {
      const browser = await browserFor(cand.fc);
      const page = await browser.newPage();
      page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) failures.push(`${cand.id}: HTTP ${r.status()} ${r.url()}`); });
      page.on('pageerror', (e) => failures.push(`${cand.id}: page error ${e.message}`));
      engines[cand.id] = {
        cand,
        prepare: (doc, opts) => writeHtml(doc, cand.variant, opts),
        // Times from navigation to PDF bytes: load, web fonts ready, Paged.js layout when used, print.
        async render(doc, htmlFile) {
          await page.goto(srv.urlFor(htmlFile), { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          if (cand.polyfill) await page.evaluate(async () => { await window.PagedPolyfill.preview(); await document.fonts.ready; });
          return page.pdf(cand.pdf(doc));
        },
      };
    } else if (cand.kind === 'react-pdf') {
      const { render } = require('./receipt-react');
      engines[cand.id] = { cand, prepare: (doc, opts) => opts || {}, render: (doc, opts) => render(doc, opts) };
    } else if (cand.kind === 'vivliostyle') {
      engines[cand.id] = {
        cand,
        prepare: (doc, opts) => writeHtml(doc, cand.variant, opts),
        // Runs the CLI once per document: it starts its own server and browser each time, so this time is cold.
        render(doc, htmlFile) {
          const outFile = path.join(ROOT, 'work', `vivliostyle-${process.pid}.pdf`);
          fs.mkdirSync(path.dirname(outFile), { recursive: true });
          return new Promise((resolve, reject) => {
            const p = spawn(VIVLIOSTYLE, ['build', srv.urlFor(htmlFile), '-o', outFile, '--executable-browser', CHROMIUM, '-d', '-t', '120'],
              { env: { ...process.env, FONTCONFIG_FILE: FONTCONFIG[cand.fc] }, stdio: ['ignore', 'pipe', 'pipe'] });
            let log = '';
            p.stdout.on('data', (d) => { log += d; });
            p.stderr.on('data', (d) => { log += d; });
            p.on('close', (code) => (code === 0 ? resolve(fs.readFileSync(outFile)) : reject(new Error(`vivliostyle exit ${code}: ${log.slice(-500)}`))));
          });
        },
      };
    }
  }
  const close = async () => { for (const b of Object.values(browsers)) await b.close(); };
  return { engines, close, failures };
}

module.exports = { CANDIDATES, makeEngines };
