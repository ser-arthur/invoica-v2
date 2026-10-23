"""Softens the glows on the round 5 boards the website's pictures are taken from (the phones and the dark dashboard),
as on the site itself: each glow eases out to nothing instead of stopping at an edge, under a fine grain, so no edge or
band shows. Run before phone-boards.py and site-shots.js.
Usage: python3 soften-glows.py <canvas project folder>"""
import sys

P = sys.argv[1]
# The site's grain (`--grain` in apps/web/src/app/globals.css): black and white noise at 1%, about one shade either way.
GRAIN = "url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g' x='0' y='0' width='100%25' height='100%25' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='discrete' tableValues='0 1'/%3E%3CfeFuncG type='discrete' tableValues='0 1'/%3E%3CfeFuncB type='discrete' tableValues='0 1'/%3E%3CfeFuncA type='table' tableValues='1 1'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url%28%23g%29' opacity='0.01'/%3E%3C/svg%3E&quot;)"


def eased(shape, rgb, a0, n=10, power=2.2):
    stops = ', '.join(f'rgba({rgb},{a0 * (1 - i / n) ** power:.3f}) {i * 10}%' for i in range(n + 1))
    return f'radial-gradient({shape}, {stops})'


def lit(*glows):
    layers = [GRAIN, *glows]
    sizes = ', '.join(['160px 160px'] + ['auto'] * len(glows))
    return f'background-image: {", ".join(layers)}; background-size: {sizes}'


CHANGES = {
    'R5DashboardPhone.dc.html': [
        ('background-image: radial-gradient(80% 60% at 0% 0%, rgba(55,198,107,0.24), transparent 60%)',
         lit(eased('68% 50% at 0% 0%', '55,198,107', 0.2))),
    ],
    'R5DashboardPhoneDark.dc.html': [
        ('background: linear-gradient(135deg, rgba(55,198,107,0.18), rgba(19,140,134,0.08) 55%, rgba(255,255,255,0.03))',
         'background-color: rgba(255,255,255,0.03); '
         + lit(eased('70% 55% at 0% 0%', '55,198,107', 0.17), eased('60% 50% at 100% 100%', '19,140,134', 0.1))),
    ],
    'R5DashboardDark.dc.html': [
        ('background-image: radial-gradient(45% 40% at 8% 0%, rgba(55,198,107,0.18), transparent 70%), '
         'radial-gradient(40% 45% at 100% 55%, rgba(19,140,134,0.2), transparent 70%)',
         lit(eased('44% 40% at 8% 0%', '55,198,107', 0.16), eased('40% 44% at 100% 55%', '19,140,134', 0.18))),
        ('background: linear-gradient(135deg, rgba(55,198,107,0.16), rgba(19,140,134,0.07) 55%, rgba(255,255,255,0.03))',
         'background-color: rgba(255,255,255,0.03); '
         + lit(eased('60% 90% at 0% 0%', '55,198,107', 0.15), eased('50% 80% at 100% 100%', '19,140,134', 0.09))),
    ],
}

for name, changes in CHANGES.items():
    path = f'{P}/{name}'
    s = open(path, encoding='utf-8').read()
    for old, new in changes:
        if old not in s:
            sys.exit(f'{name}: not found: {old[:60]}')
        s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)
    print(name)
