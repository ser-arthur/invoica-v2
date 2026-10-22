"""Writes the round 4 wordmark board: three ways to put the fold inside the name, and the recommended one in use."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wordmark import svg, icon_glyph, NIGHT, WHITE, GREEN, MINT  # noqa: E402

out_dir, height = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else '3000')

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
.strip{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:12px;padding:18px 28px;border-radius:18px;background:#FFFFFF}
.bar{display:flex;align-items:center;gap:22px;height:56px;padding:0 18px;border-radius:14px;box-shadow:inset 0 0 0 1px #E3E8E6;font-size:13px;font-weight:600}
.badge{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:7px;background:#CFF26A;font-size:12.5px;font-weight:700;margin-left:10px;vertical-align:middle}
.opt{display:flex;align-items:baseline;gap:12px;margin:0 0 14px}
.opt h3{margin:0;font-family:Sora,sans-serif;font-weight:800;font-size:20px;letter-spacing:-0.02em}
.link{color:#56676A;text-decoration:none}
"""


def option(key, title, verdict, recommended=False, dot=None):
    badge = '<span class="badge">Recommended</span>' if recommended else ''
    top_bar = (f'<div class="bar">{svg(key, 26, dot=dot)}<span class="link">Dashboard</span><span class="link">Invoices</span>'
               f'<span class="link">Clients</span></div>')
    return f"""
      <div>
        <div class="opt"><h3>{title}</h3>{badge}</div>
        <div class="row">
          <div class="tile" style="height:230px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">{svg(key, 118, dot=dot)}</div>
          <div class="tile" style="height:230px;background:#09191C;display:flex;align-items:center;justify-content:center">{svg(key, 66, ink=WHITE, dot=(MINT if dot else None), dark=True)}</div>
        </div>
        <div class="strip">
          {top_bar}
          <span style="display:flex;align-items:center;gap:14px">{svg(key, 18, dot=dot)}<span style="font-size:12px;color:#56676A">at 18 pixels</span></span>
          <span style="display:flex;align-items:center;gap:14px">{icon_glyph(key, 88)}{icon_glyph(key, 40, radius=10)}{icon_glyph(key, 20, radius=5)}</span>
        </div>
        <p class="cap">{verdict}</p>
      </div>"""


A = 'A3'
options = f"""
  <section class="sec">
    <h2>Three ways in</h2>
    <div style="display:flex;flex-direction:column;gap:44px">
      {option(A, 'A. The v, folded', '<strong>One strip folded at the baseline:</strong> the dark face in front, the green underside rising behind it, the same green as the underside of the sheet. A folded v is also a tick, the mark for paid. It keeps its shape at 18 pixels, and on its own it makes the app icon.', True)}
      {option('B1', 'B. The i as a sheet', '<strong>The first i becomes a slip with its corner turned.</strong> The closest to the sheet, and lovely large. In the top bar the fold is two or three pixels wide, and below about 30 pixels it is gone.')}
      {option('C1', 'C. The full stop as a sheet', '<strong>The old full stop grows into a small green sheet.</strong> Clear at every size and it keeps something of the old wordmark. It is still a symbol after the name, and on its own it is the file icon every app already uses.')}
    </div>
  </section>
"""

hero = f"""
<div class="tile" style="height:360px;background:#FFFFFF">
  <div style="display:flex;align-items:center;justify-content:space-between;height:84px;padding:0 40px">
    {svg(A, 30)}
    <span style="display:flex;gap:30px;font-size:14px;font-weight:500"><span>How it works</span><span>Templates</span><span>Early access</span></span>
    <span style="display:inline-flex;align-items:center;height:42px;padding:0 16px;border-radius:12px;background:#09191C;color:#FFFFFF;font-size:14px;font-weight:600">Create free account</span>
  </div>
  <div style="text-align:center;padding-top:42px">
    <div class="h" style="font-size:64px;line-height:0.98;letter-spacing:-0.045em"><span style="display:inline-block">Every invoice,</span><br><span style="display:inline-block">all the way to paid.</span></div>
    <p style="margin:18px auto 0;font-size:16px;line-height:1.6;color:#3E4F51;max-width:30em">Write invoices in your own colours, send them in a click, and see where each one is until the money lands.</p>
  </div>
</div>"""

app_bars = f"""
<div style="display:flex;flex-direction:column;gap:12px">
  <div class="tile" style="height:74px;background:#FFFFFF;display:flex;align-items:center;gap:36px;padding:0 28px">
    {svg(A, 26)}
    <span style="display:flex;gap:6px;font-size:14px;font-weight:600"><span style="padding:9px 14px;border-radius:10px;background:#09191C;color:#FFFFFF">Dashboard</span><span style="padding:9px 14px;color:#56676A">Invoices</span><span style="padding:9px 14px;color:#56676A">Clients</span><span style="padding:9px 14px;color:#56676A">Items</span></span>
    <span style="margin-left:auto;display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:12px;background:#09191C;color:#FFFFFF;font-size:14px;font-weight:600">New invoice</span>
  </div>
  <div class="tile" style="height:74px;background:#09191C;display:flex;align-items:center;gap:36px;padding:0 28px">
    {svg(A, 26, ink=WHITE, dark=True)}
    <span style="display:flex;gap:6px;font-size:14px;font-weight:600"><span style="padding:9px 14px;border-radius:10px;background:#FFFFFF;color:#09191C">Dashboard</span><span style="padding:9px 14px;color:#9AABA8">Invoices</span><span style="padding:9px 14px;color:#9AABA8">Clients</span><span style="padding:9px 14px;color:#9AABA8">Items</span></span>
    <span style="margin-left:auto;display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:12px;background:#CFF26A;color:#09191C;font-size:14px;font-weight:700">New invoice</span>
  </div>
</div>"""

small_uses = f"""
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
  <div class="tile" style="height:220px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">
    <span style="display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:10px 10px 0 0;background:#ECEFED;box-shadow:inset 0 -2px 0 #D6DDDB;font-size:13px;width:230px;box-sizing:border-box">{icon_glyph(A, 16, radius=4)}<span style="flex:1">Invoices, Invoica</span><span style="color:#56676A">&#215;</span></span>
  </div>
  <div class="tile" style="height:220px;background:linear-gradient(160deg,#1D3C5A,#0C3D40);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
    {icon_glyph(A, 76, radius=18)}
    <span style="font-size:12px;color:#FFFFFF">Invoica</span>
  </div>
  <div class="tile" style="height:220px;background:#ECEFED;box-shadow:inset 0 0 0 1px #D6DDDB;display:flex;align-items:center;justify-content:center">
    <div style="width:280px;border-radius:14px;background:#FFFFFF;overflow:hidden;box-shadow:0 18px 40px -24px rgba(9,25,28,0.35)">
      <div style="padding:16px 18px;font-size:13px;line-height:1.55;color:#3E4F51">Please find attached invoice INV-0044 for <strong class="num" style="color:#09191C">£2,280.00</strong>, due on 3 November 2026.</div>
      <div style="padding:11px 18px;background:#F7F9F8;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#56676A"><span>Sent with</span>{svg(A, 15)}</div>
    </div>
  </div>
</div>"""

dots = f"""
<div class="row" style="grid-template-columns:1fr 1fr">
  <div class="tile" style="height:170px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">{svg(A, 70)}</div>
  <div class="tile" style="height:170px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">{svg(A, 70, dot=GREEN)}</div>
</div>"""

in_use = f"""
  <section class="sec">
    <h2>A, in use</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      {hero}
      <p class="cap" style="margin-top:0">On the website the name sits in the header at 30 pixels, and the headline does the talking.</p>
      <div style="margin-top:20px">{app_bars}</div>
      <p class="cap" style="margin-top:0">The app's top bar, light and dark. On dark the green of the fold turns brighter, as the sheet's fold does.</p>
      <div style="margin-top:20px">{small_uses}</div>
      <p class="cap" style="margin-top:0">Where a square is needed, the folded v stands alone: the browser tab, the phone's home screen. The foot of every email carries the name.</p>
      <div style="margin-top:20px">{dots}</div>
      <p class="cap" style="margin-top:0"><strong>The dots:</strong> Night on the left, green on the right as in the picture you found. I would keep them Night, so the fold is the only colour in the name and it lands harder; green dots make it friendlier and busier.</p>
    </div>
  </section>
"""

html = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Invoica, round 4: the fold in the name</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@100..900&amp;family=Sora:wght@100..800&amp;display=swap">
<style>{CSS}</style>
</helmet>
<div style="width: 1440px; box-sizing: border-box; padding: 64px 80px 80px; background: #ECEFED; color: #09191C; font-family: Onest, sans-serif; display: flex; flex-direction: column; gap: 48px">
  <header style="display: flex; align-items: flex-end; justify-content: space-between; gap: 40px">
    {svg(A, 120)}
    <div style="text-align: right">
      <div class="h" style="font-size: 26px">Design direction, round 4</div>
      <div style="font-size: 15px; color: #56676A; margin-top: 6px">The fold inside the name</div>
    </div>
  </header>
  <p class="cap" style="margin:-24px 0 0;font-size:15px;max-width:52em">Drawn from Sora ExtraBold, the typeface of the headings, so the name and the page belong together. The ç and the full stop are gone: the fold is the one idea in the name, and two would compete.</p>
{options}
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
open(f'{out_dir}/R4Wordmark.dc.html', 'w').write(html)
print('written')
