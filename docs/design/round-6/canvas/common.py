"""Helpers shared by the round 6 board generators: one source, two outputs.

A board is written twice: the canvas file (project/<name>.dc.html, uploaded images by their /_blob urls and
fonts from Google Fonts) and a local preview (preview/<name>.html, images from disk and fonts from local
files) that is rendered here to check the design before it goes on the canvas.
"""
import json, os, html

R6 = os.environ.get('R6', os.path.dirname(os.path.abspath(__file__)))
ROOT = os.environ['CANVAS_ROOT']
PROJECT = f'{ROOT}/project'
PREVIEW = f'{R6}/preview'
os.makedirs(PREVIEW, exist_ok=True)
BLOBS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blobs.json')))
NM = os.environ.get('PROTO_FONTS', f'{R6}/fonts/node_modules')
REPO_FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../packages/documents/fonts')

# family -> (google css2 spec, [(local file, weight range, style)])
FONTS = {
    'Sora': ('Sora:wght@400..800', [(f'{REPO_FONTS}/sora-latin-wght-normal.woff2', '100 800', 'normal')]),
    'Onest': ('Onest:wght@400..800', [(f'{REPO_FONTS}/onest-latin-wght-normal.woff2', '100 900', 'normal')]),
    'JetBrains Mono': ('JetBrains+Mono:wght@400..700', [(f'{REPO_FONTS}/jetbrains-mono-latin-wght-normal.woff2', '100 800', 'normal')]),
    'Geist': ('Geist:wght@400..800', [(f'{NM}/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2', '100 900', 'normal')]),
    'Geist Mono': ('Geist+Mono:wght@400..700', [(f'{NM}/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2', '100 900', 'normal')]),
    'Fraunces': ('Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,400..900,0..100,0..1;1,9..144,400..900,0..100,0..1', [
        (f'{NM}/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2', '100 900', 'normal'),
        (f'{NM}/@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2', '100 900', 'italic')]),
    'Figtree': ('Figtree:wght@400..800', [(f'{NM}/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2', '300 900', 'normal')]),
    'Instrument Serif': ('Instrument+Serif:ital@0;1', [
        (f'{NM}/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2', '400', 'normal'),
        (f'{NM}/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2', '400', 'italic')]),
    'Instrument Sans': ('Instrument+Sans:wght@400..700', [(f'{NM}/@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-normal.woff2', '400 700', 'normal')]),
    'Source Serif 4': ('Source+Serif+4:opsz,wght@8..60,400..700', [(f'{NM}/@fontsource-variable/source-serif-4/files/source-serif-4-latin-standard-normal.woff2', '200 900', 'normal')]),
    'Source Sans 3': ('Source+Sans+3:wght@400..700', [(f'{NM}/@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2', '200 900', 'normal')]),
    'IBM Plex Sans': ('IBM+Plex+Sans:wght@400..700', [(f'{NM}/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-standard-normal.woff2', '100 700', 'normal')]),
    'IBM Plex Mono': ('IBM+Plex+Mono:wght@400;700', [
        (f'{NM}/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', '400', 'normal'),
        (f'{NM}/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2', '700', 'normal')]),
    'Unbounded': ('Unbounded:wght@400..900', [(f'{NM}/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2', '200 900', 'normal')]),
    'Manrope': ('Manrope:wght@400..800', [(f'{NM}/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', '200 800', 'normal')]),
    'Cormorant': ('Cormorant:ital,wght@0,400..700;1,400..700', [
        (f'{NM}/@fontsource-variable/cormorant/files/cormorant-latin-wght-normal.woff2', '300 700', 'normal'),
        (f'{NM}/@fontsource-variable/cormorant/files/cormorant-latin-wght-italic.woff2', '300 700', 'italic')]),
    'EB Garamond': ('EB+Garamond:ital,wght@0,400..700;1,400..700', [
        (f'{NM}/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2', '400 800', 'normal'),
        (f'{NM}/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-italic.woff2', '400 800', 'italic')]),
    'Syne': ('Syne:wght@400..800', [(f'{NM}/@fontsource-variable/syne/files/syne-latin-wght-normal.woff2', '400 800', 'normal')]),
    'Space Mono': ('Space+Mono:wght@400;700', [
        (f'{NM}/@fontsource/space-mono/files/space-mono-latin-400-normal.woff2', '400', 'normal'),
        (f'{NM}/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2', '700', 'normal')]),
    'Archivo': ('Archivo:wdth,wght@62..125,400..900', [(f'{NM}/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2', '100 900', 'normal')]),
    'Mona Sans': ('Mona+Sans:wdth,wght@75..125,400..900', [(f'{NM}/@fontsource-variable/mona-sans/files/mona-sans-latin-standard-normal.woff2', '200 900', 'normal')]),
}


def esc(s):
    return html.escape(s, quote=True)


def font_link(families):
    fams = '&amp;'.join(f'family={FONTS[f][0]}' for f in families)
    return f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{fams}&amp;display=swap">'


def font_face_local(families):
    out = []
    for f in families:
        for file, weight, style in FONTS[f][1]:
            out.append(f"@font-face{{font-family:'{f}';src:url('file://{file}') format('woff2');font-weight:{weight};font-style:{style}}}")
    return '\n'.join(out)


def write(name, title, w, h, body, css='', fonts=(), props='{}', local_images=None):
    """Writes project/<name>.dc.html and preview/<name>.html. In `body` and `css`, images are written as
    {{IMG:key}} and swapped for the blob url (canvas) or the local file (preview)."""
    import re

    def swap(text, local):
        def rep(m):
            key = m.group(1)
            if local:
                return f'file://{R6}/assets/{key}.webp'
            return BLOBS[key]
        return re.sub(r'\{\{IMG:([A-Za-z0-9_-]+)\}\}', rep, text)

    p = json.loads(props)
    p['$preview'] = {'width': w, 'height': h}
    props_json = json.dumps(p, ensure_ascii=False).replace('&', '&amp;').replace("'", '&#39;')
    board = f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>{esc(title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{font_link(fonts) if fonts else ''}
<style>
body{{margin:0}}
{swap(css, False)}
</style>
</helmet>
{swap(body, False)}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{props_json}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{}};
  }}
}}
</script>
</body>
</html>
'''
    open(f'{PROJECT}/{name}.dc.html', 'w').write(board)
    preview = f'''<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>{esc(title)}</title>
<style>{font_face_local(fonts)}
body{{margin:0}}
{swap(css, True)}</style></head><body>{swap(body, True)}</body></html>'''
    open(f'{PREVIEW}/{name}.html', 'w').write(preview)
    return name
