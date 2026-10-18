import { requireWorkspace } from '@/lib/session';
import { keptPdf } from '@/lib/pdf';
import { isUuid } from '@/lib/ids';

/** Downloads the kept PDF of an issued invoice or credit note. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new Response('Not found', { status: 404 });
  const { actor } = await requireWorkspace();
  const pdf = await keptPdf(actor, id);
  if (!pdf) return new Response('Not found', { status: 404 });
  const inline = new URL(request.url).searchParams.get('download') !== '1';
  return new Response(new Uint8Array(pdf.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${pdf.number.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
