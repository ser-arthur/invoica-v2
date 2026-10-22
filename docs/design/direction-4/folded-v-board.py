"""Writes the round 4 wordmark board: the folded v, drawn as exact vector, at every size and in use."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from folded_v import wordmark, icon, folded_v, v_geometry, NIGHT, WHITE, ASC, W, H  # noqa: E402

out_dir, height = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else '3400')
MINT = '#6CE4A2'

CSS = """
body{margin:0;background:#ECEFED}
.h{font-family:Sora,sans-serif;font-weight:800;letter-spacing:-0.03em;text-wrap:balance}
.num{font-variant-numeric:tabular-nums}
.sec{display:grid;grid-template-columns:200px minmax(0,1fr);gap:40px;border-top:1px solid #D6DDDB;padding-top:28px}
.sec>h2{margin:0;font-family:Sora,sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.03em}
.cap{font-size:13px;color:#56676A;margin:12px 0 0;line-height:1.5;max-width:46em}
.cap strong{color:#09191C;font-weight:600}
.tile{position:relative;border-radius:22px;overflow:hidden}
.row{display:grid;grid-template-columns:620px minmax(0,1fr);gap:20px}
.lab{position:absolute;font-size:12.5px;line-height:1.35;color:#3E4F51;white-space:nowrap}
.sz{display:flex;flex-direction:column;align-items:flex-start;gap:10px;font-size:12px;color:#56676A}
"""


def construction():
    """The v alone, large, with its parts named."""
    s = 0.42
    parts, defs = folded_v(0, style='light', sx=s, oy=0)
    A, B, C, D, F, G, X = v_geometry()
    vb = f'-20 {-H * s - 20} {W * s + 40} {H * s + 40}'
    svg = (f'<svg viewBox="{vb}" width="{W * s + 40}" height="{H * s + 40}" aria-hidden="true" style="display:block">'
           f'<defs>{"".join(defs)}</defs>{"".join(parts)}</svg>')
    return f"""
<div class="tile" style="height:380px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">
  <div style="position:relative">
    {svg}
    <span class="lab" style="right:100%;margin-right:4px;top:62px">The front, green</span>
    <span class="lab" style="left:100%;margin-left:-6px;top:30px">The back, mint</span>
    <span class="lab" style="left:100%;margin-left:-40px;top:160px">The crease</span>
    <span class="lab" style="right:100%;margin-right:-60px;bottom:6px">The turn</span>
  </div>
</div>"""


header = f"""
  <header style="display:flex;align-items:flex-end;justify-content:space-between;gap:40px">
    {wordmark(132)}
    <div style="text-align:right">
      <div class="h" style="font-size:26px">Design direction, round 4</div>
      <div style="font-size:15px;color:#56676A;margin-top:6px">The folded v</div>
    </div>
  </header>
  <p class="cap" style="margin:-22px 0 0;font-size:15px;max-width:54em">Drawn as exact vector. The n, o, c and a are Sora ExtraBold, the typeface of the headings; the i is a plain stem with a round dot in the green; the v is drawn new, as one strip folded at the bottom.</p>
"""

mark = f"""
  <section class="sec">
    <h2>The mark</h2>
    <div>
      <div class="row">
        <div class="tile" style="height:300px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">{wordmark(124)}</div>
        <div class="tile" style="height:300px;background:#09191C;display:flex;align-items:center;justify-content:center">{wordmark(72, ink=WHITE, dot=MINT, style='dark')}</div>
      </div>
      <div class="row" style="margin-top:20px">
        {construction()}
        <div class="tile" style="height:380px;background:#ECEFED;box-shadow:inset 0 0 0 1px #D6DDDB;display:flex;align-items:center;justify-content:center">{icon(220)}</div>
      </div>
      <p class="cap"><strong>One strip, two faces.</strong> The front is your green, the back is mint, and the back slips behind the front along the crease, with a soft shadow there and the strip rounding off where it turns. In the name it is a v; on its own, with a short front and a long back, it is a tick, the mark for paid. The fold is the same one the sheet has in its corner.</p>
    </div>
  </section>
"""

sizes = f"""
  <section class="sec">
    <h2>Sizes</h2>
    <div>
      <div class="tile" style="background:#FFFFFF;padding:30px 36px;display:flex;align-items:flex-end;justify-content:space-between;gap:24px">
        <span class="sz">{wordmark(56)}56 pixels</span>
        <span class="sz">{wordmark(32, style='auto')}32</span>
        <span class="sz">{wordmark(22, style='auto')}22</span>
        <span class="sz">{wordmark(16, style='auto')}16</span>
        <span style="width:1px;align-self:stretch;background:#E3E8E6"></span>
        <span style="display:flex;align-items:flex-end;gap:16px">{icon(96)}{icon(48, radius=11)}{icon(32, radius=8)}{icon(16, radius=4)}</span>
      </div>
      <p class="cap"><strong>Below 34 pixels the faces go flat:</strong> two plain greens, no shadow and no shading, so the fold still reads in the app's top bar, in a browser tab and on a phone.</p>
      <div class="row" style="grid-template-columns:1fr 1fr;margin-top:20px">
        <div class="tile" style="height:190px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">{wordmark(76, mono=True)}</div>
        <div class="tile" style="height:190px;background:#09191C;display:flex;align-items:center;justify-content:center">{wordmark(76, ink=WHITE, mono=True)}</div>
      </div>
      <p class="cap"><strong>In one colour,</strong> for stamps, embossing and anywhere green is not available, a hairline gap keeps the crease.</p>
    </div>
  </section>
"""

site = f"""
<div class="tile" style="height:360px;background:#FFFFFF">
  <div style="display:flex;align-items:center;justify-content:space-between;height:84px;padding:0 40px">
    {wordmark(34)}
    <span style="display:flex;gap:30px;font-size:14px;font-weight:500"><span>How it works</span><span>Templates</span><span>Early access</span></span>
    <span style="display:inline-flex;align-items:center;height:42px;padding:0 16px;border-radius:12px;background:#09191C;color:#FFFFFF;font-size:14px;font-weight:600">Create free account</span>
  </div>
  <div style="text-align:center;padding-top:42px">
    <div class="h" style="font-size:64px;line-height:0.98;letter-spacing:-0.045em"><span style="display:inline-block">Every invoice,</span><br><span style="display:inline-block">all the way to paid.</span></div>
    <p style="margin:18px auto 0;font-size:16px;line-height:1.6;color:#3E4F51;max-width:30em">Write invoices in your own colours, send them in a click, and see where each one is until the money lands.</p>
  </div>
</div>"""

bars = f"""
<div style="display:flex;flex-direction:column;gap:12px">
  <div class="tile" style="height:74px;background:#FFFFFF;display:flex;align-items:center;gap:36px;padding:0 28px">
    {wordmark(28, style='auto')}
    <span style="display:flex;gap:6px;font-size:14px;font-weight:600"><span style="padding:9px 14px;border-radius:10px;background:#09191C;color:#FFFFFF">Dashboard</span><span style="padding:9px 14px;color:#56676A">Invoices</span><span style="padding:9px 14px;color:#56676A">Clients</span><span style="padding:9px 14px;color:#56676A">Items</span></span>
    <span style="margin-left:auto;display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:12px;background:#09191C;color:#FFFFFF;font-size:14px;font-weight:600">New invoice</span>
  </div>
  <div class="tile" style="height:74px;background:#09191C;display:flex;align-items:center;gap:36px;padding:0 28px">
    {wordmark(28, ink=WHITE, dot=MINT, style='flatdark')}
    <span style="display:flex;gap:6px;font-size:14px;font-weight:600"><span style="padding:9px 14px;border-radius:10px;background:#FFFFFF;color:#09191C">Dashboard</span><span style="padding:9px 14px;color:#9AABA8">Invoices</span><span style="padding:9px 14px;color:#9AABA8">Clients</span><span style="padding:9px 14px;color:#9AABA8">Items</span></span>
    <span style="margin-left:auto;display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:12px;background:#CFF26A;color:#09191C;font-size:14px;font-weight:700">New invoice</span>
  </div>
</div>"""

smalls = f"""
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
  <div class="tile" style="height:230px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">
    <span style="display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:10px 10px 0 0;background:#ECEFED;box-shadow:inset 0 -2px 0 #D6DDDB;font-size:13px;width:230px;box-sizing:border-box">{icon(16, radius=4)}<span style="flex:1">Invoices, Invoica</span><span style="color:#56676A">&#215;</span></span>
  </div>
  <div class="tile" style="height:230px;background:linear-gradient(160deg,#16443F,#09191C 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
    {icon(78, radius=18)}
    <span style="font-size:12px;color:#FFFFFF">Invoica</span>
  </div>
  <div class="tile" style="height:230px;background:#ECEFED;box-shadow:inset 0 0 0 1px #D6DDDB;display:flex;align-items:center;justify-content:center">
    <div style="width:286px;border-radius:14px;background:#FFFFFF;overflow:hidden;box-shadow:0 18px 40px -24px rgba(9,25,28,0.35)">
      <div style="padding:16px 18px;font-size:13px;line-height:1.55;color:#3E4F51">Please find attached invoice INV-0044 for <strong class="num" style="color:#09191C">£2,280.00</strong>, due on 3 November 2026.</div>
      <div style="padding:11px 18px;background:#F7F9F8;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#56676A"><span>Sent with</span>{wordmark(17, style='auto')}</div>
    </div>
  </div>
</div>"""

card = f"""
<div class="row" style="grid-template-columns:1fr 1fr">
  <div class="tile" style="height:300px;background:#E3E8E6;display:flex;align-items:center;justify-content:center">
    <div style="position:relative;width:340px;height:200px;border-radius:10px;background:#09191C;box-shadow:0 30px 50px -24px rgba(9,25,28,0.55);clip-path:polygon(0 0,100% 0,100% calc(100% - 58px),calc(100% - 58px) 100%,0 100%);overflow:hidden">
      <div style="position:absolute;left:28px;top:30px">{wordmark(40, ink=WHITE, dot=MINT, style='dark')}</div>
      <div style="position:absolute;left:28px;bottom:26px;font-size:12px;line-height:1.5;color:rgba(255,255,255,0.7)">Every invoice,<br>all the way to paid.</div>
      <span style="position:absolute;right:0;bottom:0;width:58px;height:58px;clip-path:polygon(0 0,100% 0,0 100%);border-top-left-radius:6px;background:linear-gradient(to top left,#A6F2CA,#46DA80 55%,#24A962)"></span>
    </div>
  </div>
  <div class="tile" style="height:300px;background:#E3E8E6;display:flex;align-items:center;justify-content:center">
    <div style="position:relative;width:340px;height:200px;border-radius:10px;background:#FFFFFF;box-shadow:0 30px 50px -24px rgba(9,25,28,0.40);display:flex;flex-direction:column;justify-content:space-between;padding:28px;box-sizing:border-box">
      {icon(44, radius=10)}
      <div style="font-size:12px;line-height:1.6;color:#3E4F51">Invoicing for freelancers and small studios<br><strong style="color:#09191C">invoica.example</strong></div>
    </div>
  </div>
</div>"""

in_use = f"""
  <section class="sec">
    <h2>In use</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      {site}
      <p class="cap" style="margin-top:0">The website's header. The name sits at 34 pixels and the headline does the talking.</p>
      <div style="margin-top:20px">{bars}</div>
      <p class="cap" style="margin-top:0">The app's top bar, light and dark, with the flat faces.</p>
      <div style="margin-top:20px">{smalls}</div>
      <p class="cap" style="margin-top:0">Where a square is needed, the tick stands alone: the browser tab and the phone's home screen. The foot of every email carries the name.</p>
      <div style="margin-top:20px">{card}</div>
      <p class="cap" style="margin-top:0">On paper the sheet's folded corner comes back: the front of a card turns its corner in the same greens as the v.</p>
    </div>
  </section>
"""

html = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Invoica, round 4: the folded v</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@100..900&amp;family=Sora:wght@100..800&amp;display=swap">
<style>{CSS}</style>
</helmet>
<div style="width:1440px;box-sizing:border-box;padding:64px 80px 80px;background:#ECEFED;color:#09191C;font-family:Onest,sans-serif;display:flex;flex-direction:column;gap:48px">
{header}
{mark}
{sizes}
{in_use}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1440,"height":{height}}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{}};
  }}
}}
</script>
</body>
</html>
"""
open(os.path.join(out_dir, 'R4Wordmark.dc.html'), 'w').write(html)
print('written')
