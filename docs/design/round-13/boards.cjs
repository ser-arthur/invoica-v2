const { chromium } = require('/home/claude/invoica/node_modules/.pnpm/node_modules/playwright');
const fs = require('fs');
const path = require('path');
// The round 13 boards: each option's wide-screen render beside its phone render, with a line on what it is.
// node boards.cjs <renders folder> <boards folder> [first | tabs]
const FIRST = [
  {
    key: 'specimens',
    title: 'A. A small working piece over each point',
    what: 'In place of each rule: one invoice in three businesses’ colours, what is owed split into paid, due and late, and three clients with their balances.',
    motion: 'Arriving, the three invoices are dealt out, the bar fills from the left and the clients’ rows come in one by one.',
  },
  {
    key: 'invoice',
    title: 'B. One invoice, and each point drawn to its part of it',
    what: 'The business’s name in the head is its brand, the amount due is its money and “Billed to” is its client. The invoice fades out below its lines.',
    motion: 'Arriving, the lines draw out from each label to the invoice, one after another.',
  },
  {
    key: 'filed',
    title: 'C. Filed: one rule, the labels as tabs on it',
    what: 'The rule runs the whole width once, lime to teal, and each label sits on a tab in its colour, like dividers in a file. On a phone each point has its own rule and the tabs step across: left, middle, right.',
    motion: 'Arriving, the rule draws from left to right and each tab rises as the line reaches it.',
  },
  {
    key: 'sheets',
    title: 'D. Each point on its own sheet',
    what: 'Three sheets with a turned corner in each point’s colour, as on the dashboard and the invoices, laid down a little loose.',
    motion: 'Arriving, they come down loose and square up.',
  },
];
// The second pass, 01:51: C's tabs made properly, and A's pieces filed behind them. Renders by why-tabs.cjs.
const TABS = [
  {
    key: 't-line',
    out: 'tabs-line',
    title: 'C1. The same line, with proper tabs',
    what: 'The tabs have soft shoulders, as a folder’s do, and rise out of the line in its own colour where each one stands. The label is a touch larger. On a phone each point has its own line and the tabs step across.',
    motion: 'Arriving, the line draws from left to right and each tab rises as the line reaches it.',
  },
  {
    key: 't-sheets',
    out: 'tabs-sheets',
    title: 'C2. Each point on its own divider',
    what: 'Each point is a divider in a pale tint of its colour, its tab part of the same sheet, the tabs stepping left, middle and right.',
    motion: 'Arriving, the dividers rise into place one after another.',
  },
  {
    key: 't-file',
    out: 'tabs-file',
    title: 'C3. A file of dividers',
    what: 'The three dividers stand one in front of the other across the full width, their tabs stepping across as in a real file. The heading on the left, the words on the right.',
    motion: 'Arriving, each divider slides up from behind the one before it.',
  },
  {
    key: 't-filed',
    out: 'tabs-filed',
    title: 'C4. The file, with what is filed on each divider (A in C)',
    what: 'As C3, with option A’s piece on each divider: the invoices in three businesses’ colours, what is owed, and the clients with their balances. On a phone each piece sits above its heading.',
    motion: 'Arriving, each divider slides up from behind the one before it, then its piece comes in.',
  },
];
(async () => {
  const [, , renders, outDir, set = 'first'] = process.argv;
  const OPTIONS = set === 'tabs' ? TABS : FIRST;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1560, height: 900 }, deviceScaleFactor: 1.25 });
  for (const o of OPTIONS) {
    const desk = path.resolve(renders, `${o.key}-desk.png`);
    const phone = path.resolve(renders, `${o.key}-phone.png`);
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#d9dfdc;font-family:Inter,sans-serif;color:#09191c}
      .board{padding:36px 40px 44px;display:grid;grid-template-columns:1100px 320px;gap:40px;align-items:start}
      header{grid-column:1/-1;max-width:1100px}
      h1{margin:0 0 8px;font:700 26px/1.2 'Inter Display',Inter,sans-serif;letter-spacing:-.01em}
      p{margin:4px 0 0;font-size:15px;line-height:1.5;color:#3e4f51}
      figure{margin:0}
      figcaption{font-size:12px;color:#56676a;margin-bottom:8px}
      img{display:block;width:100%;border-radius:6px;box-shadow:0 1px 0 rgb(0 0 0/.06),0 12px 30px -18px rgb(19 32 26/.5)}
    </style><div class="board"><header><h1>${o.title}</h1><p>${o.what}</p><p>${o.motion}</p></header>
      <figure><figcaption>Wide screen, 1440 pixels</figcaption><img src="file://${desk}"></figure>
      <figure><figcaption>Phone, 390 pixels</figcaption><img src="file://${phone}"></figure></div>`;
    const file = path.resolve(renders, `board-${o.key}.html`);
    fs.writeFileSync(file, html);
    await p.goto(`file://${file}`, { waitUntil: 'load' });
    await p.screenshot({ path: path.resolve(outDir, `why-${o.out ?? o.key}.png`), fullPage: true });
  }
  await b.close();
})();
