"""Shared pieces for round 5: the final logo, the folded corner, folded-slab bars, the crease headline and line-drawn sheets."""
import os
import math
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'direction-4'))
from i_document import wordmark as _wordmark, icon as _icon  # noqa: E402

NIGHT, WHITE = '#09191C', '#FFFFFF'


def logo(height_px, dark=False, flat=None):
    """The chosen logo: the slip on the first i, the second dot dark."""
    return _wordmark('slip', height_px, ink=(WHITE if dark else NIGHT), dark=dark, flat=flat, second='ink')


def app_icon(size_px, radius=None):
    return _icon('slip', size_px, radius=radius)


FOLD_CSS = (".fold{--f:72px;clip-path:polygon(0 0,calc(100% - var(--f)) 0,100% var(--f),100% 100%,0 100%)}"
            ".flap{position:absolute;top:0;right:0;width:var(--f);height:var(--f);clip-path:polygon(0 0,0 100%,100% 100%);"
            "border-bottom-left-radius:8px;background:linear-gradient(to bottom left,#E4FA9C,#46DA80 50%,#2FB3A6);z-index:2}")


def slab(height, front, face, radius=6, extra=''):
    """A bar drawn as a sheet folded along its right edge: a front face and a sloped face."""
    return (f'<div style="position: relative; height: {height}px; display: flex">'
            f'<span style="flex: 0 0 62%; border-radius: {radius}px 0 0 0; background: {front}"></span>'
            f'<span style="flex: 1 1 auto; background: {face}; clip-path: polygon(0 0, 100% 100%, 0 100%)"></span>{extra}</div>')


def crease(lines_html, font_css, base_css, past_css, x_top, x_bottom, ext=34, line_dark=False, tag='h1', label=None, cls='', x_span=(-3, 112)):
    """A headline crossed by one diagonal fold. Past the crease (to its right) the words change colour.

    x_top and x_bottom are where the crease meets the top and bottom of the extended box, in % of the headline's width;
    the crease runs from above the headline to below it by ext % of its height."""
    span = 100 + 2 * ext
    # the clip runs past the box at both ends so descenders and accents change colour too
    at = lambda y: x_top + (x_bottom - x_top) * ((ext + y) / span)
    clip = f'polygon({at(-30):.2f}% -30%, 130% -30%, 130% 130%, {at(130):.2f}% 130%)'
    hair = 'rgba(255,255,255,0.5)' if line_dark else 'rgba(9,25,28,0.45)'
    # draw the crease only where it runs across the headline, a little past each end
    t0 = max(0.0, (x_top - x_span[1]) / (x_top - x_bottom))
    t1 = min(1.0, (x_top - x_span[0]) / (x_top - x_bottom))
    lx = lambda t, d=0: x_top + d + (x_bottom - x_top) * t
    ly = lambda t: 100 * t
    aria = f' aria-label="{label}"' if label else ''
    font_css = font_css + '; padding-bottom: 0.2em'
    return (f'<div class="crease {cls}" style="position: relative; display: inline-block">'
            f'<{tag} class="h"{aria} style="margin: 0; {font_css}; {base_css}">{lines_html}</{tag}>'
            f'<div aria-hidden="true" class="h" style="position: absolute; inset: 0; margin: 0; {font_css}; {past_css}; clip-path: {clip}">{lines_html}</div>'
            f'<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; left: 0; top: -{ext}%; width: 100%; height: {span}%; overflow: visible; pointer-events: none">'
            f'<line x1="{lx(t0):.2f}" y1="{ly(t0):.2f}" x2="{lx(t1):.2f}" y2="{ly(t1):.2f}" stroke="#CFF26A" stroke-width="2" vector-effect="non-scaling-stroke"></line>'
            f'<line x1="{lx(t0, 2.2):.2f}" y1="{ly(t0):.2f}" x2="{lx(t1, 2.2):.2f}" y2="{ly(t1):.2f}" stroke="{hair}" stroke-width="1" vector-effect="non-scaling-stroke"></line>'
            f'</svg></div>')


FOLDS = {
    'blend': [('0', '#CFF26A'), ('0.45', '#37C66B'), ('0.75', '#6CE4A2'), ('1', '#138C86')],
    'lime': [('0', '#E4FA9C'), ('1', '#B9E04A')],
    'mint': [('0', '#C4F6DA'), ('1', '#6CE4A2')],
    'teal': [('0', '#3FBDB0'), ('1', '#0E6F6A')],
}
_n = [0]


def sheet(w, body='#FFFFFF', fold='blend', stroke=None, sw=1.0, fold_opacity=1.0):
    """A line-drawn sheet in A4 proportion with its top right corner turned."""
    _n[0] += 1
    g = f'r5s{_n[0]}'
    h, f, r = w * 1.414, w * 0.24, w * 0.035
    stops = ''.join(f'<stop offset="{o}" stop-color="{c}"></stop>' for o, c in FOLDS[fold])
    body_d = (f'M{r:.1f},0 H{w - f:.1f} L{w:.1f},{f:.1f} V{h - r:.1f} Q{w:.1f},{h:.1f} {w - r:.1f},{h:.1f} '
              f'H{r:.1f} Q0,{h:.1f} 0,{h - r:.1f} V{r:.1f} Q0,0 {r:.1f},0 Z')
    tip = f * 0.09
    flap_d = f'M{w - f:.1f},0 V{f - tip:.1f} Q{w - f:.1f},{f:.1f} {w - f + tip:.1f},{f:.1f} H{w:.1f} Z'
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    pad = w * 0.04
    return (f'<svg viewBox="{-pad:.1f} {-pad:.1f} {w + 2 * pad:.1f} {h + 2 * pad:.1f}" width="{w + 2 * pad:.0f}" height="{h + 2 * pad:.0f}" aria-hidden="true" style="display: block; overflow: visible">'
            f'<defs><linearGradient id="{g}" x1="1" y1="0" x2="0" y2="1">{stops}</linearGradient></defs>'
            f'<path d="{body_d}" fill="{body}"{st}></path><path d="{flap_d}" fill="url(#{g})" fill-opacity="{fold_opacity}"></path></svg>')


def placed(x, y, w, rot, **kw):
    return f'<div style="position: absolute; left: {x}px; top: {y}px; transform: rotate({rot}deg)">{sheet(w, **kw)}</div>'
