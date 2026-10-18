import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FONT_FILES } from '@invoica/documents';
import { FONTS_DIR } from '@invoica/documents/fonts-dir';

/** Serves the document fonts to the editor's live preview. */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!FONT_FILES.includes(file)) return new Response('Not found', { status: 404 });
  const bytes = await readFile(join(FONTS_DIR, file));
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
