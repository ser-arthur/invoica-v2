"""The Invoica wordmark, second drawing: the whole v is one strip folded at the bottom.

Letters n, o, c, a are Sora ExtraBold outlines. The i is a plain stem with a round dot. The v is drawn here:
the front face (the left arm) in green, the back face (the right arm) in a lighter mint, slipping behind the
front along the crease, with the bottom right corner rounded where the strip turns.
"""
import math
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = os.environ.get('SORA_800', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sora-800.ttf'))
_gs = TTFont(FONT).getGlyphSet()
ASC = 800          # baseline sits at y = ASC in SVG space
TRACK = -22

NIGHT, WHITE = '#09191C', '#FFFFFF'
DOT = '#37C66B'

# the folded v, in font units, baseline at 0
W, H, SW = 720, 552, 214            # width at the top, x-height, horizontal width of each arm
SLOPE = (W / 2 - SW / 2) / H        # horizontal run per unit of height


def _round_poly(pts, radii):
    """Path through pts (font units, y up) with each corner rounded by its radius (quadratic corners)."""
    n = len(pts)
    segs = []
    for i in range(n):
        p, v, q = pts[i - 1], pts[i], pts[(i + 1) % n]
        r = radii[i]
        if r <= 0:
            segs.append(('L', v, None, None))
            continue
        def toward(a, b, d):
            dx, dy = b[0] - a[0], b[1] - a[1]
            ln = math.hypot(dx, dy)
            d = min(d, ln / 2)
            return (a[0] + dx / ln * d, a[1] + dy / ln * d)
        a = toward(v, p, r)
        b = toward(v, q, r)
        segs.append(('Q', a, v, b))
    return segs


def _path(pts, radii, dx=0.0, sx=1.0, oy=ASC):
    segs = _round_poly(pts, radii)
    f = lambda pt: f'{pt[0] * sx + dx:.1f},{oy - pt[1] * sx:.1f}'
    out = []
    first = segs[0]
    start = first[1] if first[0] == 'L' else first[3]
    out.append(f'M{f(start)}')
    for s in segs[1:] + [segs[0]]:
        if s[0] == 'L':
            out.append(f'L{f(s[1])}')
        else:
            out.append(f'L{f(s[1])} Q{f(s[2])} {f(s[3])}')
    return ' '.join(out) + ' Z'


def v_geometry(left_top=H, right_top=H):
    """Corner points of the folded v. A shorter left arm and a taller right arm make the tick."""
    xl = lambda y: (W / 2 - SW / 2) - SLOPE * y         # outer edge of the left arm
    xr = lambda y: (W / 2 - SW / 2) + SLOPE * y         # inner edge of the right arm
    A = (xl(left_top), left_top)
    B = (xl(left_top) + SW, left_top)
    D = (W / 2 - SW / 2, 0)
    C = (W / 2 + SW / 2, 0)                              # bottom right: where the strip turns
    F = (xr(right_top), right_top)
    G = (xr(right_top) + SW, right_top)
    X = (W / 2, SW / (2 * SLOPE))                         # the crotch, where the inner edges cross
    return A, B, C, D, F, G, X


_n = [0]


def _id(p):
    _n[0] += 1
    return f'{p}{_n[0]}'


def _lin(id_, x1, y1, x2, y2, stops):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
    return f'<linearGradient id="{id_}" gradientUnits="userSpaceOnUse" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}">{s}</linearGradient>'


PALETTES = {
    'light': dict(front=('#3FCF77', '#1F9C57'), back=('#8BE8B6', '#45C987'), shade=0.30, curl=0.22),
    'dark': dict(front=('#46DA80', '#24A962'), back=('#A6F2CA', '#5ADA98'), shade=0.40, curl=0.25),
    'flat': dict(front=('#2FB866', '#2FB866'), back=('#86E2AF', '#86E2AF'), shade=0.0, curl=0.0),
    'flatdark': dict(front=('#3FD27A', '#3FD27A'), back=('#9DEFC3', '#9DEFC3'), shade=0.0, curl=0.0),
}


def folded_v(dx=0.0, style='light', tick=False, mono=None, gap_color=WHITE, sx=1.0, oy=ASC):
    """SVG parts and defs for the folded v placed at dx (font units unless sx scales it)."""
    left_top, right_top = (300, 700) if tick else (H, H)
    A, B, C, D, F, G, X = v_geometry(left_top, right_top)
    silhouette = [A, B, X, F, G, C, D]
    sil_r = [10, 6, 4, 10, 10, 120, 46]
    back = [X, F, G, C]
    front = [A, B, C, D]
    clip = _id('vc')
    T = lambda pt: (pt[0] * sx + dx, oy - pt[1] * sx)
    defs = [f'<clipPath id="{clip}"><path d="{_path(silhouette, sil_r, dx, sx, oy)}"/></clipPath>']
    parts = []
    poly = lambda pts: 'M' + ' L'.join(f'{T(p)[0]:.1f},{T(p)[1]:.1f}' for p in pts) + ' Z'
    if mono:
        parts.append(f'<g clip-path="url(#{clip})"><path d="{poly([A, B, X, F, G, C, D])}" fill="{mono}"/>'
                     f'<path d="M{T(X)[0]:.1f},{T(X)[1]:.1f} L{T(C)[0]:.1f},{T(C)[1]:.1f}" stroke="{gap_color}" stroke-width="{16 * sx:.1f}"/></g>')
        return parts, defs
    pal = PALETTES[style]
    gf, gb = _id('vf'), _id('vb')
    top_y, bot_y = oy - max(left_top, right_top) * sx, oy
    defs.append(_lin(gf, 0, oy - left_top * sx, 0, bot_y, [('0', pal['front'][0], 1), ('1', pal['front'][1], 1)]))
    defs.append(_lin(gb, 0, top_y, 0, bot_y, [('0', pal['back'][0], 1), ('1', pal['back'][1], 1)]))
    g = [f'<g clip-path="url(#{clip})">', f'<path d="{poly(back)}" fill="url(#{gb})"/>']
    if pal['shade']:
        # the shadow the front face throws onto the back, along the crease
        (x1, y1), (x2, y2) = T(X), T(C)
        ux, uy = (y2 - y1), -(x2 - x1)
        ln = math.hypot(ux, uy)
        ux, uy = ux / ln, uy / ln
        sh = _id('vs')
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        defs.append(_lin(sh, mx, my, mx + ux * 70 * sx, my + uy * 70 * sx, [('0', NIGHT, pal['shade']), ('1', NIGHT, 0)]))
        g.append(f'<path d="{poly(back)}" fill="url(#{sh})"/>')
    g.append(f'<path d="{poly(front)}" fill="url(#{gf})"/>')
    if pal['curl']:
        # the front face darkens where it curls under, towards the bottom right
        cu = _id('vk')
        cx0, cy0 = T((W / 2 - 40, 150))
        cx1, cy1 = T(C)
        defs.append(_lin(cu, cx0, cy0, cx1, cy1, [('0', NIGHT, 0), ('1', NIGHT, pal['curl'])]))
        g.append(f'<path d="{poly(front)}" fill="url(#{cu})"/>')
    g.append('</g>')
    parts.append(''.join(g))
    return parts, defs


def _glyph(name, dx):
    pen = SVGPathPen(_gs)
    _gs[name].draw(TransformPen(pen, (1, 0, 0, -1, dx, ASC)))
    return pen.getCommands()


# advance widths and the side bearings used for the drawn letters
STEM = 182
I_ADV, I_LSB = 304, 66
V_ADV, V_LSB = W + 2 * 12, 12
KERN = {('n', 'v'): -6, ('v', 'o'): -18}
ADV = {'n': 656, 'o': 682, 'c': 613, 'a': 600}


def layout(text='invoica'):
    x, out, prev = 0, [], None
    for ch in text:
        if prev:
            x += TRACK + KERN.get((prev, ch), 0)
        out.append((ch, x))
        x += {'i': I_ADV, 'v': V_ADV}.get(ch, ADV.get(ch, 600))
        prev = ch
    return out, x


def wordmark(height_px, ink=NIGHT, dot=DOT, style='light', mono=False, label='Invoica'):
    """The whole wordmark as an inline SVG of the given height in pixels."""
    if style == 'auto':
        style = 'flat' if height_px < 34 else 'light'
    letters, width = layout()
    parts, defs = [], []
    for ch, x in letters:
        if ch == 'i':
            x0 = x + I_LSB
            parts.append(f'<path d="M{x0},{ASC} V{ASC - H} H{x0 + STEM} V{ASC} Z" fill="{ink}"/>')
            cx, cy, r = x0 + STEM / 2, ASC - 687, 92
            parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{ink if mono else dot}"/>')
        elif ch == 'v':
            p, d = folded_v(x + V_LSB, style=style, mono=(ink if mono else None),
                            gap_color=('#FFFFFF' if ink == NIGHT else NIGHT))
            parts += p
            defs += d
        else:
            parts.append(f'<path d="{_glyph(ch, x)}" fill="{ink}"/>')
    top = ASC - 800
    h = 840
    w = width + 20
    w_px = height_px * w / h
    return (f'<svg viewBox="-10 {top} {w} {h}" width="{w_px:.1f}" height="{height_px}" role="img" aria-label="{label}" style="display:block">'
            f'<defs>{"".join(defs)}</defs>{"".join(parts)}</svg>')


def icon(size_px, bg=NIGHT, style=None, radius=None, tick=True):
    """The tick alone on a square tile."""
    style = style or ('flatdark' if size_px < 40 else 'dark')
    radius = radius if radius is not None else round(size_px * 0.23)
    p, d = folded_v(0, style=style, tick=tick)
    A, B, C, D, F, G, X = v_geometry(300 if tick else H, 700 if tick else H)
    x0, x1 = min(A[0], D[0]), G[0]
    y0, y1 = 0, max(A[1], G[1])
    side = max(x1 - x0, y1 - y0) / 0.66
    cx, cy = (x0 + x1) / 2 + 10, ASC - (y0 + y1) / 2 + 8
    vb = f'{cx - side / 2:.1f} {cy - side / 2:.1f} {side:.1f} {side:.1f}'
    return (f'<span style="display:inline-flex;width:{size_px}px;height:{size_px}px;border-radius:{radius}px;background:{bg};flex:none">'
            f'<svg viewBox="{vb}" width="{size_px}" height="{size_px}" aria-hidden="true"><defs>{"".join(d)}</defs>{"".join(p)}</svg></span>')
