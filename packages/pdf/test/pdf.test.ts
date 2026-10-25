import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closePdfRenderer, renderPdf } from '../src/index';
import { TEMPLATES } from '@invoica/documents';
import { FIXTURES } from '../../documents/test/fixtures';

/** Every template a document can be in: those offered and those retired from the picker. */
const ALL = Object.keys(TEMPLATES);

const executablePath = process.env.CHROMIUM_PATH || undefined;
const dir = mkdtempSync(join(tmpdir(), 'invoica-pdf-'));
afterAll(closePdfRenderer);

function pdfText(path: string, page?: number) {
  const args = page ? ['-f', String(page), '-l', String(page), path, '-'] : [path, '-'];
  return execFileSync('pdftotext', ['-layout', ...args]).toString();
}

describe('PDF of record', () => {
  it('renders each template with every font embedded', async () => {
    for (const template of ALL) {
      const bytes = await renderPdf({ ...FIXTURES.ukVat!, template }, { executablePath });
      const path = join(dir, `${template}.pdf`);
      writeFileSync(path, bytes);
      const fonts = execFileSync('pdffonts', [path]).toString().split('\n').slice(2).filter(Boolean);
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts.every((l) => / yes /.test(l))).toBe(true);
      const text = pdfText(path);
      expect(text).toContain('£6,720.00');
      expect(text).toContain('£5,220.00');
    }
  });

  it.each(ALL)(
    'fits an ordinary invoice of a few lines, with its payment details, on one page with %s',
    async (template) => {
      for (const name of ['ukVat', 'freelancerAmounts', 'ghana'] as const) {
        const bytes = await renderPdf({ ...FIXTURES[name]!, template }, { executablePath });
        const path = join(dir, `short-${template}-${name}.pdf`);
        writeFileSync(path, bytes);
        const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [path]).toString())![1]);
        expect(pages, name).toBe(1);
      }
    },
  );

  it.each(ALL)(
    'breaks a long invoice across pages with %s: headings repeat, totals stay whole, pages numbered',
    async (template) => {
      const bytes = await renderPdf({ ...FIXTURES.long!, template }, { executablePath });
      const path = join(dir, `long-${template}.pdf`);
      writeFileSync(path, bytes);
      const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [path]).toString())![1]);
      expect(pages).toBeGreaterThanOrEqual(2);
      let examined = 0;
      for (let p = 1; p <= pages; p++) {
        const text = pdfText(path, p);
        // Every page that carries lines repeats the table heading; the ticket template lists lines without one.
        if (template !== 'ticket' && p < pages) expect(text, `page ${p}`).toMatch(/Description/i);
        expect(text, `page ${p}`).toContain(`Page ${p} of ${pages}`);
        examined += 1;
      }
      expect(examined).toBe(pages);
      const all = Array.from({ length: pages }, (_, i) => pdfText(path, i + 1)).join('');
      expect(all).toMatch(/Total/);
      // Some templates set the label in capitals.
      expect(all).toMatch(/amount due/i);
      expect(all).toContain('£');
    },
  );
});
