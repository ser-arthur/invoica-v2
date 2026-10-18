"""Checks every PDF in out/<candidate>/<doc>.pdf against out/expect.json, using poppler tools only.

Each check records how many items it expected, how many it examined, and PASS or FAIL. A check that examined
nothing fails. Writes out/results.json and out/results.md.
Usage: python3 -I src/check.py
"""
import html
import json
import os
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out')
MM = 72 / 25.4
A4 = (595.28, 841.89)
MARGIN_X = 18 * MM          # left and right page margin of the template
FOOTER_ZONE = 20 * MM       # bottom page margin of the template
TOL = 1.0                   # points


def run(args):
    return subprocess.run(args, capture_output=True, check=True).stdout.decode('utf-8', 'replace')


def compact(s):
    return re.sub(r'\s+', '', s)


def base_family(name):
    name = re.sub(r'^[A-Z]{6}\+', '', name)
    return name.split('-')[0].split(',')[0]


def page_info(pdf):
    info = run(['pdfinfo', pdf])
    n = int(re.search(r'Pages:\s+(\d+)', info).group(1))
    sizes = re.findall(r'Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)', run(['pdfinfo', '-f', '1', '-l', str(n), pdf]))
    return n, [(float(w), float(h)) for w, h in sizes]


def page_texts(pdf):
    return run(['pdftotext', '-raw', pdf, '-']).split('\f')[:-1]


def bbox_pages(pdf):
    """Returns per page: (width, height, [(xMin, yMin, xMax, yMax, word)])."""
    out = []
    for chunk in run(['pdftotext', '-bbox', pdf, '-']).split('<page ')[1:]:
        w, h = re.search(r'width="([\d.]+)" height="([\d.]+)"', chunk).groups()
        words = [(float(a), float(b), float(c), float(d), html.unescape(t)) for a, b, c, d, t in
                 re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', chunk)]
        out.append((float(w), float(h), words))
    return out


def text_runs(pdf):
    """Returns per page: [(top_ratio, family, text)] from pdftohtml, with the font family of each text run."""
    root = ET.fromstring(run(['pdftohtml', '-xml', '-i', '-stdout', '-q', pdf]))
    fonts = {f.get('id'): f.get('family') for f in root.iter('fontspec')}
    pages = []
    for p in root.iter('page'):
        height = float(p.get('height'))
        pages.append([(float(t.get('top')) / height, fonts.get(t.get('font'), '?'), ''.join(t.itertext())) for t in p.iter('text')])
    return pages


def pdf_fonts(pdf):
    lines = run(['pdffonts', pdf]).splitlines()
    dashes = lines[1]
    cols, start = [], 0
    for part in dashes.split(' '):
        cols.append((start, start + len(part)))
        start += len(part) + 1
    fonts = []
    for line in lines[2:]:
        cells = [line[a:b].strip() for a, b in cols]
        fonts.append({'name': cells[0], 'type': cells[1], 'emb': cells[3] == 'yes'})
    return fonts


def check(expected, examined, ok, detail=''):
    return {'expected': expected, 'examined': examined, 'result': 'PASS' if (ok and examined > 0 and examined == expected) else 'FAIL', 'detail': detail}


def check_pdf(pdf, exp, probe_pdf=None):
    n, sizes = page_info(pdf)
    texts = page_texts(pdf)
    ctexts = [compact(t) for t in texts]
    boxes = bbox_pages(pdf)
    runs = text_runs(pdf)
    r = {'pages': n, 'bytes': os.path.getsize(pdf), 'checks': {}}
    c = r['checks']

    # Page size: every page A4 within 1 pt.
    a4 = sum(1 for w, h in sizes if abs(w - A4[0]) <= TOL and abs(h - A4[1]) <= TOL)
    c['page_size_a4'] = check(n, len(sizes), a4 == n, f'{a4} of {len(sizes)} pages are A4')

    # Lines: where each line starts and ends, and whether its whole row (date, text, qty, price, amount) reads in order on one page.
    def pages_with(needle):
        k = compact(needle)
        return [i for i, t in enumerate(ctexts) if k in t]

    starts = [pages_with(l['start']) for l in exp['lines']]
    ends = [pages_with(l['end']) for l in exp['lines']]
    found = [i for i in range(len(exp['lines'])) if len(starts[i]) == 1 and len(ends[i]) == 1]
    split = [i + 1 for i in found if starts[i][0] != ends[i][0]]
    c['lines_not_split'] = check(len(exp['lines']), len(found), not split,
                                 f'{len(found)} of {len(exp["lines"])} lines located; split lines: {split or "none"}')
    rows_ok = [i for i, l in enumerate(exp['lines']) if len(pages_with(l['row'])) == 1]
    missing_rows = [i + 1 for i in range(len(exp['lines'])) if i not in rows_ok]
    c['rows_read_in_order'] = check(len(exp['lines']), len(exp['lines']), not missing_rows,
                                    f'{len(rows_ok)} of {len(exp["lines"])} rows found whole (text, quantity, price, amount); not found: {missing_rows or "none"}')

    # Headings: every page that carries a line row also carries the heading row (all heading words on one baseline).
    row_pages = sorted({p for i in found for p in (starts[i] + ends[i])})
    def has_heading(pi):
        words = boxes[pi][2]
        first = [w for w in words if w[4] == exp['headings'][0]]
        for f in first:
            same = {w[4] for w in words if abs(w[1] - f[1]) < 2}
            if all(h in same for h in exp['headings']):
                return True
        return False
    with_heading = [p + 1 for p in row_pages if has_heading(p)]
    stray = [p + 1 for p in range(n) if p not in row_pages and has_heading(p)]
    c['headings_repeat'] = check(len(row_pages), len(row_pages), len(with_heading) == len(row_pages),
                                 f'pages with rows: {[p + 1 for p in row_pages]}; with heading: {with_heading}; heading on a page without rows: {stray or "none"}')

    # Totals block: first and last labels on the same page, and the amount due printed after its label.
    tp = pages_with(exp['totals']['first'])
    lp = pages_with(exp['totals']['last'])
    due_ok = any(compact(exp['totals']['last'] + exp['totals']['due']) in t for t in ctexts)
    examined = 1 if (len(tp) == 1 and len(lp) == 1) else 0
    c['totals_whole'] = check(1, examined, examined == 1 and tp == lp and due_ok,
                              f'"Subtotal" on page {[p + 1 for p in tp]}, "Amount due" on page {[p + 1 for p in lp]}; amount due {exp["totals"]["due"]} {"found" if due_ok else "NOT found"} after its label')

    # Footer text: "Page p of N", invoice number and legal name on every page.
    footer_ok = [p + 1 for p in range(n) if compact(f'Page {p + 1} of {n}') in ctexts[p] and compact(exp['footer']) in ctexts[p]]
    c['footer_text'] = check(n, len(texts), len(footer_ok) == n,
                             f'pages with "Page p of {n}" and "{exp["footer"]}": {footer_ok}')

    # Footer position: the word "Page" of the page counter sits in the bottom margin.
    in_zone = []
    for pi, (w, h, words) in enumerate(boxes):
        if any(wd[4] == 'Page' and wd[1] >= h - FOOTER_ZONE - TOL and wd[3] <= h + TOL for wd in words):
            in_zone.append(pi + 1)
    c['footer_in_bottom_margin'] = check(n, len(boxes), len(in_zone) == n, f'pages with the counter in the bottom 20 mm: {in_zone}')

    # Footer font: fonts of all text runs in the bottom margin, against the body font (font of "Subtotal").
    body = sorted({base_family(f) for page in runs for (_, f, t) in page if 'Subtotal' in t})
    zone = 1 - FOOTER_ZONE / A4[1]
    footer_fams, pages_seen = set(), 0
    for page in runs:
        fams = {base_family(f) for (top, f, t) in page if top >= zone - 0.005 and t.strip()}
        if fams:
            pages_seen += 1
            footer_fams |= fams
    c['footer_font_matches_body'] = check(n, pages_seen, len(body) == 1 and footer_fams == set(body),
                                          f'body font {body}; fonts in bottom margin {sorted(footer_fams)}')

    # Printable area: no word outside the 18 mm side margins or off the page.
    outside = []
    total_words = 0
    for pi, (w, h, words) in enumerate(boxes):
        for wd in words:
            total_words += 1
            if wd[0] < MARGIN_X - TOL or wd[2] > w - MARGIN_X + TOL or wd[1] < 0 or wd[3] > h + TOL:
                outside.append(f'p{pi + 1}:{wd[4][:24]}')
    c['text_inside_margins'] = check(total_words, total_words, not outside,
                                     f'{len(outside)} of {total_words} words outside the side margins or page: {outside[:6]}')

    # Fonts embedded, as pdffonts lists them.
    fonts = pdf_fonts(pdf)
    not_emb = sorted({f['name'] for f in fonts if not f['emb']})
    drawn = sorted({base_family(f) for page in runs for (_, f, t) in page if t.strip()})
    c['fonts_embedded'] = check(len(fonts), len(fonts), not not_emb,
                                f'{len(fonts)} font entries; not embedded: {not_emb or "none"}; families drawn: {drawn}')
    r['font_families'] = sorted({base_family(f['name']) for f in fonts})
    r['fonts_not_embedded'] = not_emb

    # Unbroken token: present in the text with nothing inserted (whitespace from line wraps ignored).
    if exp.get('token'):
        alltext = ''.join(ctexts)
        ok = exp['token'] in alltext
        c['token_intact'] = check(1, 1, ok, 'the 88-character token reads back unchanged' if ok else 'the token text was altered or is missing')

    # Probe: with keep-together off, would the totals block have straddled the page break in this engine?
    if probe_pdf and os.path.exists(probe_pdf):
        pt = [compact(t) for t in page_texts(probe_pdf)]
        a = [i for i, t in enumerate(pt) if 'Subtotal' in t]
        b = [i for i, t in enumerate(pt) if compact('Amount due') in t]
        r['boundary_exercised'] = bool(a and b and a[0] != b[0])
        r['boundary_probe'] = f'keep-together off: "Subtotal" on page {[i + 1 for i in a]}, "Amount due" on page {[i + 1 for i in b]}'
    return r


def main():
    expect = json.load(open(os.path.join(OUT, 'expect.json')))
    timings = json.load(open(os.path.join(OUT, 'timings.json')))
    results = {}
    for cand in sorted(timings):
        results[cand] = {'label': timings[cand]['label'], 'docs': {}}
        for doc_id, exp in expect.items():
            pdf = os.path.join(OUT, cand, f'{doc_id}.pdf')
            if not os.path.exists(pdf):
                results[cand]['docs'][doc_id] = {'missing': True}
                continue
            probe = os.path.join(OUT, 'probe', cand, f'{doc_id}-keepoff.pdf')
            res = check_pdf(pdf, exp, probe)
            t = timings[cand]['docs'].get(doc_id, {})
            res['median_ms'] = t.get('medianMs')
            res['runs_ms'] = t.get('runsMs')
            results[cand]['docs'][doc_id] = res
    json.dump(results, open(os.path.join(OUT, 'results.json'), 'w'), indent=1)
    write_markdown(results, expect)


SHORT = {'page_size_a4': 'A4', 'headings_repeat': 'Head', 'lines_not_split': 'Lines', 'rows_read_in_order': 'Rows',
         'totals_whole': 'Totals', 'footer_text': 'Footer', 'footer_in_bottom_margin': 'FootPos',
         'footer_font_matches_body': 'FootFont', 'text_inside_margins': 'Margins', 'fonts_embedded': 'Embed', 'token_intact': 'Token'}


def write_markdown(results, expect):
    out = ['# Results', '', 'Generated by `python3 -I src/check.py`. Each cell is PASS or FAIL with examined/expected counts.', '']
    for cand, data in results.items():
        out += [f'## {cand}', '', data['label'], '']
        out.append('| Document | Pages | Size (KB) | Median ms | ' + ' | '.join(SHORT.values()) + ' | Boundary exercised |')
        out.append('|' + '---|' * (5 + len(SHORT)))
        for doc_id in expect:
            r = data['docs'].get(doc_id, {})
            if r.get('missing'):
                out.append(f'| {doc_id} | missing |' + ' |' * (3 + len(SHORT)))
                continue
            cells = []
            for key in SHORT:
                ch = r['checks'].get(key)
                cells.append('n/a' if ch is None else f"{ch['result']} {ch['examined']}/{ch['expected']}")
            ex = r.get('boundary_exercised')
            out.append(f"| {doc_id} | {r['pages']} | {r['bytes'] / 1024:.0f} | {r['median_ms']} | " + ' | '.join(cells) + f" | {'n/a' if ex is None else ('yes' if ex else 'no')} |")
        out.append('')
        fails = [(d, k, ch['detail']) for d, r in data['docs'].items() if not r.get('missing') for k, ch in r['checks'].items() if ch['result'] == 'FAIL']
        if fails:
            out.append('Failures:')
            out += [f'- {d}, {SHORT.get(k, k)}: {det}' for d, k, det in fails]
            out.append('')
    open(os.path.join(OUT, 'results.md'), 'w').write('\n'.join(out) + '\n')


if __name__ == '__main__':
    main()
