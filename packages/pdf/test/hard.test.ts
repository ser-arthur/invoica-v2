import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser } from 'playwright-core';
import { formatMoney, type DocumentSnapshot } from '@invoica/core';
import { TEMPLATES as ALL, renderDocumentHtml } from '@invoica/documents';
import { closePdfRenderer, fontDataUrl, renderPdf } from '../src/index';
import { CURRENCIES, HARD } from '../../documents/test/hard-fixtures';

/**
 * The hard document pack, on every template (decision 0003): long names and unbroken words, a description longer
 * than a page, 120 lines, bare and full addresses, and every supported currency.
 */

const executablePath = process.env.CHROMIUM_PATH || undefined;
const dir = mkdtempSync(join(tmpdir(), 'invoica-hard-'));
/** Every template a document can be in: those offered and those retired from the picker. */
const TEMPLATES = Object.keys(ALL);
/** A4 at 96 pixels to the inch. */
const A4_WIDTH = 794;

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ executablePath });
});
afterAll(async () => {
  await browser?.close();
  await closePdfRenderer();
});

const clean = (s: string) => s.replace(/[\s\u00a0\u202f]+/g, ' ');

async function pdfPages(snapshot: DocumentSnapshot, name: string): Promise<string[]> {
  const bytes = await renderPdf(snapshot, { executablePath });
  const path = join(dir, `${name}.pdf`);
  writeFileSync(path, bytes);
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [path]).toString())![1]);
  return Array.from({ length: pages }, (_, i) =>
    clean(execFileSync('pdftotext', ['-f', String(i + 1), '-l', String(i + 1), path, '-']).toString()),
  );
}

/** Text that reaches past the right edge of an A4 page when the document is shown at A4 width. */
async function overflowing(snapshot: DocumentSnapshot): Promise<string[]> {
  const page = await browser.newPage({ viewport: { width: A4_WIDTH, height: 1123 } });
  try {
    await page.setContent(renderDocumentHtml(snapshot, { fontUrl: fontDataUrl }), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    return await page.evaluate((width) => {
      const out: string[] = [];
      if (document.documentElement.scrollWidth > width)
        out.push(`page is ${document.documentElement.scrollWidth}px wide`);
      for (const el of document.querySelectorAll('body *')) {
        if (el.childElementCount > 0 || !(el.textContent ?? '').trim()) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > width + 0.5) out.push((el.textContent ?? '').trim().slice(0, 50));
      }
      // Text set along a curve is cut where the curve ends: it must fit the curve's length.
      for (const tp of document.querySelectorAll('textPath')) {
        const text = tp.closest('text') as SVGTextElement | null;
        const path = document.querySelector(tp.getAttribute('href') ?? '') as SVGPathElement | null;
        if (text && path && text.getComputedTextLength() > path.getTotalLength() + 0.5)
          out.push(`${(tp.textContent ?? '').slice(0, 50)} runs past its curve`);
      }
      return out;
    }, A4_WIDTH);
  } finally {
    await page.close();
  }
}

describe.each(TEMPLATES)('the hard documents with %s', (template) => {
  it('keeps long names, long words and full addresses on the page', async () => {
    for (const name of ['longNames', 'fullAddresses', 'bareAddresses', 'manyLines'] as const) {
      expect(await overflowing({ ...HARD[name]!, template }), name).toEqual([]);
    }
  });

  it('prints every one of 120 lines exactly once, numbers every page and ends with the totals', async () => {
    const s = { ...HARD.manyLines!, template };
    const pages = await pdfPages(s, `many-${template}`);
    expect(pages.length).toBeGreaterThan(1);
    const all = pages.join(' ');
    for (let i = 1; i <= 120; i++) {
      const title = `Item ${String(i).padStart(3, '0')}`;
      expect(all.split(title).length - 1, title).toBe(1);
    }
    pages.forEach((text, i) => expect(text, `page ${i + 1}`).toContain(`Page ${i + 1} of ${pages.length}`));
    expect(clean(pages.at(-1)!)).toContain(clean(formatMoney(s.totals.total, s.currency)));
    expect(clean(all)).toContain(clean(formatMoney(s.balanceDue, s.currency)));
  });

  it('prints a description longer than a page in full', async () => {
    const s = { ...HARD.longDescription!, template };
    const all = (await pdfPages(s, `desc-${template}`)).join(' ');
    expect(all).toContain('End of description.');
    expect(all).toContain('Expenses');
    expect(all).toContain(clean(formatMoney(s.totals.total, s.currency)));
  });

  it('shows the figures of every supported currency', () => {
    for (const c of CURRENCIES) {
      const html = clean(renderDocumentHtml({ ...c, template }, { fontUrl: (f) => f }));
      expect(html, c.currency).toContain(clean(formatMoney(c.totals.total, c.currency)));
      expect(html, c.currency).toContain(clean(formatMoney(c.totals.lines[0]!.amount, c.currency)));
    }
  });

  it('embeds and prints currencies with no minor unit and with three decimals', async () => {
    for (const code of ['JPY', 'KWD', 'GHS']) {
      const c = CURRENCIES.find((x) => x.currency === code)!;
      const all = (await pdfPages({ ...c, template }, `${code}-${template}`)).join(' ');
      expect(all, code).toContain(clean(formatMoney(c.totals.total, code)));
    }
  });
});
