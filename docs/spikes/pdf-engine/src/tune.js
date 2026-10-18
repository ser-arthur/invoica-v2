// Finds line counts for the tuned documents and writes them to src/tuned.json:
//   boundaryChromium: with keep-together switched off, Chromium (native margin boxes) splits the totals block across a page break;
//   boundaryReactPdf: the same, measured in react-pdf;
//   threePage: Chromium prints exactly three pages, with the count in the middle of the three-page range.
// Usage: node src/tune.js
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const server = require('./server');
const { makeEngines } = require('./engines');
const { makeBoundaryChromium, makeBoundaryReactPdf, makeThreePage } = require('./data');

const compact = (s) => s.replace(/\s+/gu, '');

// Returns the compacted text of each page, using pdftotext in raw order.
function pageTexts(buf) {
  const tmp = path.join(__dirname, '..', 'work', `tune-${process.pid}.pdf`);
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, buf);
  const text = execFileSync('pdftotext', ['-raw', tmp, '-']).toString();
  fs.unlinkSync(tmp);
  return text.split('\f').slice(0, -1).map(compact);
}

const pageOf = (pages, needle) => pages.findIndex((p) => p.includes(compact(needle)));
const middle = (arr) => arr[Math.floor((arr.length - 1) / 2)];

async function straddleCounts(engine, make, from, to) {
  const hits = [];
  for (let n = from; n <= to; n += 1) {
    const doc = make(n);
    const pages = pageTexts(await engine.render(doc, engine.prepare(doc, { keepOff: true })));
    const a = pageOf(pages, 'Subtotal'), b = pageOf(pages, 'Amount due');
    if (a >= 0 && b > a) hits.push(n);
  }
  return hits;
}

(async () => {
  const srv = await server.start();
  const { engines, close } = await makeEngines(srv, ['c6-chromium-margin-boxes', 'c3-react-pdf']);
  const chrome = engines['c6-chromium-margin-boxes'];
  const rpdf = engines['c3-react-pdf'];

  const bc = await straddleCounts(chrome, makeBoundaryChromium, 10, 60);
  const br = await straddleCounts(rpdf, makeBoundaryReactPdf, 10, 60);
  const three = [];
  for (let n = 15; n <= 90; n += 1) {
    const doc = makeThreePage(n);
    if (pageTexts(await chrome.render(doc, chrome.prepare(doc))).length === 3) three.push(n);
  }
  await close(); await srv.close();

  const tuned = { boundaryChromium: middle(bc), boundaryReactPdf: middle(br), threePage: middle(three),
    evidence: { boundaryChromiumStraddles: bc, boundaryReactPdfStraddles: br, threePageCounts: three } };
  fs.writeFileSync(path.join(__dirname, 'tuned.json'), JSON.stringify(tuned, null, 1) + '\n');
  console.log(JSON.stringify(tuned));
})().catch((e) => { console.error(e); process.exit(1); });
