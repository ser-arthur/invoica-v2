"""The fourth templates page: Signature, Letter and Ticket, as they are and after a design pass."""
import json
from common import write, esc, R6

GAP = 40
W, H = 794, 1123
LABEL_H = 64
CSS = '''
.bd{box-sizing:border-box;background:#ecefed;padding:40px;display:flex;gap:40px;font-family:'Onest',sans-serif;color:#09191c}
.col{width:794px;flex:none}
.lab{height:64px}
.nm{font-family:'Sora',sans-serif;font-weight:700;font-size:19px;letter-spacing:-.02em}
.ln{font-size:13.5px;color:#4a5b5e;margin-top:3px;line-height:1.35}
.col img{display:block;width:794px;height:1123px;box-shadow:0 0 0 1px rgb(9 25 28 / .08),0 12px 32px -18px rgb(9 25 28 / .35)}
'''


def board(name, title, cols):
    w = 2 * GAP + len(cols) * W + (len(cols) - 1) * GAP
    h = 2 * GAP + LABEL_H + H
    body = '<div class="bd">' + ''.join(
        f'<div class="col"><div class="lab"><div class="nm">{esc(n)}</div><div class="ln">{esc(l)}</div></div>'
        f'<img src="{{{{IMG:{k}}}}}" alt="{esc(n)}"></div>' for k, n, l in cols) + '</div>'
    write(name, title, w, h, body, CSS, fonts=('Sora', 'Onest'))
    return name, w, h


B = [
    board('K4Signature', 'Signature, now and after a design pass', [
        ('k4-sig-now', 'Signature now', 'The amount due at the foot; with this much on it, a second page'),
        ('k4-sig', 'Signature, second pass', 'The amount due first, on a slip with its corner turned like Invoica’s mark; in Invoica’s green, as on the free plan'),
        ('k4-sig-indigo', 'In a business’s own colour', 'The same invoice in indigo'),
    ]),
    board('K4Letter', 'Letter, now and after a design pass', [
        ('k4-let-now', 'Letter now', 'As it is'),
        ('k4-let', 'Letter, second pass', 'A letterhead, fold marks, the address where a window envelope shows it, sessions by date, how to pay as a P.S.'),
    ]),
    board('K4Ticket', 'Ticket, now and after a design pass', [
        ('k4-tic-now', 'Ticket now', 'As it is'),
        ('k4-tic', 'Ticket, second pass', 'A till roll torn from the printer, the amount due on a band of the shop’s colour, a stub to pay from'),
        ('k4-tic-teal', 'In another colour', 'The same receipt in teal'),
    ]),
]
json.dump(B, open(f'{R6}/gen/round9.json', 'w'))
for b in B:
    print(b)
