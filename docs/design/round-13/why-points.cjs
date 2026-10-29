const { chromium } = require('/home/claude/invoica/node_modules/.pnpm/node_modules/playwright');
// Mockups of Why Invoica's three points, built on the live section on the development server.
// node why-points.cjs <option> <width> <height> <out.png>
// Options: today, specimens (A), invoice (B), filed (C), sheets (D).
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
      const issued = document.querySelector('iframe[title="INV-0044 as issued"]').getAttribute('srcdoc');
      // the three points' colours, from lime to teal, as the rules run today
      const ends = ['#86d94f', '#37c66b', '#138c86'];
      const tints = ['#cff26a', '#6cd47a', '#2fb3a6'];
      const display = getComputedStyle(part(items[0], 'pillarHeading')).fontFamily.replace(/"/g, "'");
      if (option === 'today') return;

      if (option === 'specimens') {
        // A: a small working piece over each point, drawn on the ground, in place of the rule
        const sheet = (x, y, r, colour, z) =>
          `<div style="position:absolute;left:${x}px;top:${y}px;width:136px;height:96px;background:#fff;border-radius:4px;rotate:${r}deg;z-index:${z};box-shadow:0 0 0 1px rgb(0 0 0/.05),0 14px 24px -14px rgb(19 32 26/.45);overflow:hidden">
            <div style="height:46px;background:${colour};padding:9px 10px;position:relative">
              <div style="width:12px;height:12px;border-radius:2px;background:rgb(255 255 255/.92)"></div>
              <div style="position:absolute;left:28px;top:12px;width:44px;height:5px;border-radius:3px;background:rgb(255 255 255/.7)"></div>
              <div style="position:absolute;left:10px;bottom:6px;font:700 13px/1 ${display};color:#fff;letter-spacing:-.01em">INV-0047</div>
            </div>
            <div style="padding:9px 10px;display:grid;gap:6px">
              <div style="height:4px;width:70%;background:#e3e8e6;border-radius:2px"></div>
              <div style="height:4px;width:50%;background:#e3e8e6;border-radius:2px"></div>
              <div style="height:4px;width:60%;background:#e3e8e6;border-radius:2px"></div>
            </div></div>`;
        const tall = phone ? '' : 'height:156px;';
        const brand = `<div style="position:relative;height:${phone ? 140 : 156}px">
          ${sheet(4, 46, -7, '#d9480f', 1)}${sheet(80, 32, -1, '#5b2a4e', 2)}${sheet(156, 44, 5, '#17795a', 3)}</div>`;
        const seg = (w, c) => `<span style="display:block;width:${w}%;height:100%;background:${c};border-radius:5px"></span>`;
        const key = (c, k, v) =>
          `<span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${c}"></span><span style="color:#56676a">${k}</span><b style="color:#09191c;font-weight:600">${v}</b></span>`;
        const money = `<div style="${tall}display:flex;flex-direction:column;justify-content:flex-end;gap:12px">
          <div style="display:flex;align-items:baseline;gap:10px"><span style="font:800 36px/1 ${display};letter-spacing:-.03em;color:#09191c">£6,420.00</span><span style="font-size:13px;color:#56676a">owed to you</span></div>
          <div style="display:flex;gap:3px;height:10px">${seg(58, '#37c66b')}${seg(27, '#cff26a')}${seg(15, '#f0705f')}</div>
          <div style="display:flex;gap:16px;font-size:12px;flex-wrap:wrap">${key('#37c66b', 'Paid', '£8,950')}${key('#cff26a', 'Due', '£4,180')}${key('#f0705f', 'Late', '£2,240')}</div></div>`;
        const row = (ini, bg, name, amount, note, noteColour, last) =>
          `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;${last ? '' : 'border-bottom:1px solid #d7dedb'}">
            <span style="width:28px;height:28px;border-radius:50%;background:${bg};display:grid;place-items:center;font:700 11px/1 ${display};color:#09191c">${ini}</span>
            <span style="flex:1;font-size:14px;color:#09191c;font-weight:600">${name}</span>
            <span style="text-align:right;font-size:14px;color:#09191c;font-weight:600;font-variant-numeric:tabular-nums">${amount}<span style="display:block;font-size:11px;font-weight:500;color:${noteColour}">${note}</span></span></div>`;
        const clients = `<div style="${tall}display:flex;flex-direction:column;justify-content:flex-end">
          ${row('OD', '#e4f5c4', 'Oakridge Dental', '£1,440.00', '12 days late', '#c2410c')}
          ${row('FS', '#cdeedd', 'Fennick &amp; Shaw', '£800.00', 'due 18 Nov', '#56676a')}
          ${row('MA', '#c9ebe7', 'Meridian Architects', 'Settled', '3 invoices', '#56676a', true)}</div>`;
        [brand, money, clients].forEach((html, i) => {
          const r = part(items[i], 'pillarRule');
          const s = el('div', 'margin-bottom:26px', html);
          r.replaceWith(s);
        });
        if (phone) list.style.gap = '56px';
      }

      if (option === 'filed') {
        // C: the rule runs the whole width once, lime to teal, and each point's label is a tab on it, like dividers in a file
        const tab = (item, i, at) => {
          const label = part(item, 'label');
          const r = part(item, 'pillarRule');
          r.remove();
          item.style.position = 'relative';
          item.style.paddingTop = phone ? '62px' : '26px';
          const t = el(
            'div',
            `position:absolute;${at};height:34px;padding:0 22px;display:flex;align-items:center;white-space:nowrap;background:${tints[i]};clip-path:polygon(10px 0,calc(100% - 10px) 0,100% 100%,0 100%)`,
          );
          label.style.color = '#09191c';
          label.style.margin = '0';
          t.appendChild(label);
          item.appendChild(t);
          if (phone) {
            const segments = [
              'linear-gradient(90deg,#cff26a,#86d94f)',
              'linear-gradient(90deg,#6cd47a,#37c66b)',
              'linear-gradient(90deg,#2fb3a6,#138c86)',
            ];
            item.appendChild(el('div', `position:absolute;left:0;right:0;top:34px;height:3px;background:${segments[i]}`));
          }
        };
        if (phone) {
          items.forEach((item, i) =>
            tab(item, i, `top:0;${['left:0', 'left:50%;translate:-50% 0', 'right:0'][i]}`),
          );
          list.style.gap = '44px';
        } else {
          list.style.position = 'relative';
          list.style.paddingTop = '37px';
          list.appendChild(
            el(
              'div',
              'position:absolute;left:0;right:0;top:34px;height:3px;background:linear-gradient(90deg,#cff26a,#86d94f 22%,#37c66b 52%,#2fb3a6 76%,#138c86)',
            ),
          );
          items.forEach((item, i) => tab(item, i, 'top:-37px;left:0'));
        }
      }

      if (option === 'sheets') {
        // D: each point on its own sheet, its corner turned in its colour, laid down a little loose, as papers are
        const turn = 34;
        const lean = phone ? [-0.9, 0.7, -0.4] : [-1.1, 0.8, -0.5];
        const drop = phone ? [0, 0, 0] : [0, 16, 6];
        items.forEach((item, i) => {
          part(item, 'pillarRule').remove();
          item.style.cssText += `;position:relative;padding:${phone ? '30px 24px 32px' : '40px 34px 44px'};rotate:${lean[i]}deg;translate:0 ${drop[i]}px;filter:drop-shadow(0 0 .6px rgb(0 0 0/.12)) drop-shadow(0 18px 22px rgb(19 32 26/.16))`;
          const paper = el(
            'div',
            `position:absolute;inset:0;z-index:-1;background:#fff;border-radius:4px;clip-path:polygon(0 0,calc(100% - ${turn}px) 0,100% ${turn}px,100% 100%,0 100%)`,
          );
          const flap = el(
            'div',
            `position:absolute;top:0;right:0;width:${turn}px;height:${turn}px;background:linear-gradient(225deg,${tints[i]},${ends[i]});clip-path:polygon(0 0,0 100%,100% 100%);border-radius:0 0 0 3px`,
          );
          item.style.isolation = 'isolate';
          item.prepend(paper);
          item.appendChild(flap);
        });
        list.style.columnGap = '28px';
        if (phone) list.style.gap = '22px';
      }

      if (option === 'invoice') {
        // B: one invoice, and each point drawn to the part of it that is its: the head, the amount due, the client
        const W = phone ? list.clientWidth : 520;
        const H = (1123 * W) / 794;
        const k = W / 794;
        const turn = (18 / 210) * W;
        // the invoice down to its lines, fading out there
        const shown = H * 0.6;
        const paper = el(
          'div',
          `position:relative;width:${W}px;height:${shown}px;filter:drop-shadow(0 0 .6px rgb(0 0 0/.12)) drop-shadow(0 22px 26px rgb(19 32 26/.22))`,
        );
        const sheet = el(
          'div',
          `height:100%;overflow:hidden;border-radius:4px;background:#fff;-webkit-mask-image:linear-gradient(#000 78%,transparent);mask-image:linear-gradient(#000 78%,transparent);clip-path:polygon(0 0,calc(100% - ${turn}px) 0,100% ${turn}px,100% 100%,0 100%)`,
        );
        const frame = document.createElement('iframe');
        frame.srcdoc = issued;
        frame.style.cssText = `width:794px;height:1123px;border:0;transform:scale(${k});transform-origin:0 0;pointer-events:none`;
        sheet.appendChild(frame);
        paper.appendChild(sheet);
        // where each point lands, in the page's own 794 by 1123
        const spots = [
          [38, 51],
          [phone ? 774 : 756, 172],
          [38, 368],
        ];
        const dots = spots.map(([x, y], i) => {
          const d = el(
            'span',
            `position:absolute;left:${x * k - (phone ? 8 : 6)}px;top:${y * k - (phone ? 4 : 6)}px;width:${phone ? 8 : 12}px;height:${phone ? 8 : 12}px;border-radius:50%;background:${tints[i]};box-shadow:0 0 0 ${phone ? 2 : 3}px rgb(255 255 255/.9),0 0 0 ${phone ? 3 : 4}px ${ends[i]}`,
          );
          paper.appendChild(d);
          return d;
        });
        items.forEach((item, i) => {
          part(item, 'pillarRule').remove();
          const label = part(item, 'label');
          const lead = el(
            'span',
            `display:inline-block;width:10px;height:10px;border-radius:50%;background:${tints[i]};box-shadow:0 0 0 2px ${ends[i]};margin-right:10px;vertical-align:-1px`,
          );
          label.prepend(lead);
          label.style.alignSelf = 'flex-start';
        });
        if (phone) {
          list.parentElement.insertBefore(el('div', 'margin-top:44px'), list).appendChild(paper);
          list.style.marginTop = '48px';
          list.style.gap = '40px';
          return;
        }
        const stage = el('div', `position:relative;margin-top:72px;height:${shown + 40}px`);
        list.replaceWith(stage);
        const cw = stage.clientWidth;
        paper.style.position = 'absolute';
        paper.style.left = `${(cw - W) / 2}px`;
        paper.style.top = '20px';
        stage.appendChild(paper);
        const side = (cw - W) / 2 - 56;
        const place = [
          { left: 0, top: 0 },
          { left: cw - side, top: 70 },
          { left: 0, top: 300 },
        ];
        items.forEach((item, i) => {
          item.style.cssText += `;position:absolute;width:${side}px;left:${place[i].left}px;top:${place[i].top}px;margin:0`;
          stage.appendChild(item);
        });
        // a fine line from each point's label to its spot on the invoice
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', cw);
        const bottom = Math.max(shown + 40, ...items.map((it) => it.offsetTop + it.offsetHeight));
        stage.style.height = `${bottom}px`;
        svg.setAttribute('height', bottom);
        svg.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none';
        stage.appendChild(svg);
        const sb = stage.getBoundingClientRect();
        items.forEach((item, i) => {
          const lb = part(item, 'label').getBoundingClientRect();
          const db = dots[i].getBoundingClientRect();
          const right = i === 1;
          const x1 = (right ? lb.left - 14 : lb.right + 14) - sb.left;
          const y1 = lb.top + lb.height / 2 - sb.top;
          const x2 = db.left + db.width / 2 - sb.left + (right ? 10 : -10);
          const y2 = db.top + db.height / 2 - sb.top;
          const bend = right ? Math.max(x2 + 40, x1 - 60) : Math.min(x2 - 40, x1 + 60);
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M${x1} ${y1} H${bend} L${x2} ${y2}`);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', ends[i]);
          path.setAttribute('stroke-width', '1.5');
          svg.appendChild(path);
        });
      }
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
    clip: { x: 0, y: box.y - 24, width: +width, height: box.height + (phone ? 72 : 120) },
  });
  await b.close();
})();
