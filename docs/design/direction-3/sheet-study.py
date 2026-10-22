"""Writes the round 4 study board: the name on its own, and the sheet as Invoica's artefact."""
import math
import random
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
H_RATIO = 1.414  # A4
F_RATIO = 0.24   # the fold, as a share of the width

FOLDS = {
    'blend': [('0', '#CFF26A'), ('0.45', '#37C66B'), ('0.75', '#6CE4A2'), ('1', '#138C86')],
    'lime': [('0', '#E4FA9C'), ('1', '#B9E04A')],
    'mint': [('0', '#C4F6DA'), ('1', '#6CE4A2')],
    'teal': [('0', '#3FBDB0'), ('1', '#0E6F6A')],
    'coral': [('0', '#FFC2B8'), ('1', '#FF8A78')],
    'paper': [('0', '#EEF2F1'), ('1', '#CDD7D4')],
    'night': [('0', '#3A575B'), ('1', '#09191C')],
}
_ids = [0]


def uid(p):
    _ids[0] += 1
    return f'{p}{_ids[0]}'


def sheet(w, body='#FFFFFF', fold='blend', stroke=None, sw=1.0, fold_opacity=1.0, shadow=True, style='', flap_shadow=True):
    """A sheet in A4 proportion with its top right corner turned; the underside of the fold carries colour."""
    h = w * H_RATIO
    f = w * F_RATIO
    r = w * 0.035
    pad = w * 0.06
    g = uid('g')
    blur = uid('b')
    stops = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in FOLDS[fold])
    body_d = (f'M{r:.1f},0 H{w - f:.1f} L{w:.1f},{f:.1f} V{h - r:.1f} Q{w:.1f},{h:.1f} {w - r:.1f},{h:.1f} '
              f'H{r:.1f} Q0,{h:.1f} 0,{h - r:.1f} V{r:.1f} Q0,0 {r:.1f},0 Z')
    tip = f * 0.09
    flap_d = f'M{w - f:.1f},0 V{f - tip:.1f} Q{w - f:.1f},{f:.1f} {w - f + tip:.1f},{f:.1f} H{w:.1f} Z'
    sh = ''
    if flap_shadow:
        sh = (f'<path d="M{w - f:.1f},0 V{f:.1f} H{w:.1f} Z" transform="translate({-f * 0.07:.1f},{f * 0.09:.1f})" '
              f'fill="#09191C" fill-opacity="0.16" filter="url(#{blur})"/>')
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    filt = 'filter: drop-shadow(0 10px 18px rgba(9,25,28,0.10)) drop-shadow(0 1px 2px rgba(9,25,28,0.08));' if shadow else ''
    return (f'<svg viewBox="{-pad:.1f} {-pad:.1f} {w + 2 * pad:.1f} {h + 2 * pad:.1f}" width="{w + 2 * pad:.0f}" height="{h + 2 * pad:.0f}" '
            f'aria-hidden="true" style="display:block;overflow:visible;{filt}{style}">'
            f'<defs><linearGradient id="{g}" x1="1" y1="0" x2="0" y2="1">{stops}</linearGradient>'
            f'<filter id="{blur}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{max(1.0, f * 0.06):.1f}"/></filter></defs>'
            f'<path d="{body_d}" fill="{body}"{st} stroke-linejoin="round"/>'
            f'<clipPath id="{g}c"><path d="{body_d}"/></clipPath><g clip-path="url(#{g}c)">{sh}</g>'
            f'<path d="{flap_d}" fill="url(#{g})" fill-opacity="{fold_opacity}"/>'
            f'</svg>')


def placed(x, y, w, rot, **kw):
    return f'<div style="position:absolute;left:{x}px;top:{y}px;transform:rotate({rot}deg)">{sheet(w, **kw)}</div>'


def icon(size, radius, font, bg='#09191C', ink='#FFFFFF', dot='#6CE4A2', pb=None):
    pb = pb if pb is not None else max(1, round(size * 0.05))
    return (f'<span style="width:{size}px;height:{size}px;border-radius:{radius}px;background:{bg};display:inline-flex;align-items:center;justify-content:center;flex:none">'
            f'<span class="mono" style="font-size:{font}px;color:{ink};padding-bottom:{pb}px">i<span style="color:{dot}">.</span></span></span>')


def wm(size, ink='#09191C', dot='#37C66B'):
    return f'<span class="wm" style="font-size:{size}px;line-height:1;color:{ink}">invoiça<span style="color:{dot}">.</span></span>'


CSS = """
body{margin:0;background:#ECEFED}
.h{font-family:Sora,sans-serif;font-weight:800;letter-spacing:-0.03em;text-wrap:balance}
.num{font-variant-numeric:tabular-nums}
.wm{font-family:Sora,sans-serif;font-weight:800;letter-spacing:-0.02em;white-space:nowrap}
.mono{font-family:Sora,sans-serif;font-weight:800;letter-spacing:-0.02em;line-height:1}
.sec{display:grid;grid-template-columns:200px minmax(0,1fr);gap:40px;border-top:1px solid #D6DDDB;padding-top:28px}
.sec>h2{margin:0;font-family:Sora,sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.03em}
.cap{font-size:13px;color:#56676A;margin-top:10px;line-height:1.5;max-width:44em}
.cap strong{color:#09191C;font-weight:600}
.tile{position:relative;border-radius:22px;overflow:hidden}
.two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.fold{--f:76px;clip-path:polygon(0 0,calc(100% - var(--f)) 0,100% var(--f),100% 100%,0 100%)}
.flap{position:absolute;top:0;right:0;width:var(--f);height:var(--f);clip-path:polygon(0 0,0 100%,100% 100%);border-bottom-left-radius:7px;background:linear-gradient(to bottom left,#CFF26A,#37C66B 45%,#6CE4A2 75%,#138C86)}
.lab{font-size:12.5px;color:rgba(255,255,255,0.66)}
.val{font-family:Sora,sans-serif;font-weight:700;font-size:20px;letter-spacing:-0.02em;margin-top:3px}
.pill{display:inline-block;padding:4px 9px;border-radius:6px;font-size:12.5px;font-weight:600}
.glass{border-radius:16px;background:rgba(255,255,255,0.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,0.16);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.scr{position:absolute;width:560px;border-radius:14px;box-shadow:0 0 0 1px rgba(9,25,28,0.08)}
.shade{position:absolute;width:560px;height:350px;border-radius:14px;background:rgba(9,25,28,0.22);filter:blur(26px)}
"""

# ---------- the name ----------
name = f"""
  <section class="sec">
    <h2>The name</h2>
    <div>
      <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:20px">
        <div class="tile" style="height:200px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">{wm(84)}</div>
        <div class="tile" style="height:200px;background:#09191C;display:flex;align-items:center;justify-content:center">{wm(64, '#FFFFFF', '#6CE4A2')}</div>
      </div>
      <p class="cap"><strong>The name is the logo.</strong> No symbol beside it. In the app's top bar, on the website and on emails it stands alone, Night on light grounds and white on dark, with the full stop in your green.</p>
      <div style="display:grid;grid-template-columns:auto 1px auto 1px auto;justify-content:space-between;align-items:center;margin-top:22px;padding:24px 40px;border-radius:22px;background:#FFFFFF"><span style="display:flex;align-items:center;gap:22px">
        {icon(120, 28, 66, pb=7)}
        {icon(64, 15, 35, pb=4)}
        {icon(32, 8, 18, pb=2)}
        {icon(16, 4, 10, pb=1)}</span>
        <span style="width:1px;align-self:stretch;background:#E3E8E6"></span>
        <span style="display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:10px 10px 0 0;background:#ECEFED;box-shadow:inset 0 -2px 0 #D6DDDB;font-size:13px;width:230px;box-sizing:border-box">{icon(16, 4, 10, pb=1)}<span style="flex:1">Invoices, Invoica</span><span style="color:#56676A">&#215;</span></span>
        <span style="width:1px;align-self:stretch;background:#E3E8E6"></span>
        <span style="display:inline-flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:#56676A">{icon(56, 13, 31, pb=3)}Invoica</span>
      </div>
      <p class="cap"><strong>Where a square is needed,</strong> the i. is cut from the name: the app icon, the browser tab, a phone's home screen, the small mark at the foot of an invoice. It is the first letter of the wordmark, so it is still the name.</p>
    </div>
  </section>
"""

# ---------- the sheet ----------
family = [
    ('#FFFFFF', 'blend', None, 'White and the blend'),
    ('#FFFFFF', 'lime', None, 'White and lime'),
    ('#FFFFFF', 'teal', None, 'White and teal'),
    ('#F4F7F6', 'mint', '#D6DDDB', 'Mist and mint'),
    ('#CFF26A', 'teal', None, 'Lime and teal'),
    ('#09191C', 'blend', None, 'Night and the blend'),
]
fam = ''.join(
    f'<figure style="margin:0;display:flex;flex-direction:column;align-items:center;gap:10px">{sheet(92, body=b, fold=f, stroke=s)}'
    f'<figcaption style="font-size:12px;color:#56676A">{c}</figcaption></figure>'
    for b, f, s, c in family)

sheet_sec = f"""
  <section class="sec">
    <h2>The sheet</h2>
    <div>
      <div style="display:grid;grid-template-columns:400px minmax(0,1fr);gap:20px">
        <div class="tile" style="height:420px;background:#FFFFFF;display:flex;align-items:center;padding-left:92px">
          <div style="position:relative">
            {sheet(180)}
            <span style="position:absolute;left:100%;top:18px;margin-left:4px;width:84px;font-size:12px;line-height:1.4;color:#56676A">The fold, a quarter of the width</span>
            <span style="position:absolute;right:100%;bottom:22px;margin-right:4px;width:76px;text-align:right;font-size:12px;line-height:1.4;color:#56676A">A4 in proportion</span>
          </div>
        </div>
        <div class="tile" style="height:420px;background:#ECEFED;box-shadow:inset 0 0 0 1px #D6DDDB;display:flex;flex-direction:column;justify-content:center;padding:0 28px">
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));row-gap:22px;column-gap:12px">{fam}</div>
        </div>
      </div>
      <p class="cap"><strong>An invoice is a sheet that goes to a client,</strong> so the sheet is the artefact. It is always drawn the same way: A4 in proportion, the top right corner turned, and the underside of the fold in colour, which is where the blend shows. The family on the right is the full set of combinations; most places use white with the blend.</p>
    </div>
  </section>
"""

# ---------- applications ----------
owed = f"""
<div class="tile fold" style="--f:84px;height:470px;background:#09191C;background-image:radial-gradient(80% 70% at 0% 0%, rgba(55,198,107,0.22), transparent 60%);color:#FFFFFF;padding:30px 30px 28px;box-sizing:border-box">
  <span class="flap" aria-hidden="true"></span>
  <div style="font-size:14px;color:rgba(255,255,255,0.72)">Owed to you</div>
  <div class="h num" style="font-size:64px;line-height:1;margin-top:10px;letter-spacing:-0.045em">£6,420<span style="font-size:0.42em;color:rgba(255,255,255,0.6);letter-spacing:0">.00</span></div>
  <div style="font-size:14px;color:rgba(255,255,255,0.72);margin-top:8px">5 invoices with clients</div>
  <div class="num" style="display:grid;grid-template-columns:4180fr 2240fr;column-gap:6px;margin-top:30px">
    <div style="height:12px;border-radius:3px;background:linear-gradient(90deg,#CFF26A,#6CE4A2)"></div>
    <div style="height:12px;border-radius:3px;background:#FF8A78"></div>
    <div style="padding-top:12px"><div class="lab">Not due yet</div><div class="val">£4,180.00</div></div>
    <div style="padding-top:12px"><div class="lab" style="color:#FF9C8C;font-weight:600">Overdue</div><div class="val">£2,240.00</div></div>
  </div>
  <div class="num" style="display:grid;grid-template-columns:4180fr 2240fr;column-gap:6px;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12)">
    <div><div class="lab">Paid in the last 30 days</div><div class="val">£8,950.00</div></div>
    <div><div class="lab">Drafts, not sent</div><div class="val">£1,280.00</div></div>
  </div>
  <a href="#" style="display:inline-flex;align-items:center;height:48px;padding:0 20px;margin-top:26px;border-radius:13px;background:#CFF26A;color:#09191C;font-size:15px;font-weight:700;text-decoration:none">Chase the two overdue</a>
</div>"""

status = [
    ('Draft', 'paper', '#FFFFFF', '#E3E9E7', '#09191C', 'outline'),
    ('Sent', 'night', '#FFFFFF', '#E3E9E7', '#09191C', ''),
    ('Overdue', 'coral', '#FFFFFF', '#FBE5E2', '#A8281E', ''),
    ('Paid', 'blend', '#FFFFFF', '#DCF5E6', '#0E6B3A', ''),
]


def mini_invoice(label, fold, pill_bg, pill_ink, outline):
    st = '#C9D2CF' if outline else None
    lines = ''.join(f'<span style="display:block;height:3px;border-radius:2px;background:#E3E8E6;width:{w}%;margin-top:6px"></span>' for w in (70, 54, 62))
    return (f'<figure style="margin:0;display:flex;flex-direction:column;align-items:center;gap:12px">'
            f'<div style="position:relative">{sheet(96, fold=fold, stroke=st, sw=1.2, shadow=not outline)}'
            f'<div style="position:absolute;left:18px;top:22px;width:50px"><span style="display:block;height:5px;border-radius:2px;background:#1D3C5A;width:60%"></span>{lines}</div>'
            f'<div class="num" style="position:absolute;left:16px;right:16px;bottom:20px;text-align:right;font-size:10px;font-weight:700">£1,440.00</div></div>'
            f'<span class="pill" style="background:{pill_bg};color:{pill_ink}{";box-shadow:inset 0 0 0 1px #C9D2CF;background:#FFFFFF" if outline else ""}">{label}</span></figure>')


status_tile = f"""
<div class="tile" style="height:470px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">
  <div style="display:grid;grid-template-columns:repeat(4,auto);gap:18px;align-items:end">{''.join(mini_invoice(l, f, pb, pi, o == 'outline') for l, f, _, pb, pi, o in status)}</div>
</div>"""

empty = f"""
<div class="tile" style="height:440px;background:#FFFFFF;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 40px">
  <div style="position:relative;width:170px;height:170px">
    <div style="position:absolute;left:14px;top:12px;transform:rotate(-8deg)">{sheet(92, body='#ECEFED', fold='paper', stroke='#D6DDDB', shadow=False, flap_shadow=False)}</div>
    <div style="position:absolute;left:52px;top:0">{sheet(100)}</div>
  </div>
  <div class="h" style="font-size:24px;margin-top:18px">No invoices yet</div>
  <p style="margin:8px 0 0;font-size:15px;line-height:1.55;color:#3E4F51;max-width:22em">Your first one takes a few minutes, and it stays a draft until you issue it.</p>
  <a href="#" style="display:inline-flex;align-items:center;height:46px;padding:0 20px;margin-top:20px;border-radius:12px;background:#09191C;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none">Write an invoice</a>
</div>"""

hero = """
<div class="tile" style="height:500px;background:#ECEFED;box-shadow:inset 0 0 0 1px #D6DDDB;perspective:4200px;perspective-origin:50% 20%">
  <div style="position:absolute;left:50%;top:-330px;width:2000px;height:1150px;margin-left:-1000px;transform:scale(0.44) rotateX(55deg) rotateZ(-20deg);transform-style:preserve-3d">
    <div class="fold" style="--f:300px;position:absolute;inset:0;border-radius:44px;background:#FFFFFF;overflow:hidden">
      <span class="flap" style="border-bottom-left-radius:24px" aria-hidden="true"></span>
      <svg viewBox="0 0 2000 1150" width="2000" height="1150" style="position:absolute;inset:0">
        <defs><linearGradient id="hrr" gradientUnits="userSpaceOnUse" x1="120" x2="1880" y1="0" y2="0"><stop offset="0" stop-color="#CFF26A"></stop><stop offset="0.45" stop-color="#37C66B"></stop><stop offset="0.75" stop-color="#6CE4A2"></stop><stop offset="1" stop-color="#138C86"></stop></linearGradient></defs>
        <path d="M100 900 H1900" stroke="url(#hrr)" stroke-width="14" stroke-linecap="round" fill="none"></path>
        <circle cx="440" cy="900" r="26" fill="#FFFFFF" stroke="#09191C" stroke-width="9"></circle>
        <circle cx="1030" cy="900" r="26" fill="#09191C"></circle>
        <circle cx="1620" cy="900" r="36" fill="#CFF26A" stroke="#09191C" stroke-width="9"></circle>
        <path d="M1604 900 l12 12 l20 -24" fill="none" stroke="#09191C" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path>
        <g font-family="Sora, sans-serif" font-weight="800" font-size="46" fill="#09191C" text-anchor="middle"><text x="440" y="985">Write</text><text x="1030" y="985">Send</text><text x="1620" y="1000">Get paid</text></g>
      </svg>
      <div class="shade" style="left:160px;top:440px;transform:translate(24px,30px)"></div>
      <img class="scr" src="/_blob/09a270c1c2bbbf6a46de8798609d8465" alt="" style="left:160px;top:440px">
      <div class="shade" style="left:750px;top:320px;transform:translate(24px,30px)"></div>
      <img class="scr" src="/_blob/c7e35f1502cd64e329bb2686e6368ac6" alt="" style="left:750px;top:320px">
      <div class="shade" style="left:1340px;top:200px;transform:translate(24px,30px)"></div>
      <img class="scr" src="/_blob/79e823cc9e63dc5019fa034d7216bdf7" alt="" style="left:1340px;top:200px">
    </div>
  </div>
</div>"""

# light watermark: the website's closing card, quiet sheets running off the right edge
random.seed(7)
quiet = [
    (800, 34, 170, 9, 'mint'), (640, 70, 210, -7, 'blend'), (880, 250, 130, -13, 'lime'),
]
quiet_html = ''.join(placed(x, y, w, r, body='#FFFFFF', fold=f, stroke='#C9D3D0', sw=1, shadow=False, flap_shadow=False) for x, y, w, r, f in quiet)
light_wm = f"""
<div class="tile" style="height:400px;background:#FFFFFF">
  {quiet_html}
  <div style="position:relative;padding:72px 64px;max-width:440px">
    <div class="h" style="font-size:44px;line-height:1.06"><span style="display:inline-block">Start with</span> <span style="display:inline-block">your next invoice.</span></div>
    <p style="margin:18px 0 0;font-size:17px;line-height:1.6;color:#3E4F51">Invoica is free while it is in early access. Setting up takes a few minutes.</p>
    <a href="#" style="display:inline-flex;align-items:center;height:52px;padding:0 22px;margin-top:24px;border-radius:14px;background:#09191C;color:#FFFFFF;font-size:16px;font-weight:600;text-decoration:none">Create your free account</a>
  </div>
</div>"""

# dark watermark: the sign-in panel, faint sheets with the event cards over them
dark_sheets = [
    (640, -40, 260, 6, 'blend', 0.9), (430, 255, 150, -10, 'teal', 0.85), (890, 330, 120, -6, 'mint', 0.8),
]
dark_html = ''.join(placed(x, y, w, r, body='rgba(255,255,255,0.025)', fold=f, fold_opacity=o, stroke='rgba(255,255,255,0.16)', sw=1, shadow=False, flap_shadow=False) for x, y, w, r, f, o in dark_sheets)
dark_wm = f"""
<div class="tile" style="height:400px;background:#09191C;background-image:radial-gradient(60% 80% at 75% 40%, rgba(55,198,107,0.20), transparent 70%);color:#FFFFFF">
  {dark_html}
  <div style="position:relative;padding:64px;max-width:420px">
    <div class="h" style="font-size:40px;line-height:1.06"><span style="display:inline-block">Every invoice,</span> <span style="display:inline-block">all the way to paid.</span></div>
    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.72)">Written, sent, reminded and paid, in one place.</p>
  </div>
  <div style="position:absolute;right:64px;top:84px;display:flex;flex-direction:column;gap:12px;width:330px">
    <div class="glass num" style="padding:16px 18px;display:flex;justify-content:space-between;align-items:center"><span><span style="display:block;font-size:12.5px;color:rgba(255,255,255,0.66)">Just now</span><strong style="font-size:15px">Ashby Print Co paid</strong></span><strong class="h" style="font-size:20px;letter-spacing:-0.02em">£1,960.00</strong></div>
    <div class="glass num" style="padding:16px 18px;display:flex;justify-content:space-between;align-items:center;margin-left:-40px;margin-right:40px"><span><span style="display:block;font-size:12.5px;color:rgba(255,255,255,0.66)">Today, 09:41</span><strong style="font-size:15px">INV-0044 sent</strong></span><strong class="h" style="font-size:20px;letter-spacing:-0.02em">£2,280.00</strong></div>
    <div class="glass num" style="padding:16px 18px;display:flex;justify-content:space-between;align-items:center"><span><span style="display:block;font-size:12.5px;color:rgba(255,255,255,0.66)">Sunday, 09:00</span><strong style="font-size:15px">Fennick &amp; Shaw reminded</strong></span><strong class="h" style="font-size:20px;letter-spacing:-0.02em">£800.00</strong></div>
  </div>
</div>"""

email = f"""
<div class="tile" style="height:440px;background:#ECEFED;box-shadow:inset 0 0 0 1px #D6DDDB;display:flex;align-items:center;justify-content:center">
  <div style="width:400px;border-radius:18px;background:#FFFFFF;overflow:hidden;box-shadow:0 1px 2px rgba(9,25,28,0.08),0 24px 50px -28px rgba(9,25,28,0.35)">
    <div style="padding:16px 20px;border-bottom:1px solid #E3E8E6;display:grid;grid-template-columns:58px minmax(0,1fr);row-gap:6px;font-size:13px">
      <span style="color:#56676A">From</span><strong>Linden &amp; Rowe Studio</strong>
      <span style="color:#56676A">Subject</span><strong>Invoice INV-0044 from Linden &amp; Rowe Studio</strong>
    </div>
    <div style="padding:18px 20px;font-size:14px;line-height:1.6;color:#3E4F51">
      <p style="margin:0">Hello, please find attached invoice INV-0044 for <strong class="num" style="color:#09191C">£2,280.00</strong>, due on 3 November 2026.</p>
      <div style="display:inline-flex;align-items:center;gap:10px;margin-top:14px;padding:8px 14px 8px 10px;border-radius:12px;background:#F1F4F3;font-size:13.5px;color:#09191C">{sheet(26, shadow=False, flap_shadow=False, stroke='#B9C5C1', sw=0.9)}INV-0044.pdf</div>
    </div>
    <div style="padding:12px 20px;background:#F7F9F8;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#56676A"><span>Sent with</span>{wm(15)}</div>
  </div>
</div>"""

uses = f"""
  <section class="sec">
    <h2>Where it goes</h2>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="two">{owed}{status_tile}</div>
      <div class="two"><p class="cap" style="margin-top:2px"><strong>On money and documents.</strong> The owed card turns its corner, in place of the coils. The same fold goes on the invoice preview in the editor and on the invoice's own page.</p><p class="cap" style="margin-top:2px"><strong>Possible: the fold carries the status</strong> on an invoice's own page. Paper while it is a draft, Night once sent, coral when overdue, the blend once paid. Lists keep their labels, which read faster.</p></div>
      <div style="margin-top:20px">{hero}</div>
      <p class="cap" style="margin-top:2px"><strong>The website's big sheet</strong> turns its corner too, so the hero is an invoice with the app standing on it.</p>
      <div class="two" style="margin-top:20px">{empty}{email}</div>
      <div class="two"><p class="cap" style="margin-top:2px"><strong>Empty screens</strong> show a sheet waiting to be written, with the one action that fills it.</p><p class="cap" style="margin-top:2px"><strong>Wherever a document is named,</strong> its icon is the sheet: the PDF on an email, an export, an attachment. The email's foot carries the name on its own.</p></div>
      <div style="margin-top:20px">{light_wm}</div>
      <p class="cap" style="margin-top:2px"><strong>As a watermark on light grounds:</strong> sheets drawn in a fine line with only the folds in colour, a loose stack running off the edge. Only behind large type and buttons, never behind small text, and one cluster per page.</p>
      <div style="margin-top:20px">{dark_wm}</div>
      <p class="cap" style="margin-top:2px"><strong>On dark grounds:</strong> faint outlined sheets where only the folds catch the light, behind the sign-in panel's glass cards, which keep carrying the real events.</p>
    </div>
  </section>
"""

html = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Invoica, round 4: the name and the sheet</title>
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
    {wm(112)}
    <div style="text-align: right">
      <div class="h" style="font-size: 26px">Design direction, round 4</div>
      <div style="font-size: 15px; color: #56676A; margin-top: 6px">The name on its own, and the sheet as the artefact</div>
    </div>
  </header>
{name}
{sheet_sec}
{uses}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1440,"height":HEIGHT}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{}};
  }}
}}
</script>
</body>
</html>
"""
height = sys.argv[2] if len(sys.argv) > 2 else '3200'
(OUT / 'R4Sheet.dc.html').write_text(html.replace('HEIGHT', height))
print('written')
