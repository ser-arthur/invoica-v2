"""Writes the round 4 board comparing the slip on both i's with the slip on the first i alone."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i_document import wordmark, icon, WHITE  # noqa: E402

out_dir, height = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else '2200')

CSS = """
body{margin:0;background:#ECEFED}
.h{font-family:Sora,sans-serif;font-weight:800;letter-spacing:-0.03em}
.cap{font-size:13px;color:#56676A;margin:12px 0 0;line-height:1.5;max-width:46em}
.cap strong{color:#09191C;font-weight:600}
.tile{position:relative;border-radius:22px;overflow:hidden}
.row{display:grid;grid-template-columns:620px minmax(0,1fr);gap:20px}
.strip{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:12px;padding:18px 28px;border-radius:18px;background:#FFFFFF}
.bar{display:flex;align-items:center;gap:22px;height:56px;padding:0 18px;border-radius:14px;box-shadow:inset 0 0 0 1px #E3E8E6;font-size:13px;font-weight:600;color:#56676A}
.badge{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:7px;background:#CFF26A;font-size:12.5px;font-weight:700;color:#09191C}
.opt{display:flex;align-items:center;gap:12px;margin:0 0 14px}
.opt h3{margin:0;font-family:Sora,sans-serif;font-weight:800;font-size:20px;letter-spacing:-0.02em}
"""


def option(title, verdict, kw, recommended=False):
    badge = '<span class="badge">Recommended</span>' if recommended else ''
    return f"""
    <div>
      <div class="opt"><h3>{title}</h3>{badge}</div>
      <div class="row">
        <div class="tile" style="height:250px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">{wordmark('slip', 130, **kw)}</div>
        <div class="tile" style="height:250px;background:#09191C;display:flex;align-items:center;justify-content:center">{wordmark('slip', 76, ink=WHITE, dark=True, **kw)}</div>
      </div>
      <div class="strip">
        <div class="bar">{wordmark('slip', 28, **kw)}<span>Dashboard</span><span>Invoices</span><span>Clients</span></div>
        <span style="display:flex;align-items:center;gap:14px">{wordmark('slip', 18, **kw)}<span style="font-size:12px;color:#56676A">at 18 pixels</span></span>
        <span style="display:flex;align-items:center;gap:14px">{icon('slip', 88)}{icon('slip', 40, radius=10)}</span>
      </div>
      <p class="cap">{verdict}</p>
    </div>"""


body = f"""
  <header style="display:flex;align-items:flex-end;justify-content:space-between;gap:40px">
    {wordmark('slip', 140, second='ink')}
    <div style="text-align:right">
      <div class="h" style="font-size:26px">The slip: one i or two</div>
      <div style="font-size:15px;color:#56676A;margin-top:6px">Design direction, round 4</div>
    </div>
  </header>
  <div style="display:flex;flex-direction:column;gap:44px;padding-top:28px;border-top:1px solid #D6DDDB">
    {option('First i only, second dot dark', '<strong>The first i is the mark and the rest of the name is calm.</strong> All the colour sits in one place, the start of the word, and that i is exactly the app icon, so name and icon agree. The second i is a plain stem with an ordinary dot.', dict(second='ink'), True)}
    {option('First i only, second dot green', '<strong>The fold happens once; both dots stay green.</strong> Friendlier and more even across the word, but the green second dot invites the question of why it has no fold.', dict(second='green'))}
    {option("Both i's", "<strong>Both i's carry the slip.</strong> Consistent, but the fold starts to look like a quirk of the font, and the name gets busy.", dict())}
  </div>
"""

html = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Invoica, round 4: the slip, one i or two</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@100..900&amp;family=Sora:wght@100..800&amp;display=swap">
<style>{CSS}</style>
</helmet>
<div style="width:1440px;box-sizing:border-box;padding:64px 80px 80px;background:#ECEFED;color:#09191C;font-family:Onest,sans-serif;display:flex;flex-direction:column;gap:40px">
{body}
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
open(os.path.join(out_dir, 'R4Slip.dc.html'), 'w').write(html)
print('written')
