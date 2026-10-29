const { chromium } = require('/home/claude/invoica/node_modules/.pnpm/node_modules/playwright');
// Round 13, second pass: the folder tabs of option C made properly, and with option A's pieces filed behind them.
// node why-tabs.cjs <option> <width> <height> <out.png>
// Options: line (C1), sheets (C2), file (C3), filed (C4).
(async () => {
  const [, , option, width, height, out] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({
    viewport: { width: +width, height: +height },
    reducedMotion: 'reduce',
    deviceScaleFactor: 2,
  });
  await p.goto('http://localhost:3002/', { waitUntil: 'networkidle' });
  const phone = +width < 960;
  await p.evaluate(
    ({ option, phone }) => {
      const sec = document.querySelector('#why');
      const list = sec.querySelector('ul');
      const items = [...list.children];
      const part = (el, name) => el.querySelector(`[class*="${name}"]`);
      const el = (tag, css, html = '') => {
        const e = document.createElement(tag);
        e.style.cssText = css;
        e.innerHTML = html;
        return e;
      };
      const display = getComputedStyle(part(items[0], 'pillarHeading')).fontFamily.replace(/"/g, "'");
      // each point's colour, strong for a line, pale for a divider
      const strong = ['#cff26a', '#6cd47a', '#2fb3a6'];
      const pale = ['#e8f5c4', '#d5f0dd', '#cfe9e6'];

      /** A folder tab: soft shoulders either side, the label on it, sitting on whatever is below. */
      const TAB_H = phone ? 36 : 40;
      const tab = (label, fill, place) => {
        const t = el(
          'div',
          `position:absolute;bottom:calc(100% - 1px);${place};height:${TAB_H}px;padding:0 30px;display:flex;align-items:center;white-space:nowrap;background:${fill}`,
        );
        label.style.cssText += ';margin:0;color:#09191c;font-size:12.5px';
        t.appendChild(label);
        return t;
      };
      /** Shapes every tab once it has its width. */
      const shape = () =>
        document.querySelectorAll('[data-tab]').forEach((t) => {
          const w = t.offsetWidth;
          const h = t.offsetHeight;
          const s = 18;
          t.style.clipPath = `path('M0 ${h} C ${s * 0.55} ${h} ${s * 0.4} 0 ${s} 0 L ${w - s} 0 C ${w - s * 0.4} 0 ${w - s * 0.55} ${h} ${w} ${h} Z')`;
        });
      const stagger = (i) =>
        ['left:0', 'left:50%;translate:-50% 0', 'right:0'][i];

      // Option A's three pieces, for C4
      const specimen = (i) => {
        const sheet = (x, y, r, colour, z) =>
          `<div style="position:absolute;left:${x}px;top:${y}px;width:136px;height:96px;background:#fff;border-radius:4px;rotate:${r}deg;z-index:${z};box-shadow:0 0 0 1px rgb(0 0 0/.05),0 14px 24px -14px rgb(19 32 26/.45);overflow:hidden">
            <div style="height:46px;background:${colour};padding:9px 10px;position:relative">
              <div style="width:12px;height:12px;border-radius:2px;background:rgb(255 255 255/.92)"></div>
              <div style="position:absolute;left:28px;top:12px;width:44px;height:5px;border-radius:3px;background:rgb(255 255 255/.7)"></div>
              <div style="position:absolute;left:10px;bottom:6px;font:700 13px/1 ${display};color:#fff">INV-0047</div>
            </div>
            <div style="padding:9px 10px;display:grid;gap:6px">
              <div style="height:4px;width:70%;background:#e3e8e6;border-radius:2px"></div>
              <div style="height:4px;width:50%;background:#e3e8e6;border-radius:2px"></div>
              <div style="height:4px;width:60%;background:#e3e8e6;border-radius:2px"></div>
            </div></div>`;
        if (i === 0)
          return `<div style="position:relative;height:140px;width:300px">${sheet(4, 30, -7, '#d9480f', 1)}${sheet(80, 16, -1, '#5b2a4e', 2)}${sheet(156, 28, 5, '#17795a', 3)}</div>`;
        const seg = (w, c) => `<span style="display:block;width:${w}%;height:100%;background:${c};border-radius:5px"></span>`;
        const key = (c, k, v) =>
          `<span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${c};box-shadow:0 0 0 1px rgb(9 25 28/.12)"></span><span style="color:#3e4f51">${k}</span><b style="color:#09191c;font-weight:600">${v}</b></span>`;
        if (i === 1)
          return `<div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:360px">
            <div style="display:flex;align-items:baseline;gap:10px"><span style="font:800 36px/1 ${display};letter-spacing:-.03em;color:#09191c">£6,420.00</span><span style="font-size:13px;color:#3e4f51">owed to you</span></div>
            <div style="display:flex;gap:3px;height:10px">${seg(58, '#37c66b')}${seg(27, '#b6e04a')}${seg(15, '#f0705f')}</div>
            <div style="display:flex;gap:16px;font-size:12px;flex-wrap:wrap">${key('#37c66b', 'Paid', '£8,950')}${key('#b6e04a', 'Due', '£4,180')}${key('#f0705f', 'Late', '£2,240')}</div></div>`;
        const row = (ini, name, amount, note, noteColour, last) =>
          `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;${last ? '' : 'border-bottom:1px solid rgb(9 25 28/.1)'}">
            <span style="width:28px;height:28px;border-radius:50%;background:#fff;display:grid;place-items:center;font:700 11px/1 ${display};color:#09191c">${ini}</span>
            <span style="flex:1;font-size:14px;color:#09191c;font-weight:600">${name}</span>
            <span style="text-align:right;font-size:14px;color:#09191c;font-weight:600;font-variant-numeric:tabular-nums">${amount}<span style="display:block;font-size:11px;font-weight:500;color:${noteColour}">${note}</span></span></div>`;
        return `<div style="width:100%;max-width:360px">
          ${row('OD', 'Oakridge Dental', '£1,440.00', '12 days late', '#b3380a')}
          ${row('FS', 'Fennick &amp; Shaw', '£800.00', 'due 18 Nov', '#3e4f51')}
          ${row('MA', 'Meridian Architects', 'Settled', '3 invoices', '#3e4f51', true)}</div>`;
      };

      items.forEach((item) => part(item, 'pillarRule').remove());

      if (option === 'line') {
        // C1: one line, lime to teal, the tabs rising out of it in the line's own colour where they stand
        items.forEach((item, i) => {
          const t = tab(part(item, 'label'), strong[i], phone ? stagger(i) : 'left:0');
          t.dataset.tab = '';
          t.style.bottom = 'calc(100% - 1px)';
          const holder = el('div', `position:relative;height:3px;margin:${TAB_H}px 0 26px;background:${
            phone ? `linear-gradient(90deg,${strong[i]},${['#86d94f', '#37c66b', '#138c86'][i]})` : 'transparent'
          }`);
          holder.appendChild(t);
          item.prepend(holder);
        });
        if (!phone) {
          list.style.position = 'relative';
          list.appendChild(
            el(
              'div',
              `position:absolute;left:0;right:0;top:${TAB_H}px;height:3px;background:linear-gradient(90deg,#cff26a,#86d94f 22%,#37c66b 52%,#2fb3a6 76%,#138c86)`,
            ),
          );
        } else list.style.gap = '40px';
      }

      if (option === 'sheets') {
        // C2: each point on a divider in its colour, its tab part of the same sheet, the tabs stepping across
        items.forEach((item, i) => {
          item.style.cssText += `;position:relative;z-index:${i + 1};background:${pale[i]};border-radius:0 0 8px 8px;padding:${phone ? '26px 24px 30px' : '34px 34px 40px'};margin-top:${TAB_H}px`;
          const t = tab(part(item, 'label'), pale[i], stagger(i));
          t.dataset.tab = '';
          item.prepend(t);
          item.style.borderTopLeftRadius = i === 0 ? '0' : '8px';
          item.style.borderTopRightRadius = i === 2 ? '0' : '8px';
        });
        list.style.columnGap = '20px';
        if (phone) list.style.gap = '14px';
      }

      if (option === 'file' || option === 'filed') {
        // C3: a file of three dividers, one in front of the other, their tabs stepping across.
        // C4: the same, with what is filed behind each divider showing on it (option A's pieces).
        const withPiece = option === 'filed';
        list.style.cssText += `;display:block;filter:none;padding-top:${TAB_H}px`;
        items.forEach((item, i) => {
          const heading = part(item, 'pillarHeading');
          const body = part(item, 'pillarBody');
          // each divider stands a little in front of the one before it; the one before leaves room for its tab
          const overlap = 16;
          const room = i === 2 ? (phone ? 30 : 48) : overlap + TAB_H + (phone ? 26 : 38);
          item.style.cssText += `;position:relative;z-index:${i + 1};background:${pale[i]};border-radius:${
            i === 0 ? '0 10px 10px 10px' : i === 2 ? '10px 0 10px 10px' : '10px'
          };margin-top:${i === 0 ? 0 : -overlap}px;padding:${phone ? `28px 24px ${room}px` : `40px 56px ${room}px`};${
            i > 0 ? 'filter:drop-shadow(0 -4px 8px rgb(19 32 26/.09))' : ''
          }`;
          const t = tab(part(item, 'label'), pale[i], phone ? stagger(i) : ['left:0', 'left:33.333%', 'left:66.666%'][i]);
          t.dataset.tab = '';
          item.prepend(t);
          if (!phone) {
            const words = el('div', withPiece ? 'flex:0 1 46%' : 'display:contents');
            const row = el(
              'div',
              withPiece
                ? 'display:flex;align-items:center;justify-content:space-between;gap:56px'
                : 'display:grid;grid-template-columns:5fr 6fr;gap:64px;align-items:start',
            );
            heading.style.marginTop = '0';
            if (withPiece) {
              words.appendChild(heading);
              words.appendChild(body);
              row.appendChild(words);
              row.appendChild(el('div', 'flex:0 1 40%;display:flex;justify-content:flex-end', specimen(i)));
            } else {
              row.appendChild(heading);
              body.style.margin = '6px 0 0';
              body.style.maxWidth = '34em';
              row.appendChild(body);
            }
            item.appendChild(row);
          } else if (withPiece) {
            heading.before(el('div', 'margin:4px 0 24px', specimen(i)));
          }
        });
      }
      shape();
    },
    { option, phone },
  );
  await p.waitForTimeout(900);
  const box = await p.locator('#why').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { y: r.top + window.scrollY, height: r.height };
  });
  await p.screenshot({
    path: out,
    fullPage: true,
    clip: { x: 0, y: box.y - 24, width: +width, height: box.height + (process.env.MORE ? 900 : phone ? 72 : 120) },
  });
  await b.close();
})();
