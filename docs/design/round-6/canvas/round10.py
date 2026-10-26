"""The Signature session of 26 October: two directions in light and dark, a light page with a Night head, and
Monochrome from the first Invoica, beside today's Signature."""
import json
from common import write, esc, R6
from round9 import CSS, GAP, W, H, LABEL_H


def board(name, title, cols):
    w = 2 * GAP + len(cols) * W + (len(cols) - 1) * GAP
    h = 2 * GAP + LABEL_H + H
    body = '<div class="bd">' + ''.join(
        f'<div class="col"><div class="lab"><div class="nm">{esc(n)}</div><div class="ln">{esc(l)}</div></div>'
        f'<img src="{{{{IMG:{k}}}}}" alt="{esc(n)}"></div>' for k, n, l in cols) + '</div>'
    write(name, title, w, h, body, CSS, fonts=('Sora', 'Onest'))
    return name, w, h


B = [
    board('S10Crease', 'Signature A, the crease, for Larkspur Analytics', [
        ('r10-a-lark', 'A, light', 'The number large, crossed by the crease; the far side grey, as the website’s headline'),
        ('r10-ah-lark', 'A, with a Night head', 'The sign-in panel’s sheet across the top, its corner turned in the business’s colour; prints light'),
        ('r10-ad-lark', 'A, dark', 'All Night, one shade lighter past the fold; the slip in the business’s colour'),
    ]),
    board('S10CreaseLinden', 'Signature A, the crease, for Linden & Rowe Studio', [
        ('r10-a-lind', 'A, light, in navy', 'With no logo, the name leads'),
        ('r10-ah-lind', 'A, with a Night head, in navy', 'A dark colour still turns the corner, lit along its fold'),
        ('r10-ad-lind', 'A, dark, in navy', 'Navy would sink into Night, so the slip turns white with its corner in navy'),
    ]),
    board('S10Route', 'Signature B, the route', [
        ('r10-b-lark', 'B, light', 'Issued to due along Invoica’s line, the amount due largest, the page’s corner turned like the logo’s i'),
        ('r10-bd-lark', 'B, dark', 'The same on Night'),
        ('r10-b-lind', 'B, light, in navy', 'The corner and the due mark take the business’s colour'),
        ('r10-bd-lind', 'B, dark, in navy', 'A dark colour is lifted until it reads on Night'),
    ]),
    board('S10Today', 'Signature today', [
        ('r10-sig-lark', 'Signature today', 'For comparison: the slip at the top right, the facts in a row'),
        ('r10-sig-lind', 'Signature today, in navy', 'The same for Linden & Rowe'),
    ]),
    board('S10Monochrome', 'Monochrome, from the first Invoica', [
        ('r10-mono-lark', 'Monochrome', 'The first app’s layout in greys: the kind of document large and light, figures in mono, no colour'),
        ('r10-mono-lind', 'Monochrome, no logo', 'Any business, any colour: it looks the same'),
    ]),
]
json.dump(B, open(f'{R6}/gen/round10.json', 'w'))
for b in B:
    print(b)
