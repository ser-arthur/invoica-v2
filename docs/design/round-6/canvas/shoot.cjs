const { chromium } = require('playwright');
(async () => {
const [, , file, w, h, out, ...times] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await p.goto('file://' + file);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
if (times.length) {
  for (const t of times) {
    await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), +t);
    await p.waitForTimeout(80);
    await p.screenshot({ path: out.replace('.png', `-${t}.png`), fullPage: false });
  }
} else await p.screenshot({ path: out, fullPage: true });
await b.close();
})();
