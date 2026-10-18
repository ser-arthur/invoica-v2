import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser } from 'playwright-core';
import type { DocumentSnapshot } from '@invoica/core';
import { esc, renderDocumentHtml } from '@invoica/documents';
import { FONTS_DIR } from '@invoica/documents/fonts-dir';

const fontCache = new Map<string, string>();

/** A font file as a data URL, so the PDF renderer needs no network or file access. */
export function fontDataUrl(file: string): string {
  let url = fontCache.get(file);
  if (!url) {
    url = `data:font/woff2;base64,${readFileSync(join(FONTS_DIR, file)).toString('base64')}`;
    fontCache.set(file, url);
  }
  return url;
}

let browser: Promise<Browser> | null = null;

function getBrowser(executablePath?: string): Promise<Browser> {
  if (!browser) {
    browser = chromium.launch({
      executablePath,
      args: ['--disable-dev-shm-usage', '--font-render-hinting=none'],
    });
    browser.catch(() => {
      browser = null;
    });
  }
  return browser;
}

export async function closePdfRenderer(): Promise<void> {
  const b = browser;
  browser = null;
  if (b) await (await b).close();
}

export interface PdfOptions {
  executablePath?: string;
  logoDataUrl?: string | null;
}

/**
 * The PDF of record for a document: its snapshot rendered with the pinned Chromium, every font embedded,
 * and each page numbered "Page 1 of 2" with the document number.
 */
export async function renderPdf(snapshot: DocumentSnapshot, options: PdfOptions = {}): Promise<Uint8Array> {
  const html = renderDocumentHtml(snapshot, { fontUrl: fontDataUrl, logoUrl: options.logoDataUrl ?? null });
  const b = await getBrowser(options.executablePath);
  const context = await b.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.route('**/*', (route) =>
      route.request().url().startsWith('data:') ? route.continue() : route.abort(),
    );
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready).catch(() => undefined);
    const label = `${snapshot.kind === 'credit_note' ? 'Credit note' : 'Invoice'} ${snapshot.number}`;
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;color:#7a837e;padding:0 16mm;display:flex;justify-content:space-between"><span>${esc(label)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      tagged: true,
    });
    return new Uint8Array(pdf);
  } finally {
    await context.close();
  }
}
