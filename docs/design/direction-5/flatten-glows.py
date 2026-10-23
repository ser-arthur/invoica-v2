"""Takes the glows off the round 5 boards the website's pictures are taken from (the phones and the dark dashboard):
each card and page ground becomes flat, and the owed bar one flat lime, as on the site itself (docs/specs/website.md,
rule 11). A faint glow over a dark ground shows as rings on many screens. Run before phone-boards.py and site-shots.js.
Usage: python3 flatten-glows.py <canvas project folder>"""
import sys

P = sys.argv[1]
BAR = ('linear-gradient(90deg, #CFF26A, #6CE4A2)', '#CFF26A')
CARD_DARK = ('background: linear-gradient(135deg, rgba(55,198,107,0.18), rgba(19,140,134,0.08) 55%, rgba(255,255,255,0.03))',
             'background: rgba(255,255,255,0.04)')
CHANGES = {
    'R5DashboardPhone.dc.html': [
        ('background-image: radial-gradient(80% 60% at 0% 0%, rgba(55,198,107,0.24), transparent 60%)', 'background-image: none'),
        BAR,
    ],
    'R5DashboardPhoneDark.dc.html': [CARD_DARK, BAR],
    'R5DashboardDark.dc.html': [
        ('background-image: radial-gradient(45% 40% at 8% 0%, rgba(55,198,107,0.18), transparent 70%), '
         'radial-gradient(40% 45% at 100% 55%, rgba(19,140,134,0.2), transparent 70%)', 'background-image: none'),
        ('background: linear-gradient(135deg, rgba(55,198,107,0.16), rgba(19,140,134,0.07) 55%, rgba(255,255,255,0.03))',
         'background: rgba(255,255,255,0.04)'),
        BAR,
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
