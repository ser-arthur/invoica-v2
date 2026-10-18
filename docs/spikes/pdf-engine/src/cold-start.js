// Measures cold start for the recommended path: launch Chromium, open a page, render d1-one-line with native
// margin boxes, close. Three runs; prints each and the median. Also times react-pdf's first render in a fresh process.
// Usage: node src/cold-start.js
'use strict';
const path = require('path');
const { performance } = require('perf_hooks');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const server = require('./server');
const { docs } = require('./data');
const { receipt } = require('./receipt-html');

const ROOT = path.join(__dirname, '..');
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

(async () => {
  const srv = await server.start();
  const doc = docs[0];
  const htmlFile = path.join(ROOT, 'out/html/css', `${doc.id}.html`);
  require('fs').writeFileSync(htmlFile, receipt(doc, { footer: 'css', htmlDir: path.dirname(htmlFile) }));
  const chromiumRuns = [];
  for (let i = 0; i < 3; i += 1) {
    const t0 = performance.now();
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', env: { ...process.env, FONTCONFIG_FILE: path.join(ROOT, 'fontconfig/no-system-inter.conf') } });
    const page = await browser.newPage();
    await page.goto(srv.urlFor(htmlFile), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ printBackground: true, preferCSSPageSize: true });
    await browser.close();
    chromiumRuns.push(Math.round(performance.now() - t0));
  }
  await srv.close();
  // A fresh Node process per run, so module loading and font parsing are included.
  const script = "const t0=performance.now();const {render}=require('./src/receipt-react');const {docs}=require('./src/data');render(docs[0]).then(()=>console.log(Math.round(performance.now()-t0)))";
  const rpdfRuns = [0, 1, 2].map(() => Number(execFileSync(process.execPath, ['-e', script], { cwd: ROOT }).toString().trim()));
  console.log(JSON.stringify({ chromiumLaunchToPdfMs: chromiumRuns, chromiumMedianMs: median(chromiumRuns), reactPdfFreshProcessMs: rpdfRuns, reactPdfMedianMs: median(rpdfRuns) }));
})().catch((e) => { console.error(e); process.exit(1); });
