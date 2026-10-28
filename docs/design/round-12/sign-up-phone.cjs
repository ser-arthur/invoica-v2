const { chromium } = require('/home/claude/invoica/node_modules/.pnpm/node_modules/playwright');
// Mockups of sign up on a phone, built from the live page's own pieces.
(async () => {
  const [, , option, theme, out, path = '/sign-up'] = process.argv;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  await ctx.addCookies([{ name: 'invoica_theme', value: theme, url: 'http://localhost:3002' }]);
  const p = await ctx.newPage();
  await p.goto('http://localhost:3002' + path, { waitUntil: 'networkidle' });
  await p.evaluate(({ option, theme }) => {
    const dark = theme === 'dark';
    const line = document.querySelector('[data-testid="auth-line"]');
    const side = line.parentElement;
    const foot = document.querySelector('[data-testid="auth-foot"]');
    const mark = foot.querySelector('a[aria-label="Invoica home"]');
    const heading = document.querySelector('main h1');
    const ground = dark ? '#0f2427' : '#09191c';
    // a Night block across the top, its foot slanted and drawn with the crease, lime to teal
    const block = (pad = '26px 20px 58px') => {
      const el = document.createElement('div');
      el.style.cssText = `position:relative;background:${ground};padding:${pad};clip-path:polygon(0 0,100% 0,100% calc(100% - 34px),0 100%)`;
      const crease = document.createElement('div');
      crease.style.cssText = 'position:absolute;inset:0;background:linear-gradient(90deg,#cff26a,#46da80 50%,#2fb3a6);clip-path:polygon(0 calc(100% - 3px),100% calc(100% - 37px),100% calc(100% - 34px),0 100%)';
      el.appendChild(crease);
      return el;
    };
    const fullMark = (m, width) => {
      m.style.margin = '0';
      m.style.padding = '0';
      const fm = m.firstElementChild;
      fm.style.cssText += `;height:auto;margin:0;-webkit-mask-image:none;mask-image:none;width:${width}`;
      fm.removeAttribute('data-armed');
      fm.setAttribute('data-seen', '');
      return m;
    };
    const lightFoot = () => {
      mark.remove();
      foot.style.cssText = 'background:transparent;color:inherit;padding:8px 20px 28px;border-radius:0;animation:none';
      foot.querySelector('div').style.color = dark ? 'rgb(255 255 255 / .55)' : '#5b6862';
    };
    const nightLine = (size) => {
      const n = line.querySelector('[data-line="night"]').cloneNode(true);
      n.style.display = 'block';
      n.querySelectorAll('p, [aria-hidden="true"] > *').forEach((t) => (t.style.fontSize = size));
      n.querySelectorAll('p').forEach((t) => (t.style.fontSize = size));
      return n;
    };
    if (option === 'mark') {
      const top = block('30px 20px 64px');
      top.appendChild(fullMark(mark.cloneNode(true), '100%'));
      side.insertBefore(top, side.firstChild);
      line.remove();
      lightFoot();
    }
    if (option === 'markline') {
      const top = block('26px 20px 60px');
      const m = fullMark(mark.cloneNode(true), '58%');
      m.style.marginBottom = '22px';
      top.appendChild(m);
      const n = nightLine('30px');
      top.appendChild(n);
      side.insertBefore(top, side.firstChild);
      line.remove();
      lightFoot();
    }
    if (option === 'panel') {
      const top = block('22px 20px 60px');
      const aside = document.querySelector('aside');
      const logo = aside.querySelector('a').cloneNode(true);
      logo.style.cssText = 'display:inline-block;margin-bottom:26px';
      const svg = logo.querySelector('svg');
      if (svg) svg.style.height = '30px';
      const flap = aside.querySelector('span[aria-hidden="true"]').cloneNode(true);
      flap.style.cssText += ';position:absolute;top:0;right:0;width:44px;height:44px;display:block';
      top.appendChild(flap);
      top.appendChild(logo);
      top.appendChild(nightLine('34px'));
      side.insertBefore(top, side.firstChild);
      line.remove();
      lightFoot();
    }
    if (option === 'quiet') {
      heading.style.fontSize = '22px';
      heading.style.color = dark ? 'rgb(255 255 255 / .72)' : '#3e4f51';
      heading.style.marginTop = '8px';
    }
  }, { option, theme });
  await p.waitForTimeout(500);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})();
