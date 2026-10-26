"""Invented logos for the invented businesses, drawn as SVG. {BRAND} is replaced by the business's colour."""
import math, os
from textpath import text

NM = os.environ.get('PROTO_FONTS', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'node_modules'))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logos')
os.makedirs(OUT, exist_ok=True)
BODONI = f'{NM}/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-standard-normal.woff2'
BODONI_I = f'{NM}/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-standard-italic.woff2'
CASLON_D = f'{NM}/@fontsource/libre-caslon-display/files/libre-caslon-display-latin-400-normal.woff2'
CASLON_I = f'{NM}/@fontsource/libre-caslon-text/files/libre-caslon-text-latin-400-italic.woff2'
CORM_I = f'{NM}/@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-italic.woff2'
JOST = f'{NM}/@fontsource-variable/jost/files/jost-latin-wght-normal.woff2'


def save(name, body, vb='0 0 200 200'):
    open(f'{OUT}/{name}.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{body}</svg>')


# Odd Hours Press: the sun and the moon, printed in two inks that overlap where they meet.
save('riso', '''
<defs><mask id="m"><rect width="200" height="200" fill="#fff"/><circle cx="152" cy="66" r="50" fill="#000"/></mask></defs>
<circle cx="80" cy="112" r="62" fill="{BRAND}"/>
<circle cx="124" cy="92" r="62" fill="#0078BF" mask="url(#m)" style="mix-blend-mode:multiply"/>
<path d="M176 150 l4.5 11.5 l11.5 4.5 l-11.5 4.5 l-4.5 11.5 l-4.5 -11.5 l-11.5 -4.5 l11.5 -4.5 z" fill="#0078BF" style="mix-blend-mode:multiply"/>
<path d="M36 30 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="{BRAND}"/>
''')

# Marigold Lane: an oval seal with an italic monogram and a marigold above it.
ml, w = text(BODONI_I, 'ML', 60, 100, 136, axes={'wght': 400, 'opsz': 60}, anchor='middle', tracking=-0.02)
petals = ''.join(
    f'<ellipse cx="100" cy="50" rx="3.4" ry="7.5" transform="rotate({a} 100 61)" fill="{{BRAND}}"/>' for a in range(0, 360, 30))
save('bloom', f'''
<ellipse cx="100" cy="104" rx="70" ry="94" fill="none" stroke="{{BRAND}}" stroke-width="2.4"/>
<ellipse cx="100" cy="104" rx="63" ry="87" fill="none" stroke="{{BRAND}}" stroke-width="0.9"/>
{petals}<circle cx="100" cy="61" r="5" fill="#E9A23B"/>
<path d="{ml}" fill="{{BRAND}}"/>
<path d="M74 156 C 88 149, 112 149, 126 156" fill="none" stroke="{{BRAND}}" stroke-width="1.4" stroke-linecap="round"/>''', '0 0 200 208')


# Fern & Fable: a fern frond, its leaflets shortening towards the tip.
def frond(colour):
    parts = [f'<path d="M100 196 C 98 150, 96 100, 104 14" fill="none" stroke="{colour}" stroke-width="3" stroke-linecap="round"/>']
    n = 13
    for i in range(n):
        t = i / (n - 1)
        y = 182 - t * 160
        x = 100 + 4 * t
        L = 46 * (1 - t) ** 0.85 + 6
        for side in (-1, 1):
            ang = side * (62 - 18 * t)
            parts.append(
                f'<ellipse cx="{x + side * L / 2 * math.sin(math.radians(abs(ang))):.1f}" cy="{y - L / 2 * math.cos(math.radians(abs(ang))):.1f}" '
                f'rx="{max(2.2, 6.5 * (1 - t) + 2):.1f}" ry="{L / 2:.1f}" transform="rotate({ang:.1f} {x + side * L / 2 * math.sin(math.radians(abs(ang))):.1f} {y - L / 2 * math.cos(math.radians(abs(ang))):.1f})" fill="{colour}"/>')
    return ''.join(parts)


save('olive', frond('{BRAND}'))
save('olive-light', frond('#E9DDBF'))

# Maison Ivy: one ivy leaf, five-lobed, on a short stem.
save('editorial', '''
<path d="M100 134 C 100 156, 96 174, 88 192" fill="none" stroke="{BRAND}" stroke-width="4" stroke-linecap="round"/>
<path d="M100 18 Q 118 44, 126 78 Q 154 62, 178 68 Q 170 96, 146 112 Q 166 128, 160 150 Q 128 156, 100 136 Q 72 156, 40 150 Q 34 128, 54 112 Q 30 96, 22 68 Q 46 62, 74 78 Q 82 44, 100 18 Z" fill="{BRAND}"/>
<path d="M100 132 L100 34 M100 104 L164 72 M100 104 L36 72 M100 120 L150 142 M100 120 L50 142" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity=".7" fill="none"/>
''')

# Overcast: the sun behind a flat-bottomed cloud.
save('billboard', '''
<circle cx="128" cy="78" r="52" fill="{BRAND}"/>
<path d="M30 150 C 14 150, 10 126, 28 118 C 26 92, 56 80, 74 96 C 82 70, 122 66, 132 96 C 156 90, 172 110, 162 128 C 182 130, 184 150, 166 150 Z" fill="#111111"/>''')

# Overcast on its own colour: a black sun with the cloud passing in front of it.
save('billboard-board', '''
<circle cx="120" cy="92" r="70" fill="#111111"/>
<path d="M22 172 C 4 172, 0 144, 20 135 C 18 105, 52 91, 72 109 C 81 79, 127 75, 138 109 C 165 102, 184 125, 172 145 C 195 147, 197 172, 177 172 Z" fill="{BRAND}"/>''')

# Ashdown Kerr: A and K joined by an italic ampersand, inside a ring.
a, wa = text(CASLON_D, 'A', 86, 0, 0)
k, wk = text(CASLON_D, 'K', 86, 0, 0)
amp, wamp = text(CASLON_I, '&', 62, 0, 0)
gap = -6
total = wa + wamp + wk + 2 * gap
x0 = 100 - total / 2
A, _ = text(CASLON_D, 'A', 86, x0, 128)
AMP, _ = text(CASLON_I, '&', 62, x0 + wa + gap, 124)
K, _ = text(CASLON_D, 'K', 86, x0 + wa + gap + wamp + gap, 128)
save('practice', f'''
<circle cx="100" cy="100" r="94" fill="none" stroke="{{BRAND}}" stroke-width="2.2"/>
<circle cx="100" cy="100" r="87" fill="none" stroke="{{BRAND}}" stroke-width=".8"/>
<path d="{A} {K}" fill="{{BRAND}}"/><path d="{AMP}" fill="#B08D57"/>''')
save('practice-light', f'''
<circle cx="100" cy="100" r="94" fill="none" stroke="#F3EEE4" stroke-width="2.2"/>
<circle cx="100" cy="100" r="87" fill="none" stroke="#F3EEE4" stroke-width=".8"/>
<path d="{A} {K}" fill="#F3EEE4"/><path d="{AMP}" fill="#C9A86A"/>''')

# Kestrel Roofing: two roof lines in a yellow house, for a dark band.
save('trade', '''
<path d="M100 6 L194 74 V196 H6 V74 Z" fill="{BRAND}"/>
<path d="M38 112 L100 66 L162 112" fill="none" stroke="#161616" stroke-width="17"/>
<path d="M38 152 L100 106 L162 152" fill="none" stroke="#161616" stroke-width="17"/>''')

print(sorted(os.listdir(OUT)))
