"""Rasterises every PDF in out/<candidate>/ at 80 dpi with pdftoppm into work/png/, then builds one contact
sheet per candidate and document (pages side by side) in work/sheets/ for visual review.
With --footers DOC, also writes out/png/footers-DOC.png: the bottom 26 mm of page 1 at 200 dpi for each candidate.
Usage: python3 -I src/sheets.py [--footers d4-long-names]
"""
import os
import subprocess
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out')
WORK = os.path.join(ROOT, 'work')
CANDS = sorted(d for d in os.listdir(OUT) if d.startswith('c') and os.path.isdir(os.path.join(OUT, d)))


def rasterise():
    for cand in CANDS:
        dst = os.path.join(WORK, 'png', cand)
        os.makedirs(dst, exist_ok=True)
        for f in sorted(os.listdir(os.path.join(OUT, cand))):
            if f.endswith('.pdf'):
                subprocess.run(['pdftoppm', '-png', '-r', '80', os.path.join(OUT, cand, f), os.path.join(dst, f[:-4])], check=True)


def sheets():
    os.makedirs(os.path.join(WORK, 'sheets'), exist_ok=True)
    for cand in CANDS:
        src = os.path.join(WORK, 'png', cand)
        docs = sorted({f.rsplit('-', 1)[0] for f in os.listdir(src)})
        for doc in docs:
            pages = sorted((f for f in os.listdir(src) if f.rsplit('-', 1)[0] == doc), key=lambda f: int(f.rsplit('-', 1)[1][:-4]))
            ims = [Image.open(os.path.join(src, p)).convert('RGB') for p in pages]
            w, h = ims[0].size
            sheet = Image.new('RGB', (len(ims) * (w + 12) + 12, h + 24), (150, 150, 150))
            for i, im in enumerate(ims):
                sheet.paste(im, (12 + i * (w + 12), 12))
            sheet.save(os.path.join(WORK, 'sheets', f'{cand}__{doc}.png'))


def footers(doc):
    strips = []
    for cand in CANDS:
        pdf = os.path.join(OUT, cand, f'{doc}.pdf')
        if not os.path.exists(pdf):
            continue
        base = os.path.join(WORK, 'footer-strip')
        os.makedirs(base, exist_ok=True)
        stem = os.path.join(base, f'{cand}-{doc}')
        # A4 at 200 dpi is 1654 x 2339 px; the strip is the bottom 26 mm (205 px).
        subprocess.run(['pdftoppm', '-png', '-r', '200', '-f', '1', '-l', '1', '-x', '0', '-y', str(2339 - 205), '-W', '1654', '-H', '205', '-singlefile', pdf, stem], check=True)
        strips.append((cand, Image.open(stem + '.png').convert('RGB')))
    w = max(im.size[0] for _, im in strips)
    out = Image.new('RGB', (w, sum(im.size[1] + 30 for _, im in strips)), (255, 255, 255))
    y = 0
    draw = ImageDraw.Draw(out)
    for cand, im in strips:
        draw.rectangle([0, y, w, y + 30], fill=(235, 235, 235))
        draw.text((10, y + 9), cand, fill=(0, 0, 0))
        out.paste(im, (0, y + 30))
        y += im.size[1] + 30
    os.makedirs(os.path.join(OUT, 'png'), exist_ok=True)
    out.save(os.path.join(OUT, 'png', f'footers-{doc}.png'), optimize=True)


if __name__ == '__main__':
    if '--footers' in sys.argv:
        footers(sys.argv[sys.argv.index('--footers') + 1])
    else:
        rasterise()
        sheets()
