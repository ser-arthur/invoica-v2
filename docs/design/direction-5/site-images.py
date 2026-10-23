"""Turns the captures from site-shots.js into the WebP pictures under apps/web/src/components/site/images/.
Cut-outs of rounded cards get transparent corners at their own radius (twice the CSS radius, at 2x).
Usage: python3 site-images.py <captures folder>"""
import os
import sys
from PIL import Image, ImageDraw

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'apps', 'web', 'src', 'components', 'site', 'images')
JOBS = [('editor.png', 'sheet-editor', 1120, 0), ('invoice.png', 'sheet-invoice', 1120, 0), ('dashboard-dark.png', 'sheet-dashboard', 1120, 0),
        ('editor-lines.png', 'write-lines', 940, 44), ('editor-preview.png', 'write-preview', 640, 52), ('invoice-paper.png', 'issue-paper', 680, 8),
        ('chasing.png', 'remind-chasing', 1120, 44), ('phone.png', 'phone-light', 600, 0), ('phone-dark.png', 'phone-dark', 600, 0)]


def rounded(im, r):
    im = im.convert('RGBA')
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=r, fill=255)
    im.putalpha(mask)
    return im


for src, name, width, radius in JOBS:
    im = Image.open(os.path.join(SRC, src))
    im = rounded(im, radius) if radius else im.convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), quality=84, method=6)
    print(name, im.size)
