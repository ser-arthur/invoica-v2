"""The invoice templates page: ten A4 boards, the picker, eight voices, logos, colours."""
from common import write, esc

RANGE = [
    # id, name, for, fonts, feel
    ('sticker', 'Sticker', 'Cafés, bakers, makers and classes', 'Fraunces and Figtree', 'Playful'),
    ('riso', 'Riso', 'Illustrators, printers, zines and labels', 'Syne and Space Mono', 'Playful'),
    ('marquee', 'Marquee', 'Events, DJs, venues and photographers', 'Unbounded and Manrope', 'Playful'),
    ('atelier', 'Atelier', 'Florists, stylists, interiors and weddings', 'Instrument Serif and Sans', 'In between'),
    ('mark', 'Mark', 'Studios, agencies and developers', 'Geist and Geist Mono', 'In between'),
    ('grid', 'Grid', 'Architects, designers and photographers', 'Mona Sans, two widths', 'In between'),
    ('trade', 'Trade', 'Builders, roofers, electricians and cleaners', 'Archivo, condensed', 'Grounded'),
    ('statement', 'Statement', 'Bookkeepers, contractors and engineers', 'IBM Plex Sans and Mono', 'Grounded'),
    ('practice', 'Practice', 'Accountants, solicitors, surveyors and clinics', 'Source Serif and Sans', 'Grounded'),
    ('heritage', 'Heritage', 'Distillers, barbers, tailors and wine merchants', 'Cormorant and EB Garamond', 'Grounded'),
]

boards = []
for i, (tid, name, who, fonts, feel) in enumerate(RANGE, 1):
    n = f'T{i:02d}{name}'
    write(n, f'{name} template', 794, 1123,
          f'<img src="{{{{IMG:t-{tid}}}}}" alt="The {esc(name)} template with an invented business" style="display: block; width: 794px; height: 1123px">')
    boards.append((n, f'{name}: {who.lower() if False else who}'))

# The picker in Settings, showing the range: what each is for, and its type.
KEPT = [
    ('signature', 'Signature', 'Invoica’s own, and the free plan’s', 'Sora and Onest', 'In between'),
    ('letter', 'Letter', 'Coaches, tutors and therapists', 'Newsreader', 'In between'),
    ('ticket', 'Ticket', 'Market stalls, shops and events', 'JetBrains Mono and Onest', 'Playful'),
]
cards = []
for tid, name, who, fonts, feel in RANGE + KEPT:
    sel = ' sel' if tid == 'atelier' else ''
    cards.append(f'''<div class="card{sel}">
  <div class="thumb"><img src="{{{{IMG:th-{tid}}}}}" alt=""></div>
  <div class="meta"><div class="nm">{esc(name)}</div><div class="who">{esc(who)}</div><div class="ty">{esc(fonts)}</div></div>
</div>''')
picker_css = '''
.pk{width:1440px;min-height:1600px;box-sizing:border-box;background:#ecefed;color:#09191c;font-family:'Onest',sans-serif;padding:56px 64px}
.pk h1{font-family:'Sora',sans-serif;font-weight:800;font-size:34px;letter-spacing:-.035em;margin:0}
.pk .sub{margin:8px 0 0;font-size:16px;color:#56676a}
.bar{display:flex;justify-content:space-between;align-items:center;margin:28px 0 24px;gap:24px;flex-wrap:wrap}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{height:38px;padding:0 16px;border-radius:999px;border:1px solid #c9d3d0;background:#fff;font:600 14px 'Onest',sans-serif;color:#09191c;display:inline-flex;align-items:center}
.chip.on{background:#09191c;color:#fff;border-color:#09191c}
.feel{display:flex;background:#dde4e2;border-radius:12px;padding:4px}
.feel span{height:32px;padding:0 14px;border-radius:9px;font:600 13px 'Onest';display:inline-flex;align-items:center;color:#2f403d}
.feel span.on{background:#fff;color:#09191c}
.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:22px}
.card{background:#fff;border-radius:18px;padding:12px 12px 16px;border:2px solid transparent}
.card.sel{border-color:#09191c}
.thumb{border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px rgb(9 25 28 / .08);aspect-ratio:210/297;background:#fff}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.meta{padding:12px 4px 0}
.nm{font-family:'Sora';font-weight:700;font-size:16px;letter-spacing:-.02em}
.who{font-size:13px;color:#2f403d;margin-top:2px;line-height:1.35}
.ty{font-size:12px;color:#56676a;margin-top:6px}
'''
picker = f'''<div class="pk">
<h1>How your invoices look</h1>
<p class="sub">Each one shows your own name, logo and colour. Your clients see the one you choose on every invoice from now on.</p>
<div class="bar">
  <div class="chips"><span class="chip on">All</span><span class="chip">Food and drink</span><span class="chip">Creative</span><span class="chip">Events</span><span class="chip">Trades</span><span class="chip">Professional services</span><span class="chip">Shops and makers</span></div>
  <div class="feel" aria-label="Feel"><span>Playful</span><span class="on">Any</span><span>Grounded</span></div>
</div>
<div class="grid">{''.join(cards)}</div>
</div>'''
write('TPicker', 'Choosing a template', 1440, 1600, picker, picker_css, fonts=('Sora', 'Onest'))

# Eight voices: one invoice's opening, set eight ways.
VOICES = [
    ('Friendly', 'Fraunces, soft', 'Figtree', "font-family:'Fraunces';font-variation-settings:'SOFT' 100,'WONK' 1;font-weight:800", "font-family:'Figtree'", '#E8436F'),
    ('Art school', 'Syne', 'Space Mono', "font-family:'Syne';font-weight:800", "font-family:'Space Mono'", '#FF48B0'),
    ('Loud', 'Unbounded', 'Manrope', "font-family:'Unbounded';font-weight:800;letter-spacing:-.04em", "font-family:'Manrope'", '#FF4F1F'),
    ('Editorial', 'Instrument Serif', 'Instrument Sans', "font-family:'Instrument Serif';font-weight:400;letter-spacing:0", "font-family:'Instrument Sans'", '#2F4A3A'),
    ('Modern', 'Geist', 'Geist Mono for figures', "font-family:'Geist';font-weight:650;letter-spacing:-.045em", "font-family:'Geist'", '#2E55F5'),
    ('Condensed', 'Archivo, narrow', 'Archivo', "font-family:'Archivo';font-stretch:66%;font-weight:900;letter-spacing:0", "font-family:'Archivo'", '#E0A400'),
    ('Technical', 'IBM Plex Sans', 'IBM Plex Mono', "font-family:'IBM Plex Sans';font-weight:600;letter-spacing:-.02em", "font-family:'IBM Plex Sans'", '#0E6A73'),
    ('Heritage', 'Cormorant', 'EB Garamond', "font-family:'Cormorant';font-weight:700;letter-spacing:.005em", "font-family:'EB Garamond'", '#1E4636'),
]
vcards = []
for name, disp, text, dstyle, tstyle, colour in VOICES:
    fig = "font-family:'Geist Mono'" if name == 'Modern' else ("font-family:'IBM Plex Mono'" if name == 'Technical' else ("font-family:'Space Mono'" if name == 'Art school' else dstyle))
    vcards.append(f'''<div class="vc">
  <div class="vh"><span class="vn">{esc(name)}</span><span class="vf">{esc(disp)} with {esc(text)}</span></div>
  <div class="paper" style="{tstyle}">
    <div style="{dstyle};font-size:30px;line-height:1.02;color:{colour}">Field Office</div>
    <div class="row"><span class="lab">Invoice</span><span style="{dstyle};font-size:22px">INV-0042</span></div>
    <div class="ln"><span style="{tstyle};font-weight:500;font-size:15px;line-height:1.3">Design of six page templates</span><span style="{fig};font-weight:500;font-size:14px">£1,200.00</span></div>
    <div class="ln"><span style="{tstyle};font-weight:500;font-size:15px;line-height:1.3">Build and content entry</span><span style="{fig};font-weight:500;font-size:14px">£1,600.00</span></div>
    <div class="due" style="background:{colour}"><span>Amount due</span><span style="{dstyle};font-size:{'19px' if name == 'Art school' else '22px'};color:#fff;white-space:nowrap">£3,250.00</span></div>
  </div>
</div>''')
voices_css = '''
.vb{width:1440px;height:880px;box-sizing:border-box;background:#ecefed;padding:56px 64px;font-family:'Onest',sans-serif;color:#09191c}
.vgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}
.vc{display:flex;flex-direction:column;gap:10px}
.vh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.vn{font-family:'Sora';font-weight:700;font-size:16px}
.vf{font-size:12px;color:#56676a;text-align:right}
.paper{font-variant-numeric:lining-nums tabular-nums;background:#fff;border-radius:6px;padding:26px 24px 24px;height:320px;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;box-shadow:0 0 0 1px rgb(9 25 28 / .06);color:#141414}
.row{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #e3e6e4;padding-bottom:10px}
.lab{font-size:12px;color:#6b6b6b}
.ln{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.due span:first-child{white-space:nowrap;margin-right:10px}
.due{margin-top:auto;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:12px}
'''
write('TVoices', 'One invoice, eight voices', 1440, 880,
      f'<div class="vb"><div class="vgrid">{"".join(vcards)}</div></div>', voices_css,
      fonts=('Sora', 'Onest', 'Fraunces', 'Figtree', 'Syne', 'Space Mono', 'Unbounded', 'Manrope', 'Instrument Serif',
             'Instrument Sans', 'Geist', 'Geist Mono', 'Archivo', 'IBM Plex Sans', 'IBM Plex Mono', 'Cormorant', 'EB Garamond'))

# Logo or no logo: each template's header with the invented logo, then with none.
rows = []
for tid, name, *_ in RANGE:
    rows.append(f'''<div class="lr"><div class="ln2">{esc(name)}</div><img src="{{{{IMG:h-logo-{tid}}}}}" alt=""><img src="{{{{IMG:h-nologo-{tid}}}}}" alt=""></div>''')
logos_css = '''
.lb{width:1360px;box-sizing:border-box;background:#ecefed;padding:48px 56px;font-family:'Onest',sans-serif;color:#09191c}
.lh{display:grid;grid-template-columns:120px 1fr 1fr;gap:24px;font:600 14px 'Onest';color:#56676a;margin-bottom:12px}
.lr{display:grid;grid-template-columns:120px 1fr 1fr;gap:24px;align-items:start;margin-bottom:24px}
.ln2{font-family:'Sora';font-weight:700;font-size:17px;padding-top:6px}
.lr img{width:100%;display:block;border-radius:4px;box-shadow:0 0 0 1px rgb(9 25 28 / .08)}
'''
write('TLogos', 'With a logo, and without one', 1360, 2280,
      f'<div class="lb"><div class="lh"><span></span><span>With a logo</span><span>Without one</span></div>{"".join(rows)}</div>',
      logos_css, fonts=('Sora', 'Onest'))

# Your colour: three templates in three colours each.
COLS = [('sticker', ['E8436F', '2F7DE1', 'F28C28']), ('grid', ['E2231A', '1F5BFF', '111111']), ('trade', ['FFC20E', '2BB673', 'E4002B'])]
crow = []
for tid, cs in COLS:
    crow.append('<div class="cr">' + ''.join(f'<img src="{{{{IMG:colour-{tid}-{c}}}}}" alt="">' for c in cs) + '</div>')
write('TColours', 'In your colour', 1360, 1870,
      f'<div class="cb">{"".join(crow)}</div>',
      '.cb{width:1360px;box-sizing:border-box;background:#ecefed;padding:40px;display:flex;flex-direction:column;gap:28px}.cr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}.cr img{width:100%;display:block;box-shadow:0 0 0 1px rgb(9 25 28 / .08)}',
      fonts=())

print('\n'.join(b[0] for b in boards))
