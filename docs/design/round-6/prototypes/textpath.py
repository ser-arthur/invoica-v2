"""Text set as SVG paths, so a logo drawn in a typeface needs no font where it is shown."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib import instancer

_cache = {}


def font(path, axes=None):
    key = (path, tuple(sorted((axes or {}).items())))
    if key not in _cache:
        f = TTFont(path)
        if axes and 'fvar' in f:
            f = instancer.instantiateVariableFont(f, axes)
        _cache[key] = f
    return _cache[key]


def text(path, s, size, x=0, y=0, axes=None, tracking=0.0, anchor='start'):
    """Returns (svg path data, width) for `s` at `size` px, baseline at y."""
    f = font(path, axes)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    upm = f['head'].unitsPerEm
    scale = size / upm
    names = [cmap.get(ord(ch), '.notdef') for ch in s]
    widths = [f['hmtx'][n][0] * scale for n in names]
    total = sum(widths) + tracking * size * (len(s) - 1)
    if anchor == 'middle':
        x -= total / 2
    elif anchor == 'end':
        x -= total
    out = []
    cx = x
    for n, w in zip(names, widths):
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (scale, 0, 0, -scale, cx, y))
        gs[n].draw(tp)
        out.append(pen.getCommands())
        cx += w + tracking * size
    return ' '.join(out), total
