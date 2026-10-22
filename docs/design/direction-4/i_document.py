"""The Invoica wordmark with the i drawn as a document. Letters n, v, o, c, a are Sora ExtraBold."""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = os.environ.get('SORA_800', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sora-800.ttf'))
_gs = TTFont(FONT).getGlyphSet()
ASC = 800
TRACK = -22
NIGHT, WHITE = '#09191C', '#FFFFFF'
H = 552

ADV = {'n': 656, 'v': 609, 'o': 682, 'c': 613, 'a': 600}
KERN = {('n', 'v'): -4, ('v', 'o'): -14}

FOLD_LIGHT = [('0', '#7FD35A'), ('0.5', '#37C66B'), ('1', '#1F9C57')]
FOLD_DARK = [('0', '#CFF26A'), ('0.5', '#46DA80'), ('1', '#2FB866')]

_n = [0]


def _id(p):
    _n[0] += 1
    return f'{p}{_n[0]}'


def _grad(id_, x1, y1, x2, y2, stops):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"></stop>' for o, c in stops)
    return f'<linearGradient id="{id_}" gradientUnits="userSpaceOnUse" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}">{s}</linearGradient>'


def _poly(pts, dx):
    return 'M' + ' L'.join(f'{x + dx:.1f},{ASC - y:.1f}' for x, y in pts) + ' Z'


def _glyph(name, dx):
    pen = SVGPathPen(_gs)
    _gs[name].draw(TransformPen(pen, (1, 0, 0, -1, dx, ASC)))
    return pen.getCommands()


# each concept: (advance, left side bearing, stem width)
CONCEPTS = {
    'corner': dict(adv=310, lsb=64, sw=190),   # the corner cut from the stem becomes the dot
    'page': dict(adv=322, lsb=60, sw=182),     # the dot is a small page
    'slip': dict(adv=340, lsb=62, sw=232),     # the stem is a page with its corner turned
    'tall': dict(adv=316, lsb=64, sw=196),     # stem and a square dot of the same width: one tall sheet, its corner turned
    'note': dict(adv=316, lsb=64, sw=190),     # a plain stem and a square green dot with its corner turned
    'flight': dict(adv=330, lsb=64, sw=190),   # a plain stem and a small green page, tilted as if on its way
}


def draw_i(concept, x, ink, flat, dark):
    """SVG parts and defs for one i drawn as a document, its left edge at x."""
    c = CONCEPTS[concept]
    x0, sw = x + c['lsb'], c['sw']
    x1 = x0 + sw
    parts, defs = [], []
    stops = FOLD_DARK if dark else FOLD_LIGHT
    solid = '#46DA80' if dark else '#37C66B'
    if concept == 'corner':
        k = 118                                     # the cut, and the leg of the triangle that becomes the dot
        parts.append(f'<path d="{_poly([(0, 0), (0, H), (sw - k, H), (sw, H - k), (sw, 0)], x0)}" fill="{ink}"></path>')
        gap = 56
        t0 = H + gap
        tri = [(sw - k, t0), (sw, t0), (sw, t0 + k)]
        # the piece sits above the cut it came from, turned over so its green side shows
        tri = [(sw - k - 14, t0), (sw + 6, t0), (sw + 6, t0 + k + 20)]
        g = _id('ic')
        if flat:
            fill = solid
        else:
            defs.append(_grad(g, x0 + sw, ASC - t0 - k, x0 + sw - k, ASC - t0, stops))
            fill = f'url(#{g})'
        parts.append(f'<path d="{_poly(tri, x0)}" fill="{fill}"></path>')
    elif concept == 'page':
        parts.append(f'<path d="{_poly([(0, 0), (0, H), (sw, H), (sw, 0)], x0)}" fill="{ink}"></path>')
        pw, ph = 150, 196
        px = (sw - pw) / 2 + 6
        py = H + 48
        f = 58
        body = [(px, py), (px, py + ph), (px + pw - f, py + ph), (px + pw, py + ph - f), (px + pw, py)]
        flap = [(px + pw - f, py + ph), (px + pw - f, py + ph - f), (px + pw, py + ph - f)]
        parts.append(f'<path d="{_poly(body, x0)}" fill="{solid}"></path>')
        g = _id('ip')
        if flat:
            ffill = '#A6F2CA' if dark else '#B9EDC9'
        else:
            defs.append(_grad(g, x0 + px + pw, ASC - py - ph, x0 + px + pw - f, ASC - py - ph + f,
                              [('0', '#E4FA9C'), ('1', '#9BE7B8')]))
            ffill = f'url(#{g})'
        parts.append(f'<path d="{_poly(flap, x0)}" fill="{ffill}"></path>')
    elif concept in ('tall', 'note'):
        parts.append(f'<path d="{_poly([(0, 0), (0, H), (sw, H), (sw, 0)], x0)}" fill="{ink}"></path>')
        gap = 58
        d0 = H + gap
        dw = sw if concept == 'tall' else 184
        dx0 = 0 if concept == 'tall' else (sw - dw) / 2
        f = round(dw * (0.5 if concept == 'tall' else 0.42))
        body = [(dx0, d0), (dx0, d0 + dw), (dx0 + dw - f, d0 + dw), (dx0 + dw, d0 + dw - f), (dx0 + dw, d0)]
        flap = [(dx0 + dw - f, d0 + dw), (dx0 + dw - f, d0 + dw - f), (dx0 + dw, d0 + dw - f)]
        bfill = ink if concept == 'tall' else solid
        parts.append(f'<path d="{_poly(body, x0)}" fill="{bfill}"></path>')
        g = _id('it')
        if concept == 'tall':
            if flat:
                ffill = solid
            else:
                defs.append(_grad(g, x0 + dx0 + dw, ASC - d0 - dw, x0 + dx0 + dw - f, ASC - d0 - dw + f, stops))
                ffill = f'url(#{g})'
        else:
            if flat:
                ffill = '#B9EDC9' if not dark else '#A6F2CA'
            else:
                defs.append(_grad(g, x0 + dx0 + dw, ASC - d0 - dw, x0 + dx0 + dw - f, ASC - d0 - dw + f,
                                  [('0', '#E4FA9C'), ('1', '#A6EBC0')]))
                ffill = f'url(#{g})'
        parts.append(f'<path d="{_poly(flap, x0)}" fill="{ffill}"></path>')
    elif concept == 'flight':
        parts.append(f'<path d="{_poly([(0, 0), (0, H), (sw, H), (sw, 0)], x0)}" fill="{ink}"></path>')
        pw, ph, f = 168, 214, 66
        px, py = (sw - pw) / 2 + 16, H + 44
        body = [(px, py), (px, py + ph), (px + pw - f, py + ph), (px + pw, py + ph - f), (px + pw, py)]
        flap = [(px + pw - f, py + ph), (px + pw - f, py + ph - f), (px + pw, py + ph - f)]
        cx, cy = x0 + px + pw / 2, ASC - (py + ph / 2)
        g = _id('if')
        if flat:
            ffill = '#B9EDC9' if not dark else '#A6F2CA'
        else:
            defs.append(_grad(g, x0 + px + pw, ASC - py - ph, x0 + px + pw - f, ASC - py - ph + f, [('0', '#E4FA9C'), ('1', '#A6EBC0')]))
            ffill = f'url(#{g})'
        parts.append(f'<g transform="rotate(12 {cx:.1f} {cy:.1f})"><path d="{_poly(body, x0)}" fill="{solid}"></path><path d="{_poly(flap, x0)}" fill="{ffill}"></path></g>')
    else:  # slip
        f = 140
        parts.append(f'<path d="{_poly([(0, 0), (0, H), (sw - f, H), (sw, H - f), (sw, 0)], x0)}" fill="{ink}"></path>')
        g = _id('is')
        if flat:
            ffill = solid
        else:
            defs.append(_grad(g, x0 + sw, ASC - H, x0 + sw - f, ASC - H + f, stops))
            ffill = f'url(#{g})'
        parts.append(f'<path d="{_poly([(sw - f, H), (sw - f, H - f), (sw, H - f)], x0)}" fill="{ffill}"></path>')
        r = 88
        parts.append(f'<circle cx="{x0 + sw / 2 - 8:.1f}" cy="{ASC - 690}" r="{r}" fill="{solid}"></circle>')
    return parts, defs


PLAIN_ADV, PLAIN_LSB, PLAIN_SW = 304, 64, 182


def draw_plain_i(x, ink, dot):
    """A plain i: a straight stem and a round dot, the second i beside a slip."""
    x0 = x + PLAIN_LSB
    return [f'<path d="{_poly([(0, 0), (0, H), (PLAIN_SW, H), (PLAIN_SW, 0)], x0)}" fill="{ink}"></path>',
            f'<circle cx="{x0 + PLAIN_SW / 2:.1f}" cy="{ASC - 690}" r="88" fill="{dot}"></circle>']


def wordmark(concept, height_px, ink=NIGHT, dark=False, flat=None, both=True, label='Invoica', second=None):
    flat = (height_px < 34) if flat is None else flat
    x, prev, parts, defs = 0, None, [], []
    seen = 0
    for ch in 'invoica':
        if prev:
            x += TRACK + KERN.get((prev, ch), 0)
        if ch == 'i':
            seen += 1
            if seen == 2 and second:
                dot = ink if second == 'ink' else ('#46DA80' if dark else '#37C66B')
                parts += draw_plain_i(x, ink, dot)
                x += PLAIN_ADV
            elif both or seen == 1:
                p, d = draw_i(concept, x, ink, flat, dark)
                parts += p
                defs += d
                x += CONCEPTS[concept]['adv']
            else:
                parts.append(f'<path d="{_glyph("i", x)}" fill="{ink}"></path>')
                x += CONCEPTS[concept]['adv']
        else:
            parts.append(f'<path d="{_glyph(ch, x)}" fill="{ink}"></path>')
            x += ADV[ch]
        prev = ch
    w, top, h = x + 20, ASC - 820, 860
    w_px = height_px * w / h
    return (f'<svg viewBox="-10 {top} {w} {h}" width="{w_px:.1f}" height="{height_px}" role="img" aria-label="{label}" style="display:block">'
            f'<defs>{"".join(defs)}</defs>{"".join(parts)}</svg>')


def icon(concept, size_px, bg=NIGHT, ink=WHITE, radius=None, flat=None):
    flat = (size_px < 40) if flat is None else flat
    radius = radius if radius is not None else round(size_px * 0.23)
    p, d = draw_i(concept, 0, ink, flat, True)
    c = CONCEPTS[concept]
    x0, x1 = c['lsb'], c['lsb'] + c['sw']
    y0, y1 = 0, 800
    side = (y1 - y0) / 0.7
    cx, cy = (x0 + x1) / 2 + 8, ASC - (y0 + y1) / 2
    vb = f'{cx - side / 2:.1f} {cy - side / 2:.1f} {side:.1f} {side:.1f}'
    return (f'<span style="display:inline-flex;width:{size_px}px;height:{size_px}px;border-radius:{radius}px;background:{bg};flex:none">'
            f'<svg viewBox="{vb}" width="{size_px}" height="{size_px}" aria-hidden="true"><defs>{"".join(d)}</defs>{"".join(p)}</svg></span>')
