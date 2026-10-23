"""Six ways to draw the footer's large logo, as boards for the design canvas (page "Footer logo").

Reads the logo's own shapes from apps/web/src/components/logo-shapes.ts, so nothing is redrawn by hand.
Writes project/Footer*.dc.html under the folder given, and plain previews of the same boards beside them.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SHAPES = open(os.path.join(HERE, '..', '..', '..', 'apps', 'web', 'src', 'components', 'logo-shapes.ts')).read()


def const(name):
    m = re.search(rf"export const {name} =\s*'([^']*)'", SHAPES, re.S)
    return m.group(1)


def circle(name):
    m = re.search(rf"export const {name} = \{{ cx: ([\d.]+), cy: ([\d.]+), r: ([\d.]+) \}}", SHAPES)
    return tuple(float(v) for v in m.groups())


INK = const('LOGO_INK')
FOLD = const('LOGO_FOLD')
INK_DOT = circle('LOGO_INK_DOT')
ACCENT_DOT = circle('LOGO_ACCENT_DOT')
FOLD_LINE = (294.0, 248.0, 154.0, 388.0)

VIEW = (-10, -150, 3760, 1010)
WIDTH = 1184
CROP = 0.644
CROP_FADE = 0.9
HEIGHT = round(WIDTH * VIEW[3] / VIEW[2])
VISIBLE = round(HEIGHT * CROP)
VISIBLE_FADE = round(HEIGHT * CROP_FADE)
FADE = ('.fade{-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 50%,transparent 97%);'
        'mask-image:linear-gradient(to bottom,#000 0%,#000 50%,transparent 97%)}')


def mix(a, b, t):
    ca = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    cb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02X}' for x, y in zip(ca, cb))


def ink(fill, extra='', shift=(0, 0)):
    """The letters, both stems and the second dot."""
    t = f' transform="translate({shift[0]:.1f} {shift[1]:.1f})"' if shift != (0, 0) else ''
    cx, cy, r = INK_DOT
    return (f'<g{t}{extra}><path d="{INK}" fill="{fill}"></path>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"></circle></g>')


def outline(stroke, width, opacity, shift):
    cx, cy, r = INK_DOT
    return (f'<g transform="translate({shift[0]:.1f} {shift[1]:.1f})" fill="none" stroke="{stroke}" '
            f'stroke-width="{width}" stroke-opacity="{opacity}" stroke-linejoin="round">'
            f'<path d="{INK}"></path><circle cx="{cx}" cy="{cy}" r="{r}"></circle>'
            f'<path d="{FOLD}"></path><circle cx="{ACCENT_DOT[0]}" cy="{ACCENT_DOT[1]}" r="{ACCENT_DOT[2]}"></circle></g>')


def accent(fold_fill, dot_fill, shift=(0, 0)):
    """The slip's fold and the first dot."""
    t = f' transform="translate({shift[0]:.1f} {shift[1]:.1f})"' if shift != (0, 0) else ''
    cx, cy, r = ACCENT_DOT
    return (f'<g{t}><path d="{FOLD}" fill="{fold_fill}"></path>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{dot_fill}"></circle></g>')


def fold_gradient(gid, stops=('#CFF26A', '#46DA80', '#2FB866')):
    x1, y1, x2, y2 = FOLD_LINE
    return (f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
            f'<stop offset="0" stop-color="{stops[0]}"></stop><stop offset="0.5" stop-color="{stops[1]}"></stop>'
            f'<stop offset="1" stop-color="{stops[2]}"></stop></linearGradient>')


HOLO = [(0, '#CFF26A'), (0.16, '#8EE8B4'), (0.33, '#79D3D6'), (0.5, '#9DB0EE'), (0.66, '#D3B5EE'),
        (0.82, '#94E6C4'), (1, '#CFF26A')]


def holo_gradient(gid):
    stops = ''.join(f'<stop offset="{o}" stop-color="{c}"></stop>' for o, c in HOLO)
    return (f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="-200" y1="-300" x2="3900" y2="900" '
            f'spreadMethod="reflect">{stops}'
            f'<animateTransform attributeName="gradientTransform" type="translate" values="0 0;1400 0;0 0" '
            f'dur="9s" repeatCount="indefinite"></animateTransform></linearGradient>')


def sheen_gradient(gid, strength=0.5):
    return (f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="-900" y1="0" x2="0" y2="700">'
            f'<stop offset="0" stop-color="#FFFFFF" stop-opacity="0"></stop>'
            f'<stop offset="0.5" stop-color="#FFFFFF" stop-opacity="{strength}"></stop>'
            f'<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop>'
            f'<animateTransform attributeName="gradientTransform" type="translate" values="-600 0;4400 0" '
            f'dur="5.5s" repeatCount="indefinite"></animateTransform></linearGradient>')


def mark_a(p):
    return (f'<defs>{fold_gradient(p + "f")}</defs>'
            + ink('#19363A') + accent(f'url(#{p}f)', '#46DA80'))


def mark_b(p):
    return (f'<defs>{fold_gradient(p + "f")}{holo_gradient(p + "h")}{sheen_gradient(p + "s", 0.55)}</defs>'
            + ink(f'url(#{p}h)', ' opacity="0.86"') + ink(f'url(#{p}s)')
            + accent(f'url(#{p}f)', '#46DA80'))


def mark_c(p):
    # Fainter copies of the word stacked straight up behind it, as if it had just risen into place.
    layers = ''
    for k, opacity in zip(range(4, 0, -1), (0.1, 0.18, 0.3, 0.48)):
        cx, cy, r = INK_DOT
        layers += (f'<g transform="translate(0 {-k * 40})" fill="#2FB3A6" fill-opacity="{opacity}">'
                   f'<path d="{INK}"></path><circle cx="{cx}" cy="{cy}" r="{r}"></circle>'
                   f'<path d="{FOLD}"></path><circle cx="{ACCENT_DOT[0]}" cy="{ACCENT_DOT[1]}" r="{ACCENT_DOT[2]}"></circle></g>')
    return (f'<defs>{fold_gradient(p + "f")}</defs>' + layers
            + ink('#19363A') + accent(f'url(#{p}f)', '#46DA80'))


def mark_d(p):
    colours = ['#CFF26A', '#6CE4A2', '#2FB3A6', '#138C86']
    layers = ''
    for k, colour in zip(range(4, 0, -1), colours):
        layers += ink(colour, shift=(k * 16, -k * 34)) + accent(colour, colour, shift=(k * 16, -k * 34))
    return (f'<defs>{fold_gradient(p + "f")}</defs>' + layers
            + ink('#102A2D') + accent(f'url(#{p}f)', '#46DA80'))


def mark_e(p):
    return (f'<defs>{fold_gradient(p + "f")}{holo_gradient(p + "h")}{sheen_gradient(p + "s", 0.7)}</defs>'
            + ink(f'url(#{p}h)', shift=(0, -16)) + ink(f'url(#{p}s)', shift=(0, -16))
            + ink('#15302F') + accent(f'url(#{p}f)', '#46DA80'))


def mark_f(p):
    # The word over a fan of thin layers in the foil's colours, like light split by a prism.
    colours = ['#D3B5EE', '#9DB0EE', '#79D3D6', '#8EE8B4', '#B5EE88', '#CFF26A']
    layers = ''
    for k, colour in zip(range(6, 0, -1), colours):
        layers += ink(colour, shift=(k * 7, -k * 13)) + accent(colour, colour, shift=(k * 7, -k * 13))
    return (f'<defs>{fold_gradient(p + "f")}</defs>' + layers
            + ink('#15302F') + accent(f'url(#{p}f)', '#46DA80'))


OPTIONS = [
    ('FooterA', 'A. As it was', mark_a),
    ('FooterB', 'B. Holographic foil', mark_b),
    ('FooterC', 'C. Stacked echoes', mark_c),
    ('FooterD', 'D. Stacked layers', mark_d),
    ('FooterE', 'E. Foil edge', mark_e),
    ('FooterF', 'F. Prism stack', mark_f),
]

STYLE = """body{margin:0;background:#09191C}
.ft{width:1440px;box-sizing:border-box;padding:88px 128px 0;background:#09191C;color:rgba(255,255,255,0.74);font-family:Onest,sans-serif;font-size:15px;overflow:hidden}
.top{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:24px;padding-bottom:56px}
.brand{grid-column:1 / span 4;display:flex;flex-direction:column;align-items:flex-start}
.line{margin:0 0 26px;max-width:16em;font-family:Sora,sans-serif;font-weight:700;font-size:22px;line-height:1.3;letter-spacing:-0.02em;color:#FFFFFF}
.btn{display:inline-flex;align-items:center;height:54px;padding:0 24px;border-radius:14px;background:#CFF26A;color:#09191C;font-weight:600;font-size:16px;text-decoration:none}
.nav{grid-column:6 / span 7;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px 24px}
.nav h2{margin:0 0 16px;font:700 12px/1.2 Onest,sans-serif;letter-spacing:0.14em;text-transform:uppercase;color:#6CE4A2}
.nav ul{display:flex;flex-direction:column;gap:12px;margin:0;padding:0;list-style:none}
.nav a{color:rgba(255,255,255,0.74);text-decoration:none}
a{color:rgba(255,255,255,0.74)}a:hover{color:#FFFFFF}
.base{display:flex;justify-content:space-between;gap:24px;padding:22px 0;border-top:1px solid rgba(255,255,255,0.12);font-size:14px}
.base p{margin:0}
.mark{margin-top:24px;overflow:hidden}
.mark svg{display:block}"""

FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@100..900'
         '&amp;family=Sora:wght@100..800&amp;display=swap">')

COLUMNS = [('Product', ['Why Invoica', 'How it works', 'Templates', 'Pricing']),
           ('Company', ['About', 'Contact']),
           ('Help', ['Help centre', 'Getting started', 'Sign in']),
           ('Legal', ['Privacy', 'Terms', 'Cookies'])]


def body(stem, mark, fade=False):
    nav = ''.join(f'<div><h2>{t}</h2><ul>' + ''.join(f'<li><a href="#">{l}</a></li>' for l in links) + '</ul></div>'
                  for t, links in COLUMNS)
    vb = ' '.join(str(v) for v in VIEW)
    return (f'<footer class="ft">'
            f'<div class="top"><div class="brand"><p class="line">The business side of your business, in order.</p>'
            f'<a class="btn" href="#">Create free account</a></div><nav class="nav" aria-label="Footer">{nav}</nav></div>'
            f'<div class="base"><p>&#169; 2026 Invoica</p><p>Made for freelancers, studios and small firms.</p></div>'
            f'<div class="mark{" fade" if fade else ""}" style="height:{VISIBLE_FADE if fade else VISIBLE}px">'
            f'<svg viewBox="{vb}" width="{WIDTH}" height="{HEIGHT}" '
            f'aria-hidden="true">{mark(stem.lower())}</svg></div></footer>')


BOARD_H = 88 + 56 + 54 + 26 + 60 + 160 + 68 + 24 + VISIBLE
BOARD_H_FADE = BOARD_H - VISIBLE + VISIBLE_FADE


def board(stem, title, mark, fade=False):
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Footer logo, {title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>
{STYLE}
{FADE}
</style>
</helmet>
{body(stem, mark, fade)}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1440,"height":{BOARD_H_FADE if fade else BOARD_H}}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{}};
  }}
}}
</script>
</body>
</html>
"""


def preview(stem, title, mark, fade=False):
    return (f'<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>{title}</title>{FONTS}'
            f'<style>{STYLE}{FADE}</style></head><body>{body(stem, mark, fade)}</body></html>')


if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'project'), exist_ok=True)
    os.makedirs(os.path.join(out, 'preview'), exist_ok=True)
    for stem, title, mark in OPTIONS:
        open(os.path.join(out, 'project', f'{stem}.dc.html'), 'w').write(board(stem, title, mark))
        open(os.path.join(out, 'preview', f'{stem}.html'), 'w').write(preview(stem, title, mark))
        fstem = stem.replace('Footer', 'FooterFade')
        open(os.path.join(out, 'project', f'{fstem}.dc.html'), 'w').write(board(fstem, title + ', fading', mark, True))
        open(os.path.join(out, 'preview', f'{fstem}.html'), 'w').write(preview(fstem, title, mark, True))
    print('board height', BOARD_H, BOARD_H_FADE, 'mark', WIDTH, 'x', HEIGHT, 'visible', VISIBLE, VISIBLE_FADE)
