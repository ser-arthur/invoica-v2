"""Draws the Invoica wordmark from Sora ExtraBold outlines, with the fold built into it in several ways.

Needs fontTools and uharfbuzz, and a static Sora ExtraBold file named by SORA_800 (default: sora-800.ttf
beside this script), made from the variable font with fontTools.varLib.instancer at wght 800.
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

FONT = os.environ.get('SORA_800', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sora-800.ttf'))
_f = TTFont(FONT)
_gs = _f.getGlyphSet()
_order = _f.getGlyphOrder()
TRACK = -20  # letter-spacing, -0.02em
ASC, DESC = 800, 200  # drawing box in font units, baseline at y=ASC

NIGHT, GREEN, MINT, WHITE = '#09191C', '#37C66B', '#6CE4A2', '#FFFFFF'
BLEND = [('0', '#CFF26A'), ('0.45', '#37C66B'), ('0.75', '#6CE4A2'), ('1', '#138C86')]


def shape(text):
    blob = hb.Blob.from_file_path(FONT)
    font = hb.Font(hb.Face(blob))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True})
    x, out = 0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        out.append((_order[info.codepoint], x))
        x += pos.x_advance + TRACK
    return out, x - TRACK


def glyph_d(name, dx):
    pen = SVGPathPen(_gs)
    _gs[name].draw(TransformPen(pen, (1, 0, 0, -1, dx, ASC)))
    return pen.getCommands()


def poly(pts, dx):
    return 'M' + ' L'.join(f'{x + dx:.1f},{ASC - y:.1f}' for x, y in pts) + ' Z'


def circle(cx, cy, r, dx):
    return f'M{cx + dx - r:.1f},{ASC - cy:.1f} a{r},{r} 0 1,0 {2 * r},0 a{r},{r} 0 1,0 {-2 * r},0 Z'


_n = [0]


def gid(p):
    _n[0] += 1
    return f'{p}{_n[0]}'


def grad(id_, x1, y1, x2, y2, stops=BLEND):
    s = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id_}" gradientUnits="userSpaceOnUse" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}">{s}</linearGradient>'


def v_fold(dx, ink, top=552, overlap=True, dark=False):
    """The v as one strip folded at the baseline: the dark face in front, the green underside rising behind it."""
    parts, defs = [], []
    lx = 292 + (417 - 292) / 552 * top
    rx = 455 + (591 - 455) / 552 * top
    g = gid('v')
    stops = [('0', '#CFF26A'), ('0.55', '#37C66B'), ('1', '#2A9E8F')] if dark else [('0', '#7FD35A'), ('0.5', '#37C66B'), ('1', '#0F7F79')]
    defs.append(grad(g, 0, ASC - top, 0, ASC, stops))
    if overlap:
        parts.append(f'<path d="{poly([(292, 0), (lx, top), (rx, top), (455, 0)], dx)}" fill="url(#{g})"/>')
        # shade cast by the front face onto the underside, along the dark arm's inner edge
        sh = gid('s')
        x0, y0 = 345 + dx, ASC
        defs.append(f'<linearGradient id="{sh}" gradientUnits="userSpaceOnUse" x1="{x0:.1f}" y1="{y0:.1f}" x2="{x0 + 70:.1f}" y2="{y0 - 18:.1f}">'
                    f'<stop offset="0" stop-color="#09191C" stop-opacity="{0.0 if dark else 0.42}"/><stop offset="1" stop-color="#09191C" stop-opacity="0"/></linearGradient>')
        band = [(345, 0), (316, 108), (316 + 110, 108 + 40), (455, 0)]
        parts.append(f'<path d="{poly([(292, 0), (lx, top), (rx, top), (455, 0)], dx)}" fill="url(#{sh})"/>')
        parts.append(f'<path d="{poly([(170, 0), (12, 552), (198, 552), (345, 0)], dx)}" fill="{ink}"/>')
    else:
        c = 152
        parts.append(f'<path d="{poly([(292 + 125 / 552 * c, c), (lx, top), (rx, top), (455 + 136 / 552 * c, c)], dx)}" fill="url(#{g})"/>')
        parts.append(f'<path d="{poly([(170, 0), (12, 552), (198, 552), (345, 0)], dx)}" fill="{ink}"/><path d="{poly([(228, 0), (228, c), (455 + 136 / 552 * c, c), (455, 0)], dx)}" fill="{ink}"/>')
    return parts, defs


I_DOT = (166.5, 687, 92)  # centre x, centre y, radius of the i's dot


def build(variant, ink=NIGHT, dot=None, dark=False):
    """Returns (svg body, defs, width) in font units for one variant of the wordmark."""
    text = 'invoica'
    glyphs, width = shape(text)
    parts, defs = [], []
    seen_i = 0
    for name, dx in glyphs:
        if name == 'i':
            seen_i += 1
            stem_spur = [(92, 0), (92, 420), (22, 420), (22, 552), (274, 552), (274, 0)]
            dcol = dot or ink
            if variant.startswith('B') and (seen_i == 1 or variant == 'B2'):
                s = 104
                body = [(92, 0), (92, 552), (274 - s, 552), (274, 552 - s), (274, 0)]
                parts.append(f'<path d="{poly(body, dx)}" fill="{ink}"/>')
                g = gid('f')
                defs.append(grad(g, 274 + dx, ASC - 552, 274 - s + dx, ASC - 552 + s))
                flap = [(274 - s, 552), (274 - s, 552 - s), (274, 552 - s)]
                parts.append(f'<path d="{poly(flap, dx)}" fill="url(#{g})"/>')
                parts.append(f'<path d="{circle(*I_DOT, dx)}" fill="{dcol}"/>')
            else:
                parts.append(f'<path d="{poly(stem_spur, dx)}" fill="{ink}"/>')
                parts.append(f'<path d="{circle(*I_DOT, dx)}" fill="{dcol}"/>')
        elif name == 'v' and variant.startswith('A'):
            vp, vd = v_fold(dx, ink, top=700 if variant == 'A2' else 552, overlap=(variant == 'A3'), dark=dark)
            parts += vp
            defs += vd
        else:
            parts.append(f'<path d="{glyph_d(name, dx)}" fill="{ink}"/>')
    if variant.startswith('C'):
        x0 = width + 70
        w, h = 210, 297
        s = 74
        body = [(x0, 0), (x0, h), (x0 + w - s, h), (x0 + w, h - s), (x0 + w, 0)]
        flap = [(x0 + w - s, h), (x0 + w - s, h - s), (x0 + w, h - s)]
        g = gid('c')
        sheet_fill = GREEN if variant == 'C1' else ink
        defs.append(grad(g, x0 + w, ASC - h, x0 + w - s, ASC - h + s,
                         [('0', '#E4FA9C'), ('1', '#B9E04A')] if variant == 'C1' else BLEND))
        parts.append(f'<path d="{poly(body, 0)}" fill="{sheet_fill}"/>')
        parts.append(f'<path d="{poly(flap, 0)}" fill="url(#{g})"/>')
        width = x0 + w
    return ''.join(parts), ''.join(defs), width


def svg(variant, height_px, ink=NIGHT, dot=None, dark=False, pad_top=0, label='Invoica'):
    body, defs, width = build(variant, ink, dot, dark)
    top = ASC - 800 - pad_top
    h = 800 + 40 + pad_top  # cap of the dots down to just below the baseline
    vb = f'-10 {top} {width + 20} {h}'
    w_px = height_px * (width + 20) / h
    return (f'<svg viewBox="{vb}" width="{w_px:.1f}" height="{height_px}" role="img" aria-label="{label}" style="display:block">'
            f'<defs>{defs}</defs>{body}</svg>')


def icon_glyph(variant, size_px, bg=NIGHT, ink=WHITE, dot=MINT, radius=None):
    """The square: the letter that carries the fold, alone on a tile."""
    radius = radius if radius is not None else round(size_px * 0.23)
    parts, defs = [], []
    if variant.startswith('A'):
        top = 700 if variant == 'A2' else 552
        vp, vd = v_fold(0, ink, top=top, overlap=(variant == 'A3'), dark=True)
        parts += vp
        defs += vd
        box = (12, top, 610, 0)
    elif variant.startswith('B'):
        s = 104
        g = gid('ib')
        defs.append(grad(g, 274, ASC - 552, 274 - s, ASC - 552 + s))
        parts.append(f'<path d="{poly([(92, 0), (92, 552), (274 - s, 552), (274, 552 - s), (274, 0)], 0)}" fill="{ink}"/>')
        parts.append(f'<path d="{poly([(274 - s, 552), (274 - s, 552 - s), (274, 552 - s)], 0)}" fill="url(#{g})"/>')
        parts.append(f'<path d="{circle(*I_DOT, 0)}" fill="{dot}"/>')
        box = (70, 778, 274, 0)
    else:
        w, h, s = 210, 297, 74
        g = gid('ic')
        stops = [('0', '#E4FA9C'), ('1', '#B9E04A')] if variant == 'C1' else BLEND
        defs.append(grad(g, w, ASC - h, w - s, ASC - h + s, stops))
        fill = GREEN if variant == 'C1' else ink
        parts.append(f'<path d="{poly([(0, 0), (0, h), (w - s, h), (w, h - s), (w, 0)], 0)}" fill="{fill}"/>')
        parts.append(f'<path d="{poly([(w - s, h), (w - s, h - s), (w, h - s)], 0)}" fill="url(#{g})"/>')
        box = (0, h, w, 0)
    x0, ytop, x1, ybot = box
    bw, bh = x1 - x0, ytop - ybot
    side = max(bw, bh) / 0.56
    cx, cy = (x0 + x1) / 2, ASC - (ytop + ybot) / 2
    vb = f'{cx - side / 2:.1f} {cy - side / 2:.1f} {side:.1f} {side:.1f}'
    return (f'<span style="display:inline-flex;width:{size_px}px;height:{size_px}px;border-radius:{radius}px;background:{bg};flex:none">'
            f'<svg viewBox="{vb}" width="{size_px}" height="{size_px}" aria-hidden="true"><defs>{"".join(defs)}</defs>{"".join(parts)}</svg></span>')
