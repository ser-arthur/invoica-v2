"""The app below the hero: five ways to show writing, sending and getting paid, each looping."""
from common import write

W, H = 1440, 900
FONTS = ('Sora', 'Onest')
BASE = f'''
.st{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:#ecefed;font-family:'Onest',sans-serif;color:#09191c}}
.shadow{{box-shadow:0 1px 2px rgb(9 25 28 / .1),0 30px 60px -28px rgb(9 25 28 / .4)}}
'''
MAIL = '''<div class="mail shadow"><div class="mh"><b>Linden &amp; Rowe Studio</b><span>09:41</span></div>
<div class="ms">Invoice INV-0044 from Linden &amp; Rowe Studio</div>
<div class="mb">Hello Meridian team, please find invoice INV-0044 for £2,280.00 attached, due on 3 November.</div>
<div class="mpdf"><span class="pdf">PDF</span>INV-0044.pdf</div></div>'''
MAIL_CSS = '''
.mail{background:#fff;border-radius:18px;padding:22px 24px;font-size:14px;line-height:1.5;box-sizing:border-box}
.mh{display:flex;justify-content:space-between}.mh span{color:#56676a}
.ms{font-weight:600;margin-top:4px}.mb{color:#2f403d;margin-top:10px}
.mpdf{margin-top:14px;display:inline-flex;align-items:center;gap:8px;border:1px solid #d6dddb;border-radius:10px;padding:8px 12px;font-weight:600}
.pdf{background:#09191c;color:#fff;font-size:10px;font-weight:700;border-radius:4px;padding:2px 5px}
'''
made = []

# ------------------------------------------------------------ A. Flat, close up, in order on one route
body = f'''<div class="st">
  <div class="card c1 shadow"><img src="{{{{IMG:c-write}}}}" alt=""></div>
  <div class="c2">{MAIL}<div class="route shadow"><img src="{{{{IMG:c-send-route}}}}" alt=""></div></div>
  <div class="card c3 shadow"><img src="{{{{IMG:c-paid}}}}" alt=""></div>
  <div class="line"><span style="background:#B7E24F"></span><span style="background:#37C66B"></span><span style="background:#138C86"></span></div>
  <div class="dot d1"></div><div class="dot d2"></div><div class="dot d3"></div>
  <div class="lab l1">Write</div><div class="lab l2">Send</div><div class="lab l3">Get paid</div>
  <div class="pill"><span class="p1">Draft</span><span class="p2">Sent</span><span class="p3">Paid</span></div>
</div>'''
css = BASE + MAIL_CSS + '''
.card{position:absolute;border-radius:18px;overflow:hidden;background:#fff}
.card img{display:block;width:100%}
.c1{left:84px;top:150px;width:410px}
.c2{position:absolute;left:526px;top:262px;width:400px;display:flex;flex-direction:column;gap:16px}
.c2 .route{border-radius:14px;overflow:hidden;background:#fff}.c2 .route img{display:block;width:100%}
.c3{left:958px;top:388px;width:400px}
.line{position:absolute;left:84px;right:82px;top:722px;height:8px;display:flex;border-radius:4px;overflow:hidden}
.line span{flex:1}
.dot{position:absolute;top:712px;width:28px;height:28px;margin-left:-14px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 6px #09191c}
.d1{left:289px}.d2{left:726px}.d3{left:1158px;background:#CFF26A}
.lab{position:absolute;top:762px;font-family:'Sora';font-weight:800;font-size:36px;letter-spacing:-.035em;transform:translateX(-50%)}
.l1{left:289px}.l2{left:726px}.l3{left:1158px}
.pill{position:absolute;top:676px;height:30px;width:76px;margin-left:-38px;animation:ride 9s cubic-bezier(.6,0,.3,1) infinite}
.pill span{position:absolute;inset:0;border-radius:15px;display:grid;place-items:center;font:700 13px 'Onest';opacity:0}
.p1{background:#fff;color:#09191c;box-shadow:inset 0 0 0 1.5px #09191c;animation:o1 9s linear infinite}
.p2{background:#09191c;color:#fff;animation:o2 9s linear infinite}
.p3{background:#CFF26A;color:#09191c;animation:o3 9s linear infinite}
@keyframes ride{0%,22%{left:289px}33%,55%{left:726px}66%,92%{left:1158px}100%{left:289px}}
@keyframes o1{0%,26%{opacity:1}29%,96%{opacity:0}100%{opacity:1}}
@keyframes o2{0%,27%{opacity:0}30%,59%{opacity:1}62%,100%{opacity:0}}
@keyframes o3{0%,60%{opacity:0}63%,94%{opacity:1}97%,100%{opacity:0}}
.c1{animation:up1 9s ease infinite}.c2{animation:up2 9s ease infinite}.c3{animation:up3 9s ease infinite}
@keyframes up1{0%,25%{transform:translateY(-10px)}33%,100%{transform:none}}
@keyframes up2{0%,28%{transform:none}36%,58%{transform:translateY(-10px)}66%,100%{transform:none}}
@keyframes up3{0%,61%{transform:none}69%,92%{transform:translateY(-10px)}100%{transform:none}}
'''
made.append((write('SlabA', 'The app, flat and close up on one route', W, H, body, css, FONTS), 'A. Flat and close up, on one route'))

# ------------------------------------------------------------ B. Three words, one invoice
body = f'''<div class="st">
  <div class="words"><div class="w w1">Write.</div><div class="w w2">Send.</div><div class="w w3">Get paid.</div></div>
  <div class="s1 shadow"><img src="{{{{IMG:c-write}}}}" alt=""></div>
  <div class="s2"><div class="paper shadow"><img src="{{{{IMG:s-invoice-paper}}}}" alt=""></div><div class="m">{MAIL}</div></div>
  <div class="s3"><div class="paper shadow"><img src="{{{{IMG:s-invoice-paper}}}}" alt=""><div class="stamp">Paid</div></div><div class="owed shadow"><img src="{{{{IMG:c-paid}}}}" alt=""></div></div>
</div>'''
css = BASE + MAIL_CSS + '''
.words{position:absolute;left:96px;top:250px}
.w{font-family:'Sora';font-weight:800;font-size:76px;line-height:1.08;letter-spacing:-.045em;color:#c3cdca}
.w1{animation:wa 9s linear infinite}.w2{animation:wb 9s linear infinite}.w3{animation:wc 9s linear infinite}
@keyframes wa{0%,30%{color:#09191c}34%,97%{color:#c3cdca}100%{color:#09191c}}
@keyframes wb{0%,31%{color:#c3cdca}34%,63%{color:#09191c}67%,100%{color:#c3cdca}}
@keyframes wc{0%,64%{color:#c3cdca}67%,96%{color:#138C86}100%{color:#c3cdca}}
.s1,.s2,.s3{position:absolute;left:620px;top:70px;width:740px;height:760px}
.s1{left:760px;width:440px;height:auto;border-radius:18px;overflow:hidden;background:#fff}
.s1 img{display:block;width:100%}
.paper{position:absolute;left:120px;top:0;width:430px;border-radius:6px;overflow:hidden;background:#fff}
.paper img{display:block;width:100%}
.s2 .m{position:absolute;left:330px;top:420px;width:410px}
.s3 .owed{position:absolute;left:300px;top:470px;width:440px;border-radius:16px;overflow:hidden}
.s3 .owed img{display:block;width:100%}
.stamp{position:absolute;left:200px;top:240px;transform:rotate(-12deg);border:5px solid #138C86;color:#138C86;border-radius:12px;padding:4px 18px;font:800 46px 'Sora';letter-spacing:-.02em;background:rgb(255 255 255 / .85)}
.s1{animation:sa 9s ease infinite}.s2{animation:sb 9s ease infinite}.s3{animation:sc 9s ease infinite}
@keyframes sa{0%,28%{opacity:1;transform:none}34%,96%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:none}}
@keyframes sb{0%,29%{opacity:0;transform:translateY(16px)}35%,62%{opacity:1;transform:none}67%,100%{opacity:0;transform:translateY(-10px)}}
@keyframes sc{0%,62%{opacity:0}67%,94%{opacity:1}99%,100%{opacity:0}}
.s3 .stamp{animation:stamp 9s cubic-bezier(.3,1.5,.5,1) infinite}
@keyframes stamp{0%,66%{opacity:0;transform:rotate(-12deg) scale(1.8)}71%,94%{opacity:1;transform:rotate(-12deg) scale(1)}100%{opacity:0}}
'''
made.append((write('SlabB', 'Three words, one invoice', W, H, body, css, FONTS), 'B. Three words, one invoice changing with them'))

# ------------------------------------------------------------ C. Tabs that play
body = f'''<div class="st">
  <div class="tabs"><div class="tab t1"><span>Write</span><i></i></div><div class="tab t2"><span>Send</span><i></i></div><div class="tab t3"><span>Get paid</span><i></i></div></div>
  <div class="win shadow"><div class="bar"><b></b><b></b><b></b><span>app.invoica.io</span></div>
    <div class="scr"><img class="i1" src="{{{{IMG:s-editor}}}}" alt=""><img class="i2" src="{{{{IMG:s-invoice}}}}" alt=""><img class="i3" src="{{{{IMG:s-dashboard}}}}" alt=""></div>
  </div>
</div>'''
css = BASE + '''
.tabs{position:absolute;left:50%;top:40px;transform:translateX(-50%);display:flex;gap:8px;background:#dde4e2;border-radius:16px;padding:6px}
.tab{position:relative;width:180px;height:48px;border-radius:12px;display:grid;place-items:center;font:700 17px 'Onest';color:#56676a;overflow:hidden}
.tab i{position:absolute;left:14px;right:14px;bottom:7px;height:3px;border-radius:2px;background:#c9d3d0;overflow:hidden}
.tab i::after{content:'';position:absolute;inset:0;background:#09191c;transform-origin:left;transform:scaleX(0)}
.t1{animation:ta 12s linear infinite}.t2{animation:tb 12s linear infinite}.t3{animation:tc 12s linear infinite}
.t1 i::after{animation:pa 12s linear infinite}.t2 i::after{animation:pb 12s linear infinite}.t3 i::after{animation:pc 12s linear infinite}
@keyframes ta{0%,33%{background:#fff;color:#09191c}33.4%,100%{background:transparent;color:#56676a}}
@keyframes tb{0%,33%{background:transparent;color:#56676a}33.4%,66.6%{background:#fff;color:#09191c}67%,100%{background:transparent;color:#56676a}}
@keyframes tc{0%,66.6%{background:transparent;color:#56676a}67%,100%{background:#fff;color:#09191c}}
@keyframes pa{0%{transform:scaleX(0)}33%{transform:scaleX(1)}33.4%,100%{transform:scaleX(0)}}
@keyframes pb{0%,33.4%{transform:scaleX(0)}66.6%{transform:scaleX(1)}67%,100%{transform:scaleX(0)}}
@keyframes pc{0%,66.6%{transform:scaleX(0)}100%{transform:scaleX(1)}}
.win{position:absolute;left:50%;top:124px;width:1180px;transform:translateX(-50%);border-radius:18px;overflow:hidden;background:#fff}
.bar{height:40px;display:flex;align-items:center;gap:8px;padding:0 16px;background:#f4f6f5;border-bottom:1px solid #e3e8e6}
.bar b{width:11px;height:11px;border-radius:50%;background:#d3dad8}
.bar span{margin:0 auto;font-size:13px;color:#56676a;background:#fff;border-radius:8px;padding:4px 40px}
.scr{position:relative;height:738px}
.scr img{position:absolute;left:0;top:0;width:100%;opacity:0}
.i1{animation:ia 12s ease infinite}.i2{animation:ib 12s ease infinite}.i3{animation:ic 12s ease infinite}
@keyframes ia{0%,31%{opacity:1}35%,97%{opacity:0}100%{opacity:1}}
@keyframes ib{0%,31%{opacity:0}35%,64%{opacity:1}68%,100%{opacity:0}}
@keyframes ic{0%,64%{opacity:0}68%,97%{opacity:1}100%{opacity:0}}
'''
made.append((write('SlabC', 'Tabs that play through the app', W, H, body, css, FONTS), 'C. Tabs that play: one large screen at a time'))

# ------------------------------------------------------------ D. The slab, tamed
body = f'''<div class="st">
  <div class="scene"><div class="plane">
    <img class="sc a" src="{{{{IMG:s-editor}}}}" alt="">
    <img class="sc b" src="{{{{IMG:s-invoice}}}}" alt="">
    <img class="sc c" src="{{{{IMG:s-dashboard}}}}" alt="">
    <div class="track"><span style="background:#B7E24F"></span><span style="background:#37C66B"></span><span style="background:#138C86"></span></div>
  </div></div>
  <div class="lbl" style="left:282px">Write</div><div class="lbl" style="left:720px">Send</div><div class="lbl" style="left:1158px">Get paid</div>
</div>'''
css = BASE + '''
.scene{position:absolute;inset:0;perspective:2200px;perspective-origin:50% 0%}
.plane{position:absolute;left:70px;top:96px;width:1300px;height:600px;border-radius:36px;background:#fff;transform:rotateX(24deg);transform-origin:50% 100%;transform-style:preserve-3d}
.sc{position:absolute;width:470px;border-radius:12px;box-shadow:0 0 0 1px rgb(9 25 28 / .08),0 24px 40px -20px rgb(9 25 28 / .35)}
.a{left:24px;top:214px;transform:translateZ(30px)}
.b{left:415px;top:124px;transform:translateZ(60px)}
.c{left:806px;top:34px;transform:translateZ(90px)}
.track{position:absolute;left:40px;right:40px;bottom:46px;height:12px;border-radius:6px;display:flex;overflow:hidden}
.track span{flex:1}
.lbl{position:absolute;top:760px;transform:translateX(-50%);font-family:'Sora';font-weight:800;font-size:36px;letter-spacing:-.035em}
.sc{animation:hover 6s ease-in-out infinite}
.b{animation-delay:-2s}.c{animation-delay:-4s}
@keyframes hover{0%,100%{translate:0 0}50%{translate:0 -10px}}
'''
made.append((write('SlabD', 'The slab, tamed: straight on and gentler', W, H, body, css, FONTS), 'D. The slab kept, straight on and gentler'))

# ------------------------------------------------------------ E. A deck of sheets
body = f'''<div class="st">
  <div class="cap"><span class="k1">Write</span><span class="k2">Send</span><span class="k3">Get paid</span></div>
  <div class="deck">
    <img class="d d1 shadow" src="{{{{IMG:s-editor}}}}" alt="">
    <img class="d d2 shadow" src="{{{{IMG:s-invoice}}}}" alt="">
    <img class="d d3 shadow" src="{{{{IMG:s-dashboard}}}}" alt="">
  </div>
</div>'''
# each card cycles front -> leaving -> back -> middle -> front over 9s, offset by 3s
pos = {
    'front': 'transform:translate(0,0) scale(1);opacity:1;z-index:3',
    'gone': 'transform:translate(-120px,60px) rotate(-4deg) scale(.98);opacity:0;z-index:4',
    'back': 'transform:translate(0,-72px) scale(.88);opacity:1;z-index:1',
    'mid': 'transform:translate(0,-36px) scale(.94);opacity:1;z-index:2',
}
kfs = ''.join(f'''@keyframes dk{n}{{{''.join(f"{p}%{{{pos[s]}}}" for p, s in seq)}}}''' for n, seq in [
    (1, [(0, 'front'), (28, 'front'), (33, 'gone'), (34, 'back'), (61, 'back'), (66, 'mid'), (94, 'mid'), (100, 'front')]),
    (2, [(0, 'mid'), (28, 'mid'), (33, 'front'), (61, 'front'), (66, 'gone'), (67, 'back'), (94, 'back'), (100, 'mid')]),
    (3, [(0, 'back'), (28, 'back'), (33, 'mid'), (61, 'mid'), (66, 'front'), (94, 'front'), (99, 'gone'), (100, 'back')]),
])
css = BASE + f'''
.cap{{position:absolute;left:0;right:0;top:44px;display:flex;justify-content:center;gap:28px;font-family:'Sora';font-weight:800;font-size:30px;letter-spacing:-.035em}}
.cap span{{color:#c3cdca}}
.k1{{animation:ka 9s linear infinite}}.k2{{animation:kb 9s linear infinite}}.k3{{animation:kc 9s linear infinite}}
@keyframes ka{{0%,30%{{color:#09191c}}33%,97%{{color:#c3cdca}}100%{{color:#09191c}}}}
@keyframes kb{{0%,30%{{color:#c3cdca}}33%,63%{{color:#09191c}}66%,100%{{color:#c3cdca}}}}
@keyframes kc{{0%,63%{{color:#c3cdca}}66%,96%{{color:#09191c}}100%{{color:#c3cdca}}}}
.deck{{position:absolute;left:50%;top:190px;width:1060px;height:663px;margin-left:-530px}}
.d{{position:absolute;inset:0;width:100%;border-radius:16px;transform-origin:50% 0}}
.d1{{animation:dk1 9s cubic-bezier(.5,0,.3,1) infinite}}.d2{{animation:dk2 9s cubic-bezier(.5,0,.3,1) infinite}}.d3{{animation:dk3 9s cubic-bezier(.5,0,.3,1) infinite}}
{kfs}
'''
made.append((write('SlabE', 'A deck of sheets, dealt one at a time', W, H, body, css, FONTS), 'E. A deck of sheets, dealt one at a time'))

for n, t in made:
    print(n, '|', t)
