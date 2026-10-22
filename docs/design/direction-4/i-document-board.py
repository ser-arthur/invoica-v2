"""Writes the round 4 board on the i as a document: four ways to draw it, and the recommended one in use."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i_document import wordmark, icon, NIGHT, WHITE  # noqa: E402

out_dir, height = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else '4200')
REC = 'flight'

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
.badge{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:7px;background:#CFF26A;font-size:12.5px;font-weight:700}
.opt{display:flex;align-items:center;gap:12px;margin:0 0 14px}
.opt h3{margin:0;font-family:Sora,sans-serif;font-weight:800;font-size:20px;letter-spacing:-0.02em}
.link{color:#56676A}
"""


def option(key, title, verdict, recommended=False):
    badge = '<span class="badge">Recommended</span>' if recommended else ''
    return f"""
      <div>
        <div class="opt"><h3>{title}</h3>{badge}</div>
        <div class="row">
          <div class="tile" style="height:250px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">{wordmark(key, 128)}</div>
          <div class="tile" style="height:250px;background:#09191C;display:flex;align-items:center;justify-content:center">{wordmark(key, 74, ink=WHITE, dark=True)}</div>
        </div>
        <div class="strip">
          <div class="bar">{wordmark(key, 28)}<span class="link">Dashboard</span><span class="link">Invoices</span><span class="link">Clients</span></div>
          <span style="display:flex;align-items:center;gap:14px">{wordmark(key, 18)}<span style="font-size:12px;color:#56676A">at 18 pixels</span></span>
          <span style="display:flex;align-items:center;gap:14px">{icon(key, 88)}{icon(key, 40, radius=10)}{icon(key, 20, radius=5)}</span>
        </div>
        <p class="cap">{verdict}</p>
      </div>"""


header = f"""
  <header style="display:flex;align-items:flex-end;justify-content:space-between;gap:40px">
    {wordmark(REC, 140)}
    <div style="text-align:right">
      <div class="h" style="font-size:26px">Design direction, round 4</div>
      <div style="font-size:15px;color:#56676A;margin-top:6px">The i as a document</div>
    </div>
  </header>
  <p class="cap" style="margin:-22px 0 0;font-size:15px;max-width:54em">The n, v, o, c and a are Sora ExtraBold, untouched. Only the i changes, in both places it appears, so the name carries two small documents and the v goes back to an ordinary letter.</p>
"""

options = f"""
  <section class="sec">
    <h2>Four ways</h2>
    <div style="display:flex;flex-direction:column;gap:44px">
      {option('flight', 'A. The page in flight', '<strong>The dot is a small green page with its corner turned, tipped forward as if it is on its way.</strong> It reads as an i at every size, because at 18 pixels the page is simply a green dot, and as an invoice going out whenever it is large enough to see. On its own the i is the app icon. The liveliest of the four.', True)}
      {option('note', 'B. The note', '<strong>The same page standing still, cut square.</strong> Calmer, and close to the green square full stop of the old wordmark. It reads well everywhere; it has less to say than A.')}
      {option('tall', 'C. The tall sheet', '<strong>The stem and a square dot of the same width, so the whole i is one long slip with its corner turned, cut once by the gap.</strong> The cleverest drawing and the closest to the sheet. The green is only the corner, so below 30 pixels it reads as a plain i.')}
      {option('slip', 'D. The slip', '<strong>The stem is a wide slip with its top corner turned, under a round green dot.</strong> The earlier idea, with a bigger fold. Clear when large; in the top bar the fold is a speck.')}
    </div>
  </section>
"""

site = f"""
<div class="tile" style="height:360px;background:#FFFFFF">
  <div style="display:flex;align-items:center;justify-content:space-between;height:84px;padding:0 40px">
    {wordmark(REC, 36, flat=False)}
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
    {wordmark(REC, 30)}
    <span style="display:flex;gap:6px;font-size:14px;font-weight:600"><span style="padding:9px 14px;border-radius:10px;background:#09191C;color:#FFFFFF">Dashboard</span><span style="padding:9px 14px;color:#56676A">Invoices</span><span style="padding:9px 14px;color:#56676A">Clients</span><span style="padding:9px 14px;color:#56676A">Items</span></span>
    <span style="margin-left:auto;display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:12px;background:#09191C;color:#FFFFFF;font-size:14px;font-weight:600">New invoice</span>
  </div>
  <div class="tile" style="height:74px;background:#09191C;display:flex;align-items:center;gap:36px;padding:0 28px">
    {wordmark(REC, 30, ink=WHITE, dark=True)}
    <span style="display:flex;gap:6px;font-size:14px;font-weight:600"><span style="padding:9px 14px;border-radius:10px;background:#FFFFFF;color:#09191C">Dashboard</span><span style="padding:9px 14px;color:#9AABA8">Invoices</span><span style="padding:9px 14px;color:#9AABA8">Clients</span><span style="padding:9px 14px;color:#9AABA8">Items</span></span>
    <span style="margin-left:auto;display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:12px;background:#CFF26A;color:#09191C;font-size:14px;font-weight:700">New invoice</span>
  </div>
</div>"""

smalls = f"""
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
  <div class="tile" style="height:230px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">
    <span style="display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:10px 10px 0 0;background:#ECEFED;box-shadow:inset 0 -2px 0 #D6DDDB;font-size:13px;width:230px;box-sizing:border-box">{icon(REC, 16, radius=4)}<span style="flex:1">Invoices, Invoica</span><span style="color:#56676A">&#215;</span></span>
  </div>
  <div class="tile" style="height:230px;background:linear-gradient(160deg,#16443F,#09191C 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
    {icon(REC, 78, radius=18)}
    <span style="font-size:12px;color:#FFFFFF">Invoica</span>
  </div>
  <div class="tile" style="height:230px;background:#ECEFED;box-shadow:inset 0 0 0 1px #D6DDDB;display:flex;align-items:center;justify-content:center">
    <div style="width:286px;border-radius:14px;background:#FFFFFF;overflow:hidden;box-shadow:0 18px 40px -24px rgba(9,25,28,0.35)">
      <div style="padding:16px 18px;font-size:13px;line-height:1.55;color:#3E4F51">Please find attached invoice INV-0044 for <strong class="num" style="color:#09191C">£2,280.00</strong>, due on 3 November 2026.</div>
      <div style="padding:11px 18px;background:#F7F9F8;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#56676A"><span>Sent with</span>{wordmark(REC, 18)}</div>
    </div>
  </div>
</div>"""

card = f"""
<div class="row" style="grid-template-columns:1fr 1fr">
  <div class="tile" style="height:300px;background:#E3E8E6;display:flex;align-items:center;justify-content:center">
    <div style="position:relative;width:340px;height:200px;border-radius:10px;background:#09191C;box-shadow:0 30px 50px -24px rgba(9,25,28,0.55);clip-path:polygon(0 0,100% 0,100% calc(100% - 58px),calc(100% - 58px) 100%,0 100%);overflow:hidden">
      <div style="position:absolute;left:28px;top:28px">{wordmark(REC, 46, ink=WHITE, dark=True, flat=False)}</div>
      <div style="position:absolute;left:28px;bottom:26px;font-size:12px;line-height:1.5;color:rgba(255,255,255,0.7)">Every invoice,<br>all the way to paid.</div>
      <span style="position:absolute;right:0;bottom:0;width:58px;height:58px;clip-path:polygon(0 0,100% 0,0 100%);border-top-left-radius:6px;background:linear-gradient(to top left,#E4FA9C,#46DA80 55%,#2FB866)"></span>
    </div>
  </div>
  <div class="tile" style="height:300px;background:#E3E8E6;display:flex;align-items:center;justify-content:center">
    <div style="position:relative;width:340px;height:200px;border-radius:10px;background:#FFFFFF;box-shadow:0 30px 50px -24px rgba(9,25,28,0.40);display:flex;flex-direction:column;justify-content:space-between;padding:28px;box-sizing:border-box">
      {icon(REC, 46, radius=11)}
      <div style="font-size:12px;line-height:1.6;color:#3E4F51">Invoicing for freelancers and small studios<br><strong style="color:#09191C">invoica.example</strong></div>
    </div>
  </div>
</div>"""

in_use = f"""
  <section class="sec">
    <h2>A, in use</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      {site}
      <p class="cap" style="margin-top:0">The website's header, with the name at 36 pixels.</p>
      <div style="margin-top:20px">{bars}</div>
      <p class="cap" style="margin-top:0">The app's top bar, light and dark. At this size the pages are green dots with a tilt.</p>
      <div style="margin-top:20px">{smalls}</div>
      <p class="cap" style="margin-top:0">Where a square is needed, the i stands alone: the browser tab and the phone's home screen. The foot of every email carries the name.</p>
      <div style="margin-top:20px">{card}</div>
      <p class="cap" style="margin-top:0">On a card the sheet's folded corner comes back, in the same greens as the page on the i.</p>
    </div>
  </section>
"""

html = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Invoica, round 4: the i as a document</title>
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
open(os.path.join(out_dir, 'R4IDocument.dc.html'), 'w').write(html)
print('written')
