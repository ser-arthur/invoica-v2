import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { closePdfRenderer, renderPdf } from '../src/index';
import { TEMPLATES } from '@invoica/documents';
import { FIXTURES } from '../../documents/test/fixtures';

/**
 * Each template's PDF, compared with an approved image (decision 0003: a fixed pack of documents rendered on every
 * change and compared with approved images). Pages are rasterised in greyscale at 50 dpi and kept as gzipped PGM
 * files in test/baselines. A page passes when at most 0.5% of its pixels differ by more than a quarter of the grey
 * range, which allows for anti-aliasing and catches anything that moves, appears or disappears.
 *
 * After an intended change, look at the new images, then approve them with
 * `UPDATE_BASELINES=1 pnpm --filter @invoica/pdf test visual`.
 */

const executablePath = process.env.CHROMIUM_PATH || undefined;
const update = process.env.UPDATE_BASELINES === '1';
const baselines = join(import.meta.dirname, 'baselines');
const work = mkdtempSync(join(tmpdir(), 'invoica-visual-'));
afterAll(closePdfRenderer);

interface Grey {
  width: number;
  height: number;
  pixels: Buffer;
}

function readPgm(bytes: Buffer): Grey {
  // Binary PGM: "P5", width, height, max value, one whitespace character, then one byte per pixel.
  const header = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(bytes.subarray(0, 64).toString('latin1'));
  if (!header) throw new Error('Not a binary PGM image.');
  const width = Number(header[1]);
  const height = Number(header[2]);
  return { width, height, pixels: bytes.subarray(header[0].length, header[0].length + width * height) };
}

function rasterise(pdf: Buffer, page: number, name: string): Buffer {
  const path = join(work, `${name}.pdf`);
  writeFileSync(path, pdf);
  const base = join(work, name);
  execFileSync('pdftoppm', [
    '-gray',
    '-r',
    '50',
    '-f',
    String(page),
    '-l',
    String(page),
    '-singlefile',
    path,
    base,
  ]);
  return readFileSync(`${base}.pgm`);
}

/** Share of pixels that differ by more than a quarter of the grey range; 1 when the sizes differ. */
function difference(a: Grey, b: Grey): number {
  if (a.width !== b.width || a.height !== b.height) return 1;
  let differing = 0;
  for (let i = 0; i < a.pixels.length; i++) if (Math.abs(a.pixels[i]! - b.pixels[i]!) > 64) differing += 1;
  return differing / a.pixels.length;
}

/** Every template a document can be in: those offered and those retired from the picker. */
const CASES = Object.keys(TEMPLATES).flatMap((template) => [
  { template, fixture: 'ukVat' as const, page: 1 },
  { template, fixture: 'long' as const, page: 2 },
]);

describe('approved images of every template', () => {
  it.each(CASES)('$template, $fixture, page $page', async ({ template, fixture, page }) => {
    const name = `${template}-${fixture}-p${page}`;
    const pdf = Buffer.from(await renderPdf({ ...FIXTURES[fixture]!, template }, { executablePath }));
    const now = rasterise(pdf, page, name);
    const file = join(baselines, `${name}.pgm.gz`);
    if (update || !existsSync(file)) {
      expect(update, `${file} is missing: approve it with UPDATE_BASELINES=1`).toBe(true);
      mkdirSync(baselines, { recursive: true });
      writeFileSync(file, gzipSync(now, { level: 9 }));
      return;
    }
    const share = difference(readPgm(gunzipSync(readFileSync(file))), readPgm(now));
    expect(
      share,
      `${name} differs from its approved image; the new page is ${join(work, `${name}.pgm`)}`,
    ).toBeLessThanOrEqual(0.005);
  });
});
