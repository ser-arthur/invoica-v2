"""How it works: five ways to draw the invoice's route down the margin, each as a looping mock of the section
scrolling past (16 seconds: each step comes up to the reading line, holds, and the page moves on)."""
from common import write, esc

W, H = 1440, 860
STEP = 560          # distance between steps, in content pixels
TOP = 120           # where step 1 starts in the content
READ = 150          # the reading line, in the viewport
SECS = 16

STEPS = [
    ('Write', '#5B8E14', '#EFF6CF', ['Look established', 'from the first line.'],
     'Your logo, colours and payment details go in once. Then type the work you did and the invoice lays itself out beside it.', 'editor-lines'),
    ('Issue', '#3F8A1E', '#E4F4D6', ['Numbered properly,', 'kept exactly as sent.'],
     'Issuing gives the invoice the next number in your sequence, with no gaps, and keeps its PDF just as it was.', 'invoice-paper'),
    ('Send', '#179A55', '#DAF1E3', ['In their inbox,', 'under your name.'],
     'Send it from Invoica with the PDF attached. It arrives from your business, and replies come straight to you.', None),
    ('Remind', '#118A6E', '#D4EEEA', ['Late payers,', 'followed up politely.'],
     'Choose when reminders go out and what they say. Each one goes on schedule and stops as soon as the invoice is paid.', 'chasing'),
    ('Get paid', '#0F7F7A', '#D2ECEB', ['Always know', 'where your money is.'],
     'Record payments in full or in parts as they come in. Your dashboard shows what you are owed and what has arrived.', 'dashboard'),
]
N = len(STEPS)

# keyframe stops: (percent, step index the page is resting on or moving to)
STOPS = [(0, 0), (6, 0), (18, 1), (25, 1), (37, 2), (44, 2), (56, 3), (63, 3), (75, 4), (92, 4), (100, 0)]
ARRIVE = {0: 0, 1: 18, 2: 37, 3: 56, 4: 75}   # percent at which each step reaches the reading line


def kf(name, fn):
    """A keyframes rule from the stops, with fn(step) giving the declarations at rest on that step."""
    frames = ''.join(f'{p}%{{{fn(k)}}}' for p, k in STOPS)
    return f'@keyframes {name}{{{frames}}}'


def scroll_css():
    return kf('scroll', lambda k: f'transform:translateY({-k * STEP}px)')


def fill_css(name, start, reach=30):
    """Height of a fill that grows with the reading line, in content pixels from `start`."""
    return kf(name, lambda k: f'height:{max(0, TOP + k * STEP + reach - start)}px')


def held(name, k, on, off):
    """On from step k's arrival to the end of the loop, off again when the page returns to the top."""
    a = ARRIVE[k]
    return f'@keyframes {name}{{0%,{max(a - 0.01, 0)}%{{{off}}}{a + 2}%,92%{{{on}}}100%{{{off}}}}}' if k else \
        f'@keyframes {name}{{0%,92%{{{on}}}100%{{{on}}}}}'


def panel(i):
    name, num, tint, head, lead, img = STEPS[i]
    if img == 'dashboard':
        inner = '<div class="pimg dash" style="background-image:url({{IMG:s-dashboard}})"></div>'
    elif img:
        inner = f'<img class="pimg" src="{{{{IMG:s-{img}}}}}" alt="">'
    else:
        inner = '''<div class="mail"><div class="mh"><b>Linden &amp; Rowe Studio</b><span>09:41</span></div>
<div class="ms">Invoice INV-0044 from Linden &amp; Rowe Studio</div>
<div class="mb">Hello Meridian team, please find invoice INV-0044 for £2,280.00 attached, due on 3 November.</div>
<div class="mpdf">INV-0044.pdf</div></div>'''
    return f'<div class="panel" style="background:{tint}">{inner}</div>'


def stage(margin_html, overlay_html='', extra_css='', text_left=200):
    steps = []
    for i, (name, num, tint, head, lead, img) in enumerate(STEPS):
        y = TOP + i * STEP
        steps.append(f'''<div class="step" style="top:{y}px">
  <div class="txt" style="left:{text_left}px">
    <div class="mk"><span class="num" style="color:{num}">{i + 1}</span><span class="nm">{esc(name)}</span></div>
    <h3 class="hd">{esc(head[0])}<br>{esc(head[1])}</h3>
    <p class="ld">{esc(lead)}</p>
  </div>
  {panel(i)}
</div>''')
    body = f'''<div class="vp">
  <div class="col">{margin_html}{''.join(steps)}</div>
  {overlay_html}
</div>'''
    css = f'''
.vp{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:#ecefed;font-family:'Onest',sans-serif;color:#09191c}}
.col{{position:absolute;left:0;top:0;width:{W}px;height:{TOP + N * STEP + 400}px;animation:scroll {SECS}s cubic-bezier(.45,.05,.35,1) infinite}}
.step{{position:absolute;left:0;width:{W}px;height:440px}}
.txt{{position:absolute;top:30px;width:430px}}
.mk{{display:flex;align-items:flex-end;gap:16px}}
.num{{font-family:'Sora';font-weight:800;font-size:76px;line-height:.78;letter-spacing:-.05em}}
.nm{{font-weight:700;font-size:17px;line-height:1;padding-bottom:2px}}
.hd{{font-family:'Sora';font-weight:800;font-size:40px;line-height:1.06;letter-spacing:-.035em;margin:22px 0 0}}
.ld{{font-size:18px;line-height:1.6;color:#2f403d;margin:18px 0 0}}
.panel{{position:absolute;left:720px;top:0;width:640px;height:440px;border-radius:28px;overflow:hidden;display:flex;align-items:center;justify-content:center}}
.pimg{{max-width:78%;max-height:84%;border-radius:12px;box-shadow:0 1px 2px rgb(9 25 28 / .1),0 30px 60px -28px rgb(9 25 28 / .4)}}
.pimg.dash{{width:86%;height:70%;background-size:180% auto;background-position:8% 26%;background-repeat:no-repeat;background-color:#ecefed}}
.mail{{width:440px;background:#fff;border-radius:18px;padding:22px 24px;box-shadow:0 1px 2px rgb(9 25 28 / .1),0 30px 60px -28px rgb(9 25 28 / .4);font-size:14px;line-height:1.5}}
.mh{{display:flex;justify-content:space-between}}.mh span{{color:#56676a}}
.ms{{font-weight:600;margin-top:4px}}.mb{{color:#2f403d;margin-top:10px}}
.mpdf{{margin-top:14px;display:inline-block;border:1px solid #d6dddb;border-radius:10px;padding:8px 12px;font-weight:600}}
{scroll_css()}
{extra_css}
'''
    return body, css


FONTS = ('Sora', 'Onest', 'JetBrains Mono')
made = []

# ---------------------------------------------------------------- A. Punched: continuous stationery
holes, punched = [], []
y0 = TOP - 20
HOLES = ((N - 1) * STEP + 460) // 22
for j in range(HOLES):
    y = y0 + j * 22
    holes.append(f'<i style="top:{y}px"></i>')
for i, s in enumerate(STEPS):
    y = TOP + i * STEP + 34
    holes.append(f'<b class="big" style="top:{y}px"></b>')
    punched.append(f'<b class="big on" style="top:{y}px;background:{s[1]}"></b>')
punched_small = ''.join(f'<i class="on" style="top:{y0 + j * 22}px"></i>' for j in range(HOLES))
margin = f'''<div class="strip" style="top:{y0 - 20}px;height:{HOLES * 22 + 20}px"></div>
<div class="holes">{''.join(holes)}</div>
<div class="punch">{punched_small}{''.join(punched)}</div>'''
css = f'''
.strip{{position:absolute;left:64px;width:56px;background:#fff;border-right:1.5px dashed #b9c5c1}}
.holes i,.punch i{{position:absolute;left:85px;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;box-shadow:inset 0 0 0 1.5px #c9d3d0}}
.holes .big,.punch .big{{position:absolute;left:85px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;box-shadow:inset 0 0 0 2px #c9d3d0}}
.punch{{position:absolute;left:0;top:{y0}px;width:200px;overflow:hidden;animation:punch {SECS}s cubic-bezier(.45,.05,.35,1) infinite}}
.punch i,.punch .big{{transform:translateY(-{y0}px)}}
.punch i.on{{background:#09191c;box-shadow:none}}
.punch .big.on{{box-shadow:none}}
{fill_css('punch', y0, 58)}
'''
b, c = stage(margin, extra_css=css)
made.append((write('LineA', 'Route line A: punched as you read', W, H, b, c, FONTS), 'A. Punched: continuous stationery, holed as you read'))

# ---------------------------------------------------------------- B. The invoice travels down the line
seg = []
for i, s in enumerate(STEPS):
    seg.append(f'<span style="top:{i * STEP}px;height:{STEP}px;background:{s[1]}"></span>')
margin = f'''<div class="track" style="top:{TOP + 30}px;height:{(N - 1) * STEP}px"></div>
<div class="fillwrap" style="top:{TOP + 30}px">{''.join(seg)}</div>'''


def sheet(inner, fold='#CFF26A'):
    return f'''<svg viewBox="0 0 64 80" width="64" height="80" aria-hidden="true">
<path d="M4 4 H44 L60 20 V76 H4 Z" fill="#fff" stroke="#09191c" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M44 4 V20 H60 Z" fill="{fold}" stroke="#09191c" stroke-width="2.4" stroke-linejoin="round"/>{inner}</svg>'''


lines3 = '<g fill="#b9c5c1"><rect x="12" y="34" width="32" height="4" rx="2"/><rect x="12" y="44" width="40" height="4" rx="2"/><rect x="12" y="54" width="24" height="4" rx="2"/></g>'
TOKENS = [
    ('Draft', '#ffffff', '#09191c', sheet(lines3)),
    ('INV-0044', '#09191c', '#ffffff', sheet(lines3 + '<rect x="12" y="12" width="26" height="12" rx="3" fill="#09191c"/>')),
    ('Sent', '#179A55', '#ffffff', '''<svg viewBox="0 0 64 80" width="64" height="80" aria-hidden="true">
<rect x="2" y="22" width="60" height="42" rx="5" fill="#fff" stroke="#09191c" stroke-width="2.4"/>
<path d="M4 25 L32 46 L60 25" fill="none" stroke="#09191c" stroke-width="2.4" stroke-linejoin="round"/></svg>'''),
    ('Reminder sent', '#118A6E', '#ffffff', '''<svg viewBox="0 0 64 80" width="64" height="80" aria-hidden="true">
<rect x="2" y="22" width="60" height="42" rx="5" fill="#fff" stroke="#09191c" stroke-width="2.4"/>
<path d="M4 25 L32 46 L60 25" fill="none" stroke="#09191c" stroke-width="2.4" stroke-linejoin="round"/>
<circle cx="52" cy="22" r="12" fill="#118A6E" stroke="#09191c" stroke-width="2.4"/><path d="M52 15 V22 L57 25" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>'''),
    ('Paid', '#CFF26A', '#09191c', sheet(lines3 + '<circle cx="40" cy="58" r="14" fill="#CFF26A" stroke="#09191c" stroke-width="2.4"/><path d="M33 58 l5 5 l9 -10" fill="none" stroke="#09191c" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>', '#37C66B')),
]
tok = []
for i, (label, bg, fg, svg) in enumerate(TOKENS):
    tok.append(f'<div class="tk t{i}">{svg}<span class="pill" style="background:{bg};color:{fg}">{esc(label)}</span></div>')
tok_css = []
for i in range(N):
    a = ARRIVE[i]
    nxt = ARRIVE.get(i + 1, 92)
    if i == 0:
        frames = f'0%,{ARRIVE[1] - 4}%{{opacity:1;transform:scale(1)}}{ARRIVE[1] - 1}%,97%{{opacity:0;transform:scale(.8)}}100%{{opacity:1;transform:scale(1)}}'
    elif i == N - 1:
        frames = f'0%,{a - 3}%{{opacity:0;transform:scale(.8)}}{a}%,92%{{opacity:1;transform:scale(1)}}96%,100%{{opacity:0;transform:scale(.8)}}'
    else:
        frames = f'0%,{a - 3}%{{opacity:0;transform:scale(.8)}}{a}%,{nxt - 4}%{{opacity:1;transform:scale(1)}}{nxt - 1}%,100%{{opacity:0;transform:scale(.8)}}'
    tok_css.append(f'.t{i}{{animation:tk{i} {SECS}s linear infinite}}@keyframes tk{i}{{{frames}}}')
overlay = f'<div class="rider">{"".join(tok)}</div>'
css = f'''
.track{{position:absolute;left:94px;width:0;border-left:3px dotted #b9c5c1}}
.fillwrap{{position:absolute;left:93px;width:5px;overflow:hidden;animation:fillb {SECS}s cubic-bezier(.45,.05,.35,1) infinite}}
.fillwrap span{{position:absolute;left:0;width:5px}}
{fill_css('fillb', TOP + 30)}
.rider{{position:absolute;left:62px;top:{READ - 40}px;width:200px;height:90px;pointer-events:none}}
.tk{{position:absolute;left:0;top:0;display:flex;align-items:center;gap:10px;transform-origin:32px 40px}}
.tk svg{{display:block;filter:drop-shadow(0 10px 18px rgb(9 25 28 / .18))}}
.pill{{display:none}}
{''.join(tok_css)}
'''
b, c = stage(margin, overlay, css)
made.append((write('LineB', 'Route line B: the invoice travels down it', W, H, b, c, FONTS), 'B. The invoice itself travels down the line'))

# ---------------------------------------------------------------- C. Ledger log
LOG = [('19 Oct, 15:12', 'Draft started'), ('20 Oct, 09:40', 'Issued INV-0044'), ('20 Oct, 09:41', 'Emailed, PDF attached'),
       ('3 Nov, 09:00', 'Reminder sent'), ('6 Nov, 14:22', 'Paid £2,280.00')]
entries = []
for i, (t, e) in enumerate(LOG):
    y = 120 + i * 62
    entries.append(f'<div class="le e{i}" style="top:{y}px"><span class="tick" style="background:{STEPS[i][1]}"></span><div class="lt">{esc(t)}</div><div class="lw">{esc(e)}</div>{'<div class="dbl"></div>' if i == N - 1 else ''}</div>')
overlay = f'''<div class="ledger"><div class="lhd">INV-0044</div><div class="rule"></div><div class="ruleon"></div>{''.join(entries)}</div>'''
ecss = []
for i in range(N):
    a = ARRIVE[i]
    if i == 0:
        continue
    ecss.append(f'.e{i}{{animation:ty{i} {SECS}s linear infinite}}@keyframes ty{i}{{0%,{a - 2}%{{clip-path:inset(0 0 100% 0);opacity:0}}{a + 2}%,92%{{clip-path:inset(0 0 0 0);opacity:1}}96%,100%{{clip-path:inset(0 0 100% 0);opacity:0}}}}')
css = f'''
.ledger{{position:absolute;left:0;top:0;width:220px;height:{H}px}}
.lhd{{position:absolute;left:24px;top:72px;width:166px;text-align:right;font-family:'Sora';font-weight:800;font-size:15px;letter-spacing:-.02em}}
.rule{{position:absolute;left:204px;top:112px;width:1px;height:{62 * N + 20}px;background:#c9d3d0}}
.ruleon{{position:absolute;left:203px;top:112px;width:3px;background:#09191c;animation:rl {SECS}s cubic-bezier(.45,.05,.35,1) infinite}}
{kf('rl', lambda k: f'height:{30 + 62 * k}px')}
.le{{position:absolute;left:24px;width:166px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.55}}
.le .tick{{position:absolute;right:-21px;top:5px;width:11px;height:11px;border-radius:50%;box-shadow:0 0 0 3px #ecefed}}
.lt{{color:#56676a}}.lw{{color:#09191c;font-weight:600}}
.dbl{{margin:8px 0 0 auto;width:110px;height:5px;border-top:1.5px solid #09191c;border-bottom:1.5px solid #09191c}}
{''.join(ecss)}
'''
b, c = stage('', overlay, css, text_left=260)
made.append((write('LineC', 'Route line C: the ledger of one invoice', W, H, b, c, FONTS), 'C. A ledger of the real times, filling up as you read'))

# ---------------------------------------------------------------- D. The crease, with corners turned
ears = []
for i, s in enumerate(STEPS):
    y = TOP + i * STEP + 8
    ears.append(f'<div class="ear r{i}" style="top:{y}px"><span class="under"></span><span class="flap" style="background:{s[1]}"></span></div>')
margin = f'''<div class="fold"></div><div class="crease"></div><div class="creaseon" style="top:{TOP}px"></div>{''.join(ears)}'''
dcss = []
for i in range(N):
    a = ARRIVE[i]
    if i == 0:
        dcss.append('.r0 .flap{transform:scale(1)}.r0 .under{opacity:1}')
        continue
    dcss.append(f'.r{i} .flap{{animation:fl{i} {SECS}s cubic-bezier(.3,1.4,.5,1) infinite}}@keyframes fl{i}{{0%,{a - 1}%{{transform:scale(0)}}{a + 3}%,92%{{transform:scale(1)}}96%,100%{{transform:scale(0)}}}}')
    dcss.append(f'.r{i} .under{{animation:un{i} {SECS}s linear infinite}}@keyframes un{i}{{0%,{a - 1}%{{opacity:0}}{a + 2}%,92%{{opacity:1}}96%,100%{{opacity:0}}}}')
css = f'''
.fold{{position:absolute;left:0;top:0;width:150px;height:100%;background:#e0e7e4}}
.crease{{position:absolute;left:150px;top:0;width:1px;height:100%;background:#cfd8d5;box-shadow:1px 0 0 rgb(255 255 255 / .8)}}
.creaseon{{position:absolute;left:148px;width:4px;background:#37C66B;animation:cr {SECS}s cubic-bezier(.45,.05,.35,1) infinite}}
{fill_css('cr', TOP)}
.ear{{position:absolute;left:94px;width:56px;height:56px}}
.ear .under{{position:absolute;inset:0;background:#cfd8d5;clip-path:polygon(0 0,100% 0,100% 100%);opacity:0}}
.ear .flap{{position:absolute;inset:0;clip-path:polygon(0 0,0 100%,100% 100%);transform-origin:0 0;transform:scale(0)}}
.ear::before{{content:'';position:absolute;inset:0;border-top:1.5px dashed #b9c5c1;border-right:1.5px dashed #b9c5c1}}
{''.join(dcss)}
'''
b, c = stage(margin, '', css)
made.append((write('LineD', 'Route line D: a crease, a corner turned at each step', W, H, b, c, FONTS), 'D. The crease, with a corner turned at each step'))

# ---------------------------------------------------------------- E. Till roll
ROLL = [('WRITE', 'DRAFT'), ('ISSUE', 'INV-0044'), ('SEND', '20 OCT'), ('REMIND', '3 NOV'), ('PAID', '£2,280.00')]
zig = 'M0 0 H168 ' + ' '.join(f'L{168 - 8 * j - 4} 8 L{168 - 8 * j - 8} 0' for j in range(21)) + ' Z'
roll_lines = ''.join(f'<div class="rl"><span>{a}</span><i></i><span>{b}</span></div>' for a, b in ROLL)
heights = {0: 104, 1: 140, 2: 176, 3: 212, 4: 300}
overlay = f'''<div class="printer"></div><div class="roll"><div class="paper">
<div class="rh">INVOICA<br>INV-0044</div>{roll_lines}<div class="rt">THANK YOU</div></div><svg class="zig" viewBox="0 0 168 8" width="168" height="8" preserveAspectRatio="none" aria-hidden="true"><path d="{zig}" fill="#fff"/></svg></div>'''
css = f'''
.printer{{position:absolute;left:14px;top:0;width:188px;height:14px;background:#09191c;border-radius:0 0 8px 8px;z-index:2}}
.roll{{position:absolute;left:24px;top:8px;width:168px;animation:roll {SECS}s cubic-bezier(.45,.05,.35,1) infinite;filter:drop-shadow(0 12px 18px rgb(9 25 28 / .12))}}
.paper{{height:calc(100% - 8px);overflow:hidden;background:#fff;font-family:'JetBrains Mono',monospace;font-size:11.5px;line-height:1;color:#09191c;padding:0 10px;box-sizing:border-box}}
.rh{{padding:16px 0 8px;text-align:center;font-weight:700;line-height:1.5;border-bottom:1px dashed #9aa6a3;margin-bottom:6px}}
.rl{{display:flex;align-items:baseline;gap:4px;padding:11px 0 13px}}
.rl i{{flex:1;border-bottom:1px dotted #9aa6a3}}
.rl:last-of-type span:last-child{{font-weight:800}}
.rt{{text-align:center;padding:14px 0 18px;border-top:1px dashed #9aa6a3;margin-top:8px;font-weight:700}}
.zig{{display:block;width:168px;height:8px}}
{kf('roll', lambda k: f'height:{heights[k]}px')}
'''
b, c = stage('', overlay, css, text_left=250)
made.append((write('LineE', 'Route line E: a till roll that prints each step', W, H, b, c, FONTS), 'E. A till roll that prints each step as you pass it'))

for n, t in made:
    print(n, '|', t)
