// Captures the round 5 app boards from the design canvas for the website, at twice the pixel density.
// Usage: python3 soften-glows.py <canvas>/project, python3 phone-boards.py <canvas>/project, then node site-shots.js <canvas folder with project/ and assets/> <output folder>, then site-images.py.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dir = process.argv[2], out = process.argv[3];
const blobs = Object.fromEntries(fs.readFileSync(path.join(dir, '..', 'blobs.txt'), 'utf8').trim().split('\n').map(l => l.split(' ')));
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u.startsWith('/_blob/')) { const f = path.join(dir, '..', 'assets', blobs[u.slice(7)]); res.writeHead(200, {'content-type': f.endsWith('.png') ? 'image/png' : 'image/svg+xml'}); return res.end(fs.readFileSync(f)); }
  if (u.startsWith('/nm/')) { res.writeHead(200, {'content-type': 'font/woff2'}); return res.end(fs.readFileSync('/home/claude/render/node_modules/' + u.slice(4))); }
  if (u.endsWith('support.js')) { res.writeHead(200, {'content-type': 'text/javascript'}); return res.end(''); }
  const f = path.join(dir, 'project', u); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'content-type': 'text/html'}); res.end(fs.readFileSync(f));
}).listen(0, async () => {
  const port = srv.address().port;
  const ff=(fam,file,w)=>`@font-face{font-family:'${fam}';font-weight:${w};src:url(http://localhost:${port}/nm/${file}) format('woff2');}`;
  const css=[ff('Sora','@fontsource-variable/sora/files/sora-latin-wght-normal.woff2','100 800'),ff('Onest','@fontsource-variable/onest/files/onest-latin-wght-normal.woff2','100 900')].join('\n');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const shoot = async (file, w, h, jobs, scale = 2) => {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: css }));
    await p.goto(`http://localhost:${port}/${file}`); await p.waitForTimeout(1200);
    for (const [name, sel] of jobs) {
      if (sel === null) await p.screenshot({ path: path.join(out, name) });
      else await p.locator(sel).first().screenshot({ path: path.join(out, name) });
      console.log('saved', name);
    }
    await p.close();
  };
  await shoot('R5Editor.dc.html', 1440, 900, [['editor.png', null], ['editor-lines.png', 'section.card:has(h2:text-is("Lines"))'], ['editor-preview.png', 'aside[aria-label="Preview"]']]);
  await shoot('R5Invoice.dc.html', 1440, 900, [['invoice.png', null], ['invoice-paper.png', 'article[aria-label="The invoice as the client received it"]']]);
  await shoot('R5DashboardDark.dc.html', 1440, 900, [['dashboard-dark.png', null]]);
  await shoot('R5Dashboard.dc.html', 1440, 900, [['dashboard.png', null], ['chasing.png', 'section#chasing']]);
  await shoot('PhoneShot.dc.html', 393, 852, [['phone.png', null]], 3);
  await shoot('PhoneShotDark.dc.html', 393, 852, [['phone-dark.png', null]], 3);
  await b.close(); srv.close();
});
