// Renders each template mock to HTML and A4 PDF with Chromium, then to PNG pages for review.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const data = require('./data');
const T = require('./templates');
const { totals } = require('./core');

const OUT = process.argv[2] || path.join(__dirname, 'out');
const jobs = [
  ['counsel', data.counsel], ['receipt', data.receipt], ['studio', data.studio],
  ['folio', data.folio], ['source', data.source], ['plain', data.plain], ['receipt-long', data.receiptLong],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  const report = [];
  for (const [name, doc] of jobs) {
    const html = T[doc.template](doc);
    const htmlPath = path.join(OUT, `${name}.html`);
    fs.writeFileSync(htmlPath, html);
    await page.goto('file://' + htmlPath, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const multi = name === 'receipt-long';
    const footer = T.footers[doc.template] ? T.footers[doc.template](doc) : null;
    const pdfPath = path.join(OUT, `${name}.pdf`);
    await page.pdf({
      path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: multi || !!footer,
      headerTemplate: '<span></span>',
      footerTemplate: footer ? footer : multi ? `<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;color:#8a8a8a;padding:0 18mm;display:flex;justify-content:space-between"><span>${doc.number}, ${doc.org.legalName}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>` : '<span></span>',
    });
    const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdfPath]).toString())[1]);
    execFileSync('pdftoppm', ['-png', '-r', '110', pdfPath, path.join(OUT, name)]);
    const fontsUsed = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`));
    const t = totals(doc);
    report.push({ name, pages, total: t.total, due: t.due, fontsLoaded: fontsUsed.length });
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 1));
})();
