"""Isometric block artwork for the Invoica design direction, round 1. Writes SVG files to the folder given."""
import math
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

C30 = math.cos(math.radians(30))

PALETTES = {
    # top face, left face (normal +y), right face (normal +x): each a gradient from, to
    'lime': (('#F3FDBE', '#D2F46A'), ('#C9EF5E', '#5ACF7A'), ('#3CC071', '#168A7D')),
    'green': (('#E4FA90', '#93EDBB'), ('#45D075', '#1BA28C'), ('#15867F', '#0C4A4C')),
    'mint': (('#C9F8DF', '#7EE6B0'), ('#6CE4A2', '#25B193'), ('#1A9A8C', '#0E5A5B')),
    'teal': (('#A6F0CF', '#57D3B2'), ('#1EA393', '#0F6D6B'), ('#0E5A5B', '#082E32')),
    'night': (('#24585A', '#143C3F'), ('#123537', '#0A2427'), ('#0B2528', '#061416')),
    'paper': (('#FFFFFF', '#F4F7F6'), ('#E6EBE9', '#D9E0DD'), ('#CED6D3', '#BCC7C3')),
}


class Art:
    def __init__(self, w, h, ox, oy, s, fit=None):
        self.w, self.h, self.ox, self.oy, self.s = w, h, ox, oy, s
        self.fit = fit
        self.defs = []
        self.body = []
        self.used = set()
        self.bounds = [1e9, 1e9, -1e9, -1e9]

    def p(self, x, y, z=0.0):
        return (self.ox + (x - y) * self.s * C30, self.oy + (x + y) * self.s * 0.5 - z * self.s)

    def grad(self, name, a, b, x2=1, y2=1):
        gid = f'{name}'
        if gid not in self.used:
            self.used.add(gid)
            self.defs.append(
                f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">'
                f'<stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'
            )
        return f'url(#{gid})'

    @staticmethod
    def pts(ps):
        return ' '.join(f'{x:.1f},{y:.1f}' for x, y in ps)

    def poly(self, ps, fill, extra=''):
        for x, y in ps:
            b = self.bounds
            b[0], b[1], b[2], b[3] = min(b[0], x), min(b[1], y), max(b[2], x), max(b[3], y)
        self.body.append(f'<polygon points="{self.pts(ps)}" fill="{fill}"{extra}/>')

    def box(self, x, y, w, d, h, pal, z=0.0, edge=True):
        top, left, right = PALETTES[pal]
        ft = self.grad(f'{pal}-t', *top, x2=1, y2=1)
        fl = self.grad(f'{pal}-l', *left, x2=0.35, y2=1)
        fr = self.grad(f'{pal}-r', *right, x2=1, y2=1)
        P = lambda a, b, c: self.p(a, b, c)
        lf = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)]
        rf = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)]
        tf = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]
        self.poly(lf, fl)
        self.poly(rf, fr)
        self.poly(tf, ft)
        if edge:
            a, b, c = P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)
            self.body.append(
                f'<polyline points="{self.pts([a, b, c])}" fill="none" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1" vector-effect="non-scaling-stroke"/>'
            )

    def flat(self, x, y, w, d, z, fill, extra=''):
        P = self.p
        self.poly([P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], fill, extra)

    def line(self, a, b, op=0.16, colour='#09191C', dash=None):
        dd = f' stroke-dasharray="{dash}"' if dash else ''
        self.body.append(
            f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{colour}" stroke-opacity="{op}" stroke-width="1" vector-effect="non-scaling-stroke"{dd}/>'
        )

    def ray(self, x, y, z, dx, dy, length=60, op=0.16, colour='#09191C', both=True):
        """A long hairline through an isometric point along a ground axis."""
        a = self.p(x - (dx * length if both else 0), y - (dy * length if both else 0), z)
        b = self.p(x + dx * length, y + dy * length, z)
        self.line(a, b, op, colour)

    def paper(self, x, y, w, d, z, ink='#1D3C5A', total='#1D3C5A'):
        """A sheet lying flat: a thin paper slab with ruled lines and an amount panel, read along +x."""
        self.box(x, y, w, d, 0.06, 'paper', z=z, edge=False)
        zt = z + 0.06
        # heading bar
        self.flat(x + 0.25, y + 0.25, w * 0.42, 0.16, zt, ink)
        self.flat(x + w - 0.25 - w * 0.22, y + 0.25, w * 0.22, 0.12, zt, '#9AA8A5')
        # ruled lines
        yy = y + 0.85
        while yy < y + d * 0.68:
            self.flat(x + 0.25, yy, w - 0.5, 0.035, zt, '#C7D0CD')
            self.flat(x + 0.25, yy + 0.12, w * 0.38, 0.06, zt, '#7D8C89')
            self.flat(x + w - 0.25 - w * 0.16, yy + 0.12, w * 0.16, 0.06, zt, '#7D8C89')
            yy += 0.42
        # amount due panel
        self.flat(x + w * 0.5, y + d - 0.95, w * 0.5 - 0.25, 0.7, zt, total)
        self.flat(x + w * 0.56, y + d - 0.62, w * 0.26, 0.1, zt, '#FFFFFF')

    def svg(self, title=None):
        t = f'<title>{title}</title>' if title else ''
        if self.fit is not None:
            px, py = self.fit
            x0, y0, x1, y1 = self.bounds
            vx, vy, vw, vh = x0 - px, y0 - py, x1 - x0 + 2 * px, y1 - y0 + 2 * py
        else:
            vx, vy, vw, vh = 0, 0, self.w, self.h
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.1f} {vy:.1f} {vw:.1f} {vh:.1f}" width="{vw:.0f}" height="{vh:.0f}">'
            f'{t}<defs>{"".join(self.defs)}</defs>{"".join(self.body)}</svg>'
        )


def write(name, art):
    (OUT / name).write_text(art.svg())


# Hero: blocks rising to the back right, an invoice resting on the middle block, hairlines carried out to the edges.
def hero():
    a = Art(760, 640, 380, 170, 30, fit=(70, 60))
    a.ray(0, 9, 0, 1, 0, length=60, op=0.22)
    a.ray(9, 0, 0, 0, 1, length=60, op=0.22)
    a.box(5.2, -1.0, 3, 3, 7.4, 'teal')
    a.box(1.6, 2.2, 3, 3, 4.6, 'green')
    a.box(-1.0, 5.6, 3, 3, 2.2, 'lime')
    a.box(6.6, 4.4, 1.4, 1.4, 1.4, 'mint')
    a.box(4.4, 7.4, 1, 1, 1, 'night')
    a.paper(1.75, 1.95, 2.55, 3.55, 4.6)
    a.box(-2.0, 0.8, 1, 1, 1, 'mint', z=7.6)
    write('hero.svg', a)


# Dashboard panel: a quiet stack for the dark "owed to you" card.
def panel():
    a = Art(420, 300, 210, 70, 22, fit=(40, 30))
    for k in range(-10, 12, 2):
        a.ray(k, 0, 0, 0, 1, length=30, op=0.10, colour='#FFFFFF')
    a.box(3.4, -0.6, 2.4, 2.4, 5.0, 'teal')
    a.box(0.8, 1.8, 2.4, 2.4, 3.1, 'green')
    a.box(-1.6, 4.2, 2.4, 2.4, 1.5, 'lime')
    a.box(4.4, 3.2, 1, 1, 1, 'mint')
    write('panel.svg', a)


# Phone panel: a smaller cluster for the phone card.
def panel_phone():
    a = Art(200, 170, 100, 40, 13, fit=(2, 2))
    a.box(3.4, -0.6, 2.4, 2.4, 5.0, 'teal')
    a.box(0.8, 1.8, 2.4, 2.4, 3.1, 'green')
    a.box(-1.6, 4.2, 2.4, 2.4, 1.5, 'lime')
    write('panel-phone.svg', a)


# The wordmark's full stop and the app icon: one cube.
def cube():
    a = Art(52, 60, 26, 15.5, 15, fit=(0, 0))
    a.box(0, 0, 1.73, 1.73, 1.73, 'green', edge=False)
    write('cube.svg', a)


# Closing band: a long low run of slabs, like a row of paid invoices stacking up.
def band():
    a = Art(1200, 360, 560, 40, 26, fit=(120, 40))
    for k in range(-24, 26, 2):
        a.ray(k, 0, 0, 0, 1, length=50, op=0.08)
    a.ray(0, 6, 0, 1, 0, length=80, op=0.2)
    pal = ['lime', 'lime', 'green', 'green', 'mint', 'mint', 'teal', 'teal']
    for i in range(8):
        a.box(-8 + i * 2.6, 3 - i * 0.0, 2.0, 2.6, 0.6 + i * 0.75, pal[i])
    write('band.svg', a)


# The kit: each palette as one block, and the paper slab.
def kit():
    for pal in ['lime', 'green', 'mint', 'teal', 'night']:
        a = Art(150, 150, 75, 30, 26, fit=(6, 6))
        a.box(0, 0, 2, 2, 2.4, pal)
        write(f'kit-{pal}.svg', a)
    a = Art(150, 150, 75, 40, 26, fit=(6, 6))
    a.paper(0, 0, 2.2, 3.0, 0)
    write('kit-paper.svg', a)


# Empty and phone-hero cluster: three steps.
def steps():
    a = Art(360, 300, 180, 60, 24, fit=(30, 24))
    a.ray(0, 6, 0, 1, 0, length=30, op=0.18)
    a.box(-2.2, 3.2, 2.4, 2.4, 1.4, 'lime')
    a.box(0.6, 0.4, 2.4, 2.4, 3.0, 'green')
    a.box(3.4, -2.4, 2.4, 2.4, 4.8, 'teal')
    a.paper(0.7, 0.3, 2.2, 2.7, 3.0)
    write('steps.svg', a)


hero()
panel()
panel_phone()
cube()
band()
kit()
steps()
print('written', sorted(p.name for p in OUT.iterdir()))
