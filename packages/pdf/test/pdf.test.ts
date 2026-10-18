import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closePdfRenderer, renderPdf } from '../src/index';
import { FIXTURES } from '../../documents/test/fixtures';

const executablePath = process.env.CHROMIUM_PATH || undefined;
const dir = mkdtempSync(join(tmpdir(), 'invoica-pdf-'));
afterAll(closePdfRenderer);

function pdfText(path: string, page?: number) {
  const args = page ? ['-f', String(page), '-l', String(page), path, '-'] : [path, '-'];
  return execFileSync('pdftotext', ['-layout', ...args]).toString();
}

describe('PDF of record', () => {
  it('renders each template with every font embedded', async () => {
    for (const template of ['signature', 'studio', 'counsel']) {
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

  it('breaks a long invoice across pages: headings repeat, the totals stay whole, and pages are numbered', async () => {
    const bytes = await renderPdf(FIXTURES.long!, { executablePath });
    const path = join(dir, 'long.pdf');
    writeFileSync(path, bytes);
    const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [path]).toString())![1]);
    expect(pages).toBeGreaterThanOrEqual(2);
    for (let p = 1; p <= pages; p++) {
      const text = pdfText(path, p);
      expect(text, `page ${p}`).toMatch(/Description/);
      expect(text, `page ${p}`).toContain(`Page ${p} of ${pages}`);
    }
    const last = pdfText(path, pages);
    expect(last).toMatch(/Total/);
    expect(last).toMatch(/Amount due/);
  });
});
