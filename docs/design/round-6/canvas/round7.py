"""The second templates page: new directions side by side, reworks beside their first version, and the drawn logos."""
import json, os, re
from common import write, esc, R6, PROJECT

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
    """cols: [(asset key, name, line)]"""
    w = 2 * GAP + len(cols) * W + (len(cols) - 1) * GAP
    h = 2 * GAP + LABEL_H + H
    body = '<div class="bd">' + ''.join(
        f'<div class="col"><div class="lab"><div class="nm">{esc(n)}</div><div class="ln">{esc(l)}</div></div>'
        f'<img src="{{{{IMG:{k}}}}}" alt="{esc(n)}"></div>' for k, n, l in cols) + '</div>'
    write(name, title, w, h, body, CSS, fonts=('Sora', 'Onest'))
    return name, w, h


B = []
B.append(board('R7Florists', 'Florists, stylists, interiors and weddings', [
    ('t2-bloom', 'Bloom', 'Florists and cake makers. Bodoni Moda and Jost, wild roses in fine line'),
    ('t2-olive', 'Arch', 'Wedding planners, stylists and venues. Cormorant Garamond and DM Sans on warm paper'),
    ('t2-editorial', 'Feature', 'Interior designers and stylists. Instrument Serif and Schibsted Grotesk, the job as the headline'),
]))
B.append(board('R7Marquee', 'Marquee, three pairings', [
    ('t2-marquee-a', 'Big Shoulders on ultramarine', 'Tall and narrow, like a festival bill'),
    ('t2-marquee-b', 'Anton on hot pink', 'The classic gig poster'),
    ('t2-marquee-c', 'Bricolage on tangerine', 'Rounder and friendlier, in sentence case'),
]))
B.append(board('R7Studios', 'Studios, agencies and developers', [
    ('t2-mark', 'Mark', 'Quiet and technical. Geist and Geist Mono'),
    ('t2-billboard', 'Billboard', 'Loud. Funnel Display and Inter Tight, the name filling the width'),
]))
REWORK = [
    ('grid', 'Grid', 'No ruler marks, the logo beside the name, maroon, and the amount due in a framed cell'),
    ('trade', 'Trade', 'Archivo wide, one weight of rule throughout, a charcoal band and a yellow amount due'),
    ('statement', 'Statement', 'The answers first: how much, by when and where to send it, then the lines like a bank statement'),
    ('practice', 'Practice', 'A navy letterhead with a gold line, Libre Caslon, warm paper and a gold-ruled amount due'),
    ('heritage', 'Heritage', 'Parchment, a gold double frame, the name arched like a bottle label, the number in oxblood'),
]
for tid, n, line in REWORK:
    B.append(board(f'R7{n}', f'{n}, before and after', [
        (f't-{tid}', f'{n}, round 1', 'As it was'),
        (f't2-{tid}', f'{n}, round 2', line),
    ]))
B.append(board('R7Kept', 'Kept, with real details', [
    ('t2-sticker', 'Sticker', 'Crumb & Kettle, with real-looking details'),
    ('t2-riso', 'Riso', 'Odd Hours Press, with a new sun and moon logo'),
]))

# The drawn logos.
LOGOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'prototypes', 'logos')
OLD_RISO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g style="mix-blend-mode:multiply"><circle cx="92" cy="104" r="78" fill="#FF48B0"/><circle cx="110" cy="94" r="78" fill="none" stroke="#0078BF" stroke-width="14"/><path d="M110 94 L110 44 M110 94 L150 120" stroke="#0078BF" stroke-width="14" stroke-linecap="round"/></g></svg>'


def svg(name, brand, n):
    s = open(f'{LOGOS}/{name}.svg').read().replace('{BRAND}', brand)
    s = re.sub(r'id="([a-z]+)"', lambda m: f'id="{m.group(1)}{n}"', s)
    s = re.sub(r'url\(#([a-z]+)\)', lambda m: f'url(#{m.group(1)}{n})', s)
    return s


TILES = [
    ('Odd Hours Press, round 1', OLD_RISO, '#fff'),
    ('Odd Hours Press, round 2', svg('riso', '#FF48B0', 1), '#fff'),
    ('Marigold Lane', svg('bloom', '#A4485E', 2), '#F7E6E9'),
    ('Fern & Fable', svg('olive-light', '#56603A', 3), '#56603A'),
    ('Maison Ivy', svg('editorial', '#3E4A3D', 4), '#fff'),
    ('Overcast', svg('billboard', '#FF5A1F', 5), '#fff'),
    ('Overcast, on its own colour', svg('billboard-board', '#FF5A1F', 6), '#FF5A1F'),
    ('Ashdown Kerr', svg('practice-light', '#16233F', 7), '#16233F'),
    ('Kestrel Roofing', svg('trade', '#FFC20E', 8), '#1D1F22'),
]
tiles = ''.join(
    f'<div class="tile"><div class="sq" style="background:{bg}">{s.replace("<svg ", "<svg width=\"150\" height=\"150\" ", 1)}</div><div class="tl">{esc(n)}</div></div>'
    for n, s, bg in TILES)
LW = 2 * GAP + 5 * 230 + 4 * 24
LH = 2 * GAP + 2 * 276 + 24
write('R7Logos', 'The drawn logos', LW, LH, f'<div class="lg">{tiles}</div>', '''
.lg{width:''' + str(LW) + '''px;height:''' + str(LH) + '''px;box-sizing:border-box;background:#ecefed;padding:40px;display:grid;grid-template-columns:repeat(5,230px);gap:24px;font-family:'Onest',sans-serif;color:#09191c}
.sq{width:230px;height:230px;border-radius:14px;display:grid;place-items:center;box-shadow:0 0 0 1px rgb(9 25 28 / .08)}
.tl{font-size:13.5px;font-weight:600;margin-top:10px;height:22px}
''', fonts=('Sora', 'Onest'))
B.append(('R7Logos', LW, LH))

json.dump(B, open(f'{R6}/gen/round7.json', 'w'))
for b in B:
    print(b)
