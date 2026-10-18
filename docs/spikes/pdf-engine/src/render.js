// Renders every hard-pack document through every candidate: one warm-up render, then three timed renders.
// Writes out/<candidate>/<doc>.pdf (from the last timed run), out/timings.json, out/expect.json for the checker,
// and keep-together-off probes of the boundary documents to out/probe/<candidate>/.
// Usage: node src/render.js [candidate-id ...]   (no ids: all candidates)
'use strict';
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const server = require('./server');
const { CANDIDATES, makeEngines } = require('./engines');
const { docs, TOKEN } = require('./data');
const { totals, money, date, qty } = require('./core');
const { footerText } = require('./receipt-html');

const OUT = path.join(__dirname, '..', 'out');
const RUNS = 3;
const PROBE_DOCS = ['d7a-boundary-chromium', 'd7b-boundary-reactpdf'];

// Text the checker looks for, built with the same formatting code the templates use.
function expectFor(doc) {
  const t = totals(doc), m = money(doc);
  const hours = doc.columns === 'hours';
  return {
    id: doc.id, number: doc.number, legalName: doc.org.legalName, footer: footerText(doc), currency: doc.currency,
    headings: hours ? ['Date', 'Description', 'Hours', 'Rate', 'Amount'] : ['Description', 'Qty', 'Unit', 'price', 'Amount'],
    lines: t.lines.map((l) => ({
      start: l.title,
      end: (l.detail || l.title).slice(-40),
      row: [hours ? date(doc, l.date, 'short') : '', l.title, l.detail || '', qty(l.qty), m.fmt(l.unitMinor), m.fmt(l.amountMinor)].join(''),
    })),
    totals: { first: 'Subtotal', last: 'Amount due', due: m.fmt(t.due) },
    token: doc.lines.some((l) => (l.detail || '').includes(TOKEN)) ? TOKEN : null,
  };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

(async () => {
  const ids = process.argv.slice(2);
  const unknown = ids.filter((id) => !CANDIDATES.some((c) => c.id === id));
  if (unknown.length) throw new Error(`unknown candidate ${unknown.join(', ')}`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'expect.json'), JSON.stringify(Object.fromEntries(docs.map((d) => [d.id, expectFor(d)])), null, 1));

  const timingsPath = path.join(OUT, 'timings.json');
  const timings = fs.existsSync(timingsPath) ? JSON.parse(fs.readFileSync(timingsPath, 'utf8')) : {};
  const srv = await server.start();
  const { engines, close, failures } = await makeEngines(srv, ids.length ? ids : null);
  const errors = [];
  for (const [id, engine] of Object.entries(engines)) {
    const dir = path.join(OUT, id);
    fs.mkdirSync(dir, { recursive: true });
    timings[id] = { label: engine.cand.label, docs: {} };
    for (const doc of docs) {
      try {
        const input = engine.prepare(doc, {});
        await engine.render(doc, input);
        const runs = [];
        let buf;
        for (let i = 0; i < RUNS; i += 1) {
          const t0 = performance.now();
          buf = await engine.render(doc, input);
          runs.push(Math.round(performance.now() - t0));
        }
        fs.writeFileSync(path.join(dir, `${doc.id}.pdf`), buf);
        timings[id].docs[doc.id] = { runsMs: runs, medianMs: median(runs), bytes: buf.length };
        if (PROBE_DOCS.includes(doc.id)) {
          const probeDir = path.join(OUT, 'probe', id);
          fs.mkdirSync(probeDir, { recursive: true });
          const probeBuf = await engine.render(doc, engine.prepare(doc, { keepOff: true }));
          fs.writeFileSync(path.join(probeDir, `${doc.id}-keepoff.pdf`), probeBuf);
        }
        console.log(id, doc.id, runs.join('/'), 'ms', buf.length, 'bytes');
      } catch (e) {
        errors.push(`${id} ${doc.id}: ${e.message}`);
        console.log('ERROR', id, doc.id, e.message);
      }
    }
  }
  await close(); await srv.close();
  fs.writeFileSync(timingsPath, JSON.stringify(timings, null, 1));
  const logPath = path.join(OUT, 'run-log.json');
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : {};
  for (const id of Object.keys(engines)) {
    log[id] = { errors: errors.filter((e) => e.startsWith(`${id} `)), resourceFailures: failures.filter((f) => f.startsWith(`${id}:`)) };
  }
  log.environment = { node: process.version, chromium: '141.0.7390.37 (Playwright build 1194)', when: new Date().toISOString() };
  fs.writeFileSync(logPath, JSON.stringify(log, null, 1));
  console.log('errors', errors.length, 'resource failures', failures.length);
})().catch((e) => { console.error(e); process.exit(1); });
