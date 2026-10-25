"""The fourth templates page: Signature, Letter and Ticket, as they were and as built after the owner's choices."""
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
    board('K4Signature', 'Signature, as it was and as built', [
        ('k4-sig-now', 'Signature as it was', 'The amount due at the foot; with this much on it, a second page'),
        ('k5-sig-indigo', 'Signature as built', 'The amount due first, on a slip of the business’s colour with its corner turned; here in indigo'),
    ]),
    board('K4Letter', 'Letter, as it was and as built', [
        ('k4-let-now', 'Letter as it was', 'The layout you chose to keep'),
        ('k5-let', 'Letter as built', 'The invoice and its number larger, and the name under “With thanks”'),
    ]),
    board('K4Ticket', 'Ticket, as it was and as built', [
        ('k4-tic-now', 'Ticket as it was', 'A receipt in a bordered column'),
        ('k5-tic', 'Ticket as built', 'The till roll on grey, the amount due band inside the paper’s margins'),
        ('k5-tic-teal', 'In another colour', 'The same receipt in teal'),
    ]),
]
json.dump(B, open(f'{R6}/gen/round9.json', 'w'))
for b in B:
    print(b)
