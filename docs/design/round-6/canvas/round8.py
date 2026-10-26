"""The third templates page: the chosen directions in colour, the logo's ground, the range so far, and the reworks."""
import json, os
from common import write, esc, R6

GAP = 40
W, H = 794, 1123
LABEL_H = 64
CSS = '''
.bd{box-sizing:border-box;background:#ecefed;padding:40px;display:flex;gap:40px;font-family:'Onest',sans-serif;color:#09191c}
.col{width:794px;flex:none}
.lab{height:64px}
.nm{font-family:'Sora',sans-serif;font-weight:700;font-size:19px;letter-spacing:-.02em}
.ln{font-size:13.5px;color:#4a5b5e;margin-top:3px;line-height:1.35}
.col img{display:block;width:794px;height:1123px;box-shadow:0 0 0 1px rgb(9 25 28 / .08),0 12px 32px -18px rgb(9 25 28 / .35)}
'''


def board(name, title, cols):
    w = 2 * GAP + len(cols) * W + (len(cols) - 1) * GAP
    h = 2 * GAP + LABEL_H + H
    body = '<div class="bd">' + ''.join(
        f'<div class="col"><div class="lab"><div class="nm">{esc(n)}</div><div class="ln">{esc(l)}</div></div>'
        f'<img src="{{{{IMG:{k}}}}}" alt="{esc(n)}"></div>' for k, n, l in cols) + '</div>'
    write(name, title, w, h, body, CSS, fonts=('Sora', 'Onest'))
    return name, w, h


B = []
B.append(board('R8Florists', 'Florists, stylists, interiors and weddings', [
    ('t3-atelier-rose', 'Atelier in rose', 'Wilder & Rose, with the amount due on a panel of its colour'),
    ('t3-atelier-emerald', 'Atelier in emerald', 'The same, in a jewel green'),
    ('t3-atelier-cobalt', 'Atelier in cobalt', 'The same, in cobalt blue'),
    ('t2-bloom', 'Bloom', 'Marigold Lane, as in round 2'),
]))
B.append(board('R8Marquee', 'Marquee, two colours from one', [
    ('t3-marquee-tangerine', 'Tangerine and navy', 'The type and the ticket in the opposite hue to the business’s colour'),
    ('t3-marquee-lime', 'Lime and plum', 'On a light colour the second colour is deep'),
    ('t3-marquee-violet', 'Violet and lemon', 'On a dark colour it is pale, and the ticket a deep tone of the violet'),
]))
B.append(board('R8Studios', 'Studios, agencies and developers', [
    ('t2-mark', 'Mark', 'Quiet and technical'),
    ('t3-billboard', 'Billboard', 'Loud, with the logo on a white tile'),
]))

# What sits behind the logo: one logo on four grounds.
GROUNDS = [('lg3-billboard-none', 'Nothing: the sun is lost in the orange'), ('lg3-billboard', 'White'),
           ('lg3-billboard-cream', 'Cream'), ('lg3-billboard-black', 'Black: the cloud is lost')]
gw, gh = 2 * GAP + W, 2 * GAP + 4 * (30 + 175) + 3 * 24
write('R8LogoGround', 'What sits behind the logo', gw, gh,
      '<div class="lgb">' + ''.join(f'<div><div class="t">{esc(t)}</div><img src="{{{{IMG:{k}}}}}" alt=""></div>' for k, t in GROUNDS) + '</div>',
      f'''.lgb{{width:{gw}px;height:{gh}px;box-sizing:border-box;background:#ecefed;padding:40px;display:flex;flex-direction:column;gap:24px;font-family:'Onest',sans-serif;color:#09191c}}
.lgb .t{{font-family:'Sora',sans-serif;font-weight:700;font-size:16px;height:30px}}
.lgb img{{display:block;width:794px;height:175px;border-radius:4px}}''', fonts=('Sora', 'Onest'))
B.append(('R8LogoGround', gw, gh))

# The range as it stands.
RANGE = [('t2-sticker', 'Sticker', 'Cafés, bakers, makers'), ('t2-riso', 'Riso', 'Illustrators, printers'),
         ('t3-marquee-lime', 'Marquee', 'Events, DJs, venues'), ('t3-atelier-rose', 'Atelier', 'Florists, stylists, weddings'),
         ('t2-bloom', 'Bloom', 'Florists, cake makers'), ('t2-mark', 'Mark', 'Studios and developers'),
         ('t3-billboard', 'Billboard', 'Studios and agencies'), ('t3-grid', 'Grid', 'Architects, designers'),
         ('t3-trade', 'Trade', 'Builders, roofers, cleaners'), ('t3-statement', 'Statement', 'Bookkeepers, contractors'),
         ('t2-practice', 'Practice', 'Accountants, solicitors'), ('t3-heritage-label', 'Heritage', 'Distillers, tailors, merchants')]
TW = 300
rw = 2 * GAP + 6 * TW + 5 * 24
rh = 2 * GAP + 2 * (int(TW * 297 / 210) + 58) + 24
write('R8Range', 'The range as it stands', rw, rh,
      '<div class="rg">' + ''.join(f'<div><img src="{{{{IMG:{k}}}}}" alt=""><div class="n">{esc(n)}</div><div class="w">{esc(w)}</div></div>' for k, n, w in RANGE) + '</div>',
      f'''.rg{{width:{rw}px;height:{rh}px;box-sizing:border-box;background:#ecefed;padding:40px;display:grid;grid-template-columns:repeat(6,{TW}px);gap:24px;font-family:'Onest',sans-serif;color:#09191c}}
.rg img{{display:block;width:{TW}px;height:{int(TW * 297 / 210)}px;box-shadow:0 0 0 1px rgb(9 25 28 / .08)}}
.rg .n{{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;margin-top:10px}}
.rg .w{{font-size:12.5px;color:#4a5b5e;margin-top:2px}}''', fonts=('Sora', 'Onest'))
B.append(('R8Range', rw, rh))

for tid, n, line in [('grid', 'Grid', 'A redder maroon, a bold amount under a black strip, the terms down level with it'),
                     ('trade', 'Trade', 'Archivo at its normal width throughout'),
                     ('statement', 'Statement', 'A larger amount due, the bank numbers labelled')]:
    B.append(board(f'R8{n}', f'{n}, round 2 and round 3', [(f't2-{tid}', f'{n}, round 2', 'As it was'), (f't3-{tid}', f'{n}, round 3', line)]))
B.append(board('R8Heritage', 'Heritage, round 2 and round 3', [
    ('t2-heritage', 'Heritage, round 2', 'As it was'),
    ('t3-heritage', 'Heritage, round 3', 'A thick and thin frame in the business’s colour, the inner rule curving in at the corners'),
    ('t3-heritage-label', 'Heritage, round 3, with a label', 'The head set as a label in the business’s colour'),
]))
json.dump(B, open(f'{R6}/gen/round8.json', 'w'))
for b in B:
    print(b)
