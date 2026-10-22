"""Kept for reference; it reads and writes the design canvas folder (canvas/project) beside it. Round 5 website: the round 3 page with the chosen logo, a crease headline, folded slabs that chart money in,
a ledger margin, the tilted sheet with its corner turned, the details as invoice line items and a tear-off slip."""
import os
import re
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r5parts import logo, FOLD_CSS, crease, placed  # noqa: E402

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'canvas', 'project')
s = open(os.path.join(P, 'R3Website.dc.html'), encoding='utf-8').read()
height = sys.argv[1] if len(sys.argv) > 1 else '7600'


def swap(old, new, count=1):
    global s
    assert s.count(old) == count, (old[:80], s.count(old))
    s = s.replace(old, new)


def swap_re(pattern, new, flags=re.S):
    global s
    s, n = re.subn(pattern, new, s, count=1, flags=flags)
    assert n == 1, pattern[:60]


# styles for the new pieces
CSS = FOLD_CSS + """
.note{margin:0;font-size:14px;line-height:1.5;color:#3E4F51;max-width:22em}
.note strong{display:block;color:#09191C;font-weight:600}
.ledger{position:absolute;left:18px;top:120px;bottom:120px;display:flex;align-items:center;justify-content:center;width:14px}
.ledger span{display:block;transform:rotate(-90deg);white-space:nowrap;font-size:11px;letter-spacing:0.06em;color:#8A9A97;font-variant-numeric:tabular-nums}
.slabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));column-gap:24px;align-items:end;height:310px;border-bottom:1px solid #C9D2CF}
.sl{position:relative;display:flex;height:100%}
.sl .fr{flex:0 0 64%;border-radius:8px 0 0 0;padding:14px 16px;box-sizing:border-box}
.sl .fc{flex:1 1 auto;clip-path:polygon(0 0,100% 100%,0 100%)}
.sl .m{display:block;font-size:13px;font-weight:600;color:#09191C}
.sl .v{display:block;margin-top:2px;font-family:Sora,sans-serif;font-weight:700;font-size:17px;letter-spacing:-0.02em;color:#09191C}
.bill{position:relative;background:#FFFFFF;border-radius:8px;box-shadow:0 1px 2px rgba(9,25,28,0.08),0 40px 80px -40px rgba(9,25,28,0.35)}
.li{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:24px;padding:18px 0;border-bottom:1px solid #E3E8E6}
.li strong{display:block;font-size:16px}
.li span{display:block;margin-top:3px;font-size:14.5px;line-height:1.5;color:#3E4F51}
.li b{font-family:Sora,sans-serif;font-weight:700;font-size:16px;font-variant-numeric:tabular-nums;align-self:start}
.cut{position:relative;height:0;border-top:2px dashed #C9D2CF;margin:0 -8px}
.cut svg{position:absolute;left:28px;top:-11px;background:#FFFFFF;padding:0 6px}
.rem{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:18px;row-gap:10px;font-size:14px}
.rem dt{color:#56676A}.rem dd{margin:0;font-weight:600}
.fld{height:52px;box-sizing:border-box;border:0;border-radius:13px;padding:0 16px;background:#F1F4F3;box-shadow:inset 0 0 0 1px #D6DDDB;font:500 16px Onest,sans-serif;color:#09191C;width:100%}
@media (max-width: 960px){.hero-note{display:none}}
@media (max-width: 760px){.ledger{display:none}.brand svg{height:25px;width:auto}.slabs{height:180px;column-gap:8px}.sl .fr{padding:0}.sl .m,.sl .v{display:none}.bill-in{padding:24px 20px !important}.slip-in{padding:24px 20px !important}}
"""
swap('</style>', CSS + '</style>')

# the logo, in the header and the footer
swap_re(r'<a href="#" class="wm brand" style="[^"]*">.*?</a>',
        f'<a href="#" class="brand" aria-label="Invoica, home" style="display: inline-flex; align-items: center">{logo(32)}</a>')
swap_re(r'<span class="wm" style="display: inline-flex; align-items: center; gap: 8px; font-size: 20px; color: #09191C">.*?invoiça<span style="color: #37C66B">\.</span></span></span>',
        f'<span style="display: inline-flex">{logo(24)}</span>')

# the hero: a crease through the headline, notes in the right columns, a ledger margin, and folded slabs
head = crease('Every invoice,<br>all the way<br>to paid.',
              'font-size: clamp(54px, 9vw, 132px); line-height: 0.94; letter-spacing: -0.05em; white-space: nowrap',
              'color: #09191C', 'background: linear-gradient(180deg, #1FA05A, #138C86); -webkit-background-clip: text; background-clip: text; color: transparent',
              121, -18, ext=14, tag='h1', label='Every invoice, all the way to paid.')
months = [('May', 4200), ('Jun', 6850), ('Jul', 5100), ('Aug', 7420), ('Sep', 6300), ('Oct', 7610)]
fills = [('#EDFBB8', '#D9F27E'), ('#D3F27C', '#AEE35B'), ('#ABE78C', '#7FD98B'), ('#86E7B0', '#56CF96'), ('#5DD6AE', '#2FB3A6'), ('#3CC0AE', '#138C86')]
top = max(v for _, v in months)
slab_html = ''
for (m, v), (a, b) in zip(months, fills):
    pct = round(v / top * 100, 1)
    note = 'so far' if m == 'Oct' else ''
    slab_html += (f'<div class="sl" style="height: {pct}%"><span class="fr" style="background: linear-gradient(180deg, {a}, {b})">'
                  f'<span class="m">{m}{" " + note if note else ""}</span><span class="v">£{v:,}</span></span>'
                  f'<span class="fc" style="background: linear-gradient(180deg, {b}, {b})"></span></div>')
ledger = '   '.join(f'INV-00{n}' for n in range(31, 46))
hero = f"""<section aria-label="Invoica" style="position: relative">
    <div class="ledger" aria-hidden="true"><span>{ledger}</span></div>
    <div class="wrap">
      <div class="g12 hero-note" style="padding-top: 28px">
        <p class="note" style="grid-column: 7 / span 3"><strong>For freelancers and small studios.</strong> Invoices in your own colours, sent under your own name.</p>
        <p class="note" style="grid-column: 10 / span 3"><strong>Free while in early access.</strong> Set up in a few minutes and send your first invoice today.</p>
      </div>
      <div class="g12" style="align-items: end; margin-top: clamp(28px, 5vw, 64px)">
        <div style="grid-column: 1 / span 8" class="hero-h">{head}</div>
        <div style="grid-column: 9 / span 4; padding-bottom: 10px" class="hero-side">
          <p style="margin: 0; font-family: Sora, sans-serif; font-weight: 700; font-size: clamp(19px, 1.7vw, 23px); line-height: 1.3; letter-spacing: -0.02em; text-wrap: balance">Write it, send it, and see each invoice right up to the money landing. When a client is late, Invoica sends the reminder.</p>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 18px; margin-top: 26px">
            <a href="#start" class="cta" style="background: #09191C; color: #FFFFFF">Create your free account</a>
            <a href="#how" style="font-size: 15px; font-weight: 600; text-underline-offset: 4px">How it works</a>
          </div>
        </div>
      </div>
      <figure style="margin: clamp(48px, 7vw, 96px) 0 0" role="img" aria-label="Money in at Linden &amp; Rowe Studio by month: May £4,200, June £6,850, July £5,100, August £7,420, September £6,300, October so far £7,610.">
        <div class="slabs" aria-hidden="true">{slab_html}</div>
        <figcaption style="margin-top: 12px; font-size: 13px; color: #56676A; text-align: right">Money in at Linden &amp; Rowe Studio, May to October</figcaption>
      </figure>
    </div>
  </section>

  <section aria-label="The app" style="padding-top: clamp(24px, 4vw, 56px)">"""
i0 = s.index('<section aria-label="Invoica">')
i1 = s.index('<div class="stage3d"', i0)
s = s[:i0] + hero + '\n    ' + s[i1:]

# the tilted sheet: no coils, the corner turned, the new screens
swap('<img src="/_blob/b6256dc49db8e3512aae05c60918d21a" alt="" style="position: absolute; left: 0; top: 24px; width: 2000px; height: 150px">\n', '')
swap('<img src="/_blob/b6256dc49db8e3512aae05c60918d21a" alt="" style="position: absolute; left: 0; bottom: 24px; width: 2000px; height: 150px">\n', '')
swap('<div class="plane" aria-hidden="true">', '<div class="plane fold" aria-hidden="true" style="--f: 300px"><span class="flap" style="border-bottom-left-radius: 26px"></span>')
swap('/_blob/09a270c1c2bbbf6a46de8798609d8465', '/_blob/7c639e8667954ceb33bcaa7d545a6480')
swap('/_blob/c7e35f1502cd64e329bb2686e6368ac6', '/_blob/8487f956bb379b5d465635c690b629d8')
swap('/_blob/79e823cc9e63dc5019fa034d7216bdf7', '/_blob/aa346d28680c3a67e3ce3ff912d0db46')

# get paid: the owed card with its corner turned
swap('/_blob/81f8dbd6cff3c714be7268ca22edc4ae', '/_blob/6fd0901b7f1b1524e68d44e96122da53')
swap('/_blob/0145f718697a5faf402e1872b6039612', '/_blob/09da934daeb0f2c6ec4457fc9be09b0a')

# the phone band: faint sheets behind the phone, the new screen
sheets = ''.join(placed(x, y, w, r, body='rgba(255,255,255,0.02)', fold=f, fold_opacity=o, stroke='rgba(255,255,255,0.15)', sw=1)
                 for x, y, w, r, f, o in [(30, 60, 240, -9, 'blend', 0.9), (330, 300, 200, 8, 'teal', 0.85), (380, -20, 150, 14, 'mint', 0.8)])
swap_re(r'<div style="position: absolute; left: 50%; top: 50%; width: 700px; height: 700px; margin: -350px 0 0 -350px; opacity: 0.8;[^"]*"><img src="/_blob/e0aba1cd79a901549b828253ee95db2f" alt="" style="width: 100%; height: 100%"></div>',
        f'<div style="position: absolute; left: 50%; top: 0; width: 600px; height: 680px; margin-left: -300px">{sheets}</div>')
swap('/_blob/1900140a1f936384b6d01f1ee2ddd536', '/_blob/5c65f38e712007bce449fd8d6c6fb2a2')

# the details as an invoice, and the sign-up as its tear-off slip
rows = [
    ('Pounds, cedis and more', 'Bill each client in their own currency, with VAT shown in pounds where the rules ask for it.'),
    ('Credit notes and refunds', 'Correct an issued invoice the proper way, and record money you send back.'),
    ("Every client's history", "Each client's invoices, payments and balance on one page, ready for the next job."),
    ('Saved items', 'Your usual services and prices, added to an invoice in a tap.'),
    ('Your records, yours', 'Export everything as a spreadsheet or a file whenever you like.'),
    ('Numbers you can trust', 'Totals, tax and rounding worked out the same way every time, to the penny.'),
]
lines = ''.join(f'<div class="li"><div><strong>{t}</strong><span>{d}</span></div><b>£0.00</b></div>' for t, d in rows)
scissors = ('<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="7" r="3" fill="none" stroke="#56676A" stroke-width="1.6"></circle>'
            '<circle cx="6" cy="17" r="3" fill="none" stroke="#56676A" stroke-width="1.6"></circle>'
            '<path d="M8.6 8.6L20 18M8.6 15.4L20 6" fill="none" stroke="#56676A" stroke-width="1.6" stroke-linecap="round"></path></svg>')
details = f"""<section id="start" class="wrap band" style="padding-bottom: 32px">
    <div class="g12" style="align-items: start">
      <div style="grid-column: 1 / span 4; position: sticky; top: 24px" class="hero-h">
        <h2 class="h h2" style="margin: 0"><span class="ph">The details,</span> <span class="ph">itemised.</span></h2>
        <p class="body">Everything on this invoice comes with every account. While Invoica is in early access, all of it costs nothing.</p>
      </div>
      <div style="grid-column: 5 / span 8" class="hero-side">
        <div class="bill fold" style="--f: 64px">
          <span class="flap"></span>
          <div class="bill-in" style="padding: 44px 48px 36px">
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 20px">
              {logo(30)}
              <div class="num" style="display: grid; grid-template-columns: auto auto; column-gap: 16px; row-gap: 4px; font-size: 13.5px; text-align: right; margin-right: 40px">
                <span style="color: #56676A">Invoice</span><strong>INV-0001</strong>
                <span style="color: #56676A">Issued</span><strong>Today</strong>
                <span style="color: #56676A">Billed to</span><strong>Your business</strong>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: minmax(0, 1fr) auto; margin-top: 36px; padding-bottom: 10px; border-bottom: 2px solid #09191C; font-size: 13px; font-weight: 600; color: #56676A"><span>Description</span><span>Amount</span></div>
            {lines}
            <div class="num" style="display: grid; grid-template-columns: minmax(0, 1fr) auto; row-gap: 8px; margin: 22px 0 0 auto; max-width: 320px; font-size: 15px">
              <span style="color: #56676A">Subtotal</span><span style="text-align: right">£0.00</span>
              <strong style="font-size: 17px; padding-top: 10px; border-top: 1px solid #E3E8E6">Total due</strong><strong class="h" style="font-size: 26px; text-align: right; padding-top: 6px; border-top: 1px solid #E3E8E6">£0.00</strong>
            </div>
            <p style="margin: 10px 0 0; text-align: right; font-size: 13.5px; color: #56676A">While Invoica is in early access.</p>
          </div>
          <div class="cut" aria-hidden="true">{scissors}</div>
          <div class="slip-in" style="padding: 36px 48px 44px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 32px 48px; align-items: end">
            <div>
              <h2 class="h" style="margin: 0; font-size: clamp(28px, 3vw, 36px); line-height: 1.06"><span class="ph">Start with</span> <span class="ph">your next invoice.</span></h2>
              <form style="display: flex; flex-direction: column; gap: 10px; margin-top: 22px">
                <label style="display: flex; flex-direction: column; gap: 7px; font-size: 14px; font-weight: 600">Your email<input class="fld" type="email" value="you@yourstudio.example"></label>
                <button type="submit" style="height: 52px; border: 0; border-radius: 13px; background: #09191C; color: #FFFFFF; font: 600 16px Onest, sans-serif">Create your free account</button>
              </form>
            </div>
            <dl class="rem num" style="margin: 0">
              <dt>Pay to</dt><dd>Invoica</dd>
              <dt>Reference</dt><dd>Early access</dd>
              <dt>Amount</dt><dd>£0.00</dd>
              <dt>Due</dt><dd>Whenever you are ready</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </section>"""
i0 = s.index('<section class="wrap band short">')
i1 = s.index('<footer')
s = s[:i0] + details + '\n\n  ' + s[i1:]
swap('<a href="#start" style="text-decoration: none">Early access</a>', '<a href="#start" style="text-decoration: none">Pricing</a>')
s = s.replace('"$preview":{"width":1440,"height":7450}', '"$preview":{"width":1440,"height":' + height + '}')
assert '/>' not in s and 'e0aba1cd' not in s and '86207a5c' not in s and 'invoiça' not in s and 'b6256dc4' not in s
open(os.path.join(P, 'R5Website.dc.html'), 'w', encoding='utf-8').write(s)
print('written', len(s))
