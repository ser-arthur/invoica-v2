const { chromium } = require('/home/claude/invoica/node_modules/.pnpm/node_modules/playwright');
// Mockups of the phones section with two phones, light and dark. Each option rearranges the live section's own pieces.
const OPTIONS = {
  // A: side by side, staggered, both screens whole; on scroll they drift apart (light up, dark down)
  stagger: { desk: [{ x: -300, y: 0, w: 280 }, { x: 10, y: 110, w: 280 }], phone: [{ x: -176, y: 0, w: 168 }, { x: 8, y: 54, w: 168 }] },
  // B: an open book, the two turned in towards each other like the two halves of a folded sheet
  book: { desk: [{ x: -290, y: 30, w: 280, ry: 30 }, { x: 10, y: 30, w: 280, ry: -30 }], phone: [{ x: -178, y: 20, w: 168, ry: 22 }, { x: 10, y: 20, w: 168, ry: -22 }] },
  // C: either side of the crease, the band past it in Night; the light phone on lime, the dark one on Night
  split: { desk: [{ x: -300, y: 0, w: 280 }, { x: 10, y: 110, w: 280 }], phone: [{ x: -176, y: 0, w: 168 }, { x: 8, y: 54, w: 168 }], band: true },
  // D: one behind the other, offset so both screens show; the dark one in front; no change under the pointer
  offset: { desk: [{ x: -270, y: 0, w: 280, r: -5 }, { x: -40, y: 90, w: 280, r: 4 }], phone: [{ x: -160, y: 0, w: 176, r: -5 }, { x: -24, y: 50, w: 176, r: 4 }] },
};
(async () => {
  const [, , option, width, height, out] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +width, height: +height }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  await p.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
  const phone = +width < 960;
  await p.evaluate(({ spec, phone }) => {
    const dev = document.querySelector('[data-testid="phone"]');
    const pair = dev.parentElement;
    const band = pair.closest('section').firstElementChild;
    const nightSrc = dev.querySelector('[data-testid="phone-night"]').getAttribute('src');
    const make = (dark) => {
      const d = dev.cloneNode(true);
      d.removeAttribute('data-testid');
      d.querySelector('[data-testid="phone-night"]').remove();
      d.querySelector('[class*="screenCrease"]').remove();
      if (dark) d.querySelector('img').setAttribute('src', nightSrc);
      return d;
    };
    if (!spec) return;
    const places = phone ? spec.phone : spec.desk;
    dev.remove();
    pair.style.perspective = '1800px';
    places.forEach((pl, i) => {
      const d = make(i === 1);
      d.style.cssText = `--w:${pl.w}px;left:calc(50% + ${pl.x}px);margin-left:0;top:${pl.y + (phone ? 24 : 10)}px;animation:none;translate:none;rotate:${pl.r ?? 0}deg;transform:${pl.ry ? `rotateY(${pl.ry}deg)` : 'none'};transform-origin:${pl.ry > 0 ? '100% 50%' : '0 50%'};z-index:${i + 1}`;
      pair.appendChild(d);
    });
    if (spec.band) {
      band.style.position = 'relative';
      const box = pair.getBoundingClientRect();
      const bandBox = band.getBoundingClientRect();
      // the crease runs up between the two phones; on phones it starts below the words, at the right edge
      const mid = box.left + box.width / 2 - bandBox.left;
      const pairTop = ((box.top - bandBox.top) / bandBox.height) * 100;
      const foot = ((mid - (phone ? 110 : 150)) / bandBox.width) * 100;
      const top = ((mid + 150) / bandBox.width) * 100;
      const shape = phone
        ? `${foot}% 100%,100% ${pairTop - 3}%,100% 100%`
        : `${foot}% 100%,${top}% 0,100% 0,100% 100%`;
      const edge = phone
        ? `${foot - 0.5}% 100%,100% ${pairTop - 3.4}%,100% ${pairTop - 2.6}%,${foot + 0.5}% 100%`
        : `${foot - 0.2}% 100%,${top - 0.2}% 0,${top + 0.2}% 0,${foot + 0.2}% 100%`;
      const night = document.createElement('div');
      night.style.cssText = `position:absolute;inset:0;background:linear-gradient(180deg,#0f2427,#09191c);clip-path:polygon(${shape});pointer-events:none`;
      const line = document.createElement('div');
      line.style.cssText = `position:absolute;inset:0;background:linear-gradient(${phone ? '60deg' : '0deg'},#138c86,#46da80 50%,#cff26a);clip-path:polygon(${edge});pointer-events:none`;
      band.prepend(line);
      band.prepend(night);
      for (const c of band.children) if (c !== night && c !== line) c.style.position = c.style.position || 'relative';
    }
  }, { spec: OPTIONS[option], phone });
  const section = p.locator('section[aria-labelledby="phones-heading"]');
  const header = phone ? 72 : 64;
  await section.evaluate((el, off) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off), header);
  await p.waitForTimeout(700);
  const b2 = await section.boundingBox();
  await p.screenshot({ path: out, clip: { x: 0, y: header, width: +width, height: Math.min(+height - header, b2.height) } });
  await b.close();
})();
