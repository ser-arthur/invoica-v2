"""Kept for reference; it reads and writes the design canvas folder (canvas/project) beside it. Round 5 app boards: the round 3 screens with the chosen logo, the folded corner in place of the coils,
folded-slab bars on the chart, and the crease on the sign-in panel."""
import os
import re
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r5parts import logo, FOLD_CSS, slab, crease, placed  # noqa: E402

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'canvas', 'project')
ROSETTE = re.compile(r'<div aria-hidden="true"(?: class="wide-only")? style="[^"]*"><img src="/_blob/e0aba1cd79a901549b828253ee95db2f" alt="" style="[^"]*"></div>')


def read(name):
    return open(os.path.join(P, name), encoding='utf-8').read()


def write(name, s):
    assert '/>' not in s, name
    assert 'e0aba1cd' not in s and '86207a5c' not in s and 'invoiça' not in s, name
    open(os.path.join(P, name), 'w', encoding='utf-8').write(s)
    print('wrote', name, len(s))


def header_logo(s, height, dark=False):
    n = 0

    def a_rep(m):
        return f'<a href="#" aria-label="Invoica, home" style="{m.group(1)}">{logo(height, dark=dark)}</a>'
    s, n = re.subn(r'<a href="#" class="wm" style="([^"]*)">.*?</a>', a_rep, s, count=1, flags=re.S)
    if n == 0:
        s, n = re.subn(r'<span class="wm" style="([^"]*)">.*?invoiça<span style="color: #[0-9A-Fa-f]+">\.</span></span></span>',
                       lambda m: f'<span style="{m.group(1)}">{logo(height, dark=dark)}</span>', s, count=1, flags=re.S)
    assert n == 1
    return s


def add_css(s, css):
    i = s.index('</style>')
    return s[:i] + css + '\n' + s[i:]


def fold_section(s, marker, size):
    """Give the section that holds `marker` a turned corner."""
    i = s.index(marker)
    j = s.rfind('<section', 0, i) if not marker.startswith('<section') else i
    k = s.index('>', j)
    tag = s[j:k]
    tag = tag.replace(' style="', f' class="fold" style="--f: {size}px; ', 1)
    return s[:j] + tag + '><span class="flap" aria-hidden="true"></span>' + s[k + 1:]


def slabs(s, dark):
    past_front, past_face = (('rgba(255,255,255,0.14)', 'rgba(255,255,255,0.07)') if dark else ('#D3DCD9', '#BFCAC7'))
    cur_front = 'linear-gradient(180deg, #CFF26A, #46DA80)'
    cur_face = 'linear-gradient(180deg, #6CE4A2, #138C86)'
    s, n = re.subn(r'<div style="height: (\d+)px; border-radius: 6px 6px 0 0; background: [^"]*"></div>',
                   lambda m: slab(int(m.group(1)), past_front, past_face), s)
    assert n == 5, n
    s, n = re.subn(r'<div style="position: relative; height: (\d+)px; border-radius: 6px 6px 0 0; background: linear-gradient\(180deg, #CFF26A, #37C66B 55%, #138C86\)">(<span class="num" style="position: absolute; bottom: calc\(100% \+ 6px\); )right: 0;([^"]*">£7,610</span>)</div>',
                   lambda m: slab(int(m.group(1)), cur_front, cur_face, extra=m.group(2) + 'left: 0;' + m.group(3)), s)
    assert n == 1, n
    return s


# dashboards
for src, dst, dark in [('R3Dashboard.dc.html', 'R5Dashboard.dc.html', False), ('R3DashboardDark.dc.html', 'R5DashboardDark.dc.html', True)]:
    s = read(src)
    s = header_logo(s, 28, dark)
    s = ROSETTE.sub('', s, count=1)
    s = add_css(s, FOLD_CSS)
    s = fold_section(s, '<section aria-label="Owed to you"', 84)
    s = s.replace('text-decoration: none">Chase the two overdue</a>', 'text-decoration: none; margin-right: 76px">Chase the two overdue</a>', 1)
    marks = ''.join(placed(x, y, w, r, body='rgba(255,255,255,0.02)', fold=f, fold_opacity=o, stroke='rgba(255,255,255,0.13)', sw=1)
                    for x, y, w, r, f, o in [(0, 60, 210, 8, 'blend', 0.85), (190, 210, 170, -7, 'teal', 0.8)])
    k = s.index('<span class="flap" aria-hidden="true"></span>') + len('<span class="flap" aria-hidden="true"></span>')
    s = s[:k] + f'<div aria-hidden="true" class="wide-only" style="position: absolute; right: 40px; top: 70px; width: 400px; height: 400px">{marks}</div>' + s[k:]
    s = slabs(s, dark)
    write(dst, s)

# phone
s = read('R3DashboardPhone.dc.html')
s = header_logo(s, 24)
s = ROSETTE.sub('', s, count=1)
s = add_css(s, FOLD_CSS)
s = fold_section(s, '<section aria-label="Owed to you"', 54)
write('R5DashboardPhone.dc.html', s)

# an invoice
s = read('R3Invoice.dc.html')
s = header_logo(s, 28)
s = ROSETTE.sub('', s, count=1)
s = add_css(s, FOLD_CSS)
s = fold_section(s, 'Still to pay', 56)
write('R5Invoice.dc.html', s)

# the list and the editor: the logo only
for src, dst in [('R3Invoices.dc.html', 'R5Invoices.dc.html'), ('R3Editor.dc.html', 'R5Editor.dc.html')]:
    s = read(src)
    s = header_logo(s, 28)
    write(dst, s)

# sign in: the logo, line-drawn sheets behind the cards, and the crease on the headline
s = read('R3SignIn.dc.html')
s = header_logo(s, 30)
s = ROSETTE.sub('', s, count=1)
sheets = ''.join(placed(x, y, w, r, body='rgba(255,255,255,0.025)', fold=f, fold_opacity=o, stroke='rgba(255,255,255,0.16)', sw=1)
                 for x, y, w, r, f, o in [(300, 40, 250, 7, 'blend', 0.9), (60, 300, 170, -10, 'teal', 0.85), (520, 420, 150, -6, 'mint', 0.8)])
i = s.index('<aside class="art"')
k = s.index('>', i)
s = s[:k + 1] + f'<div aria-hidden="true" style="position: absolute; inset: 0">{sheets}</div>' + s[k + 1:]
old = '<div class="h" style="font-size: 34px; line-height: 1.08; color: #FFFFFF; max-width: 11em">Every invoice,<br> all the way to paid.</div>'
assert s.count(old) == 1
head = '<div style="margin-bottom: 18px">' + crease('Every invoice,<br>all the way<br>to paid.', 'font-size: clamp(40px, 4.4vw, 60px); line-height: 1.0; letter-spacing: -0.04em; white-space: nowrap',
              'color: #FFFFFF', 'background: linear-gradient(180deg, #CFF26A, #46DA80); -webkit-background-clip: text; background-clip: text; color: transparent',
              120, -17, ext=12, line_dark=True, tag='div') + '</div>'
s = s.replace(old, head)
write('R5SignIn.dc.html', s)
