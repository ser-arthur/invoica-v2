import { renderPdf } from '@invoica/pdf';
import { sampleSnapshot } from '@invoica/documents';
import { chromiumLaunch } from '@/lib/pdf';
import { bearerMatches } from '@/lib/secret';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Whether this host can make a PDF, and how long one takes (docs/spikes/pdf-on-vercel.md): the sample invoice, in
 * the default template. Only with the CRON_SECRET bearer token, since each call starts a browser. Says nothing else.
 */
export async function GET(request: Request) {
  if (!bearerMatches(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Unauthorised', { status: 401 });
  }
  const started = Date.now();
  try {
    const bytes = await renderPdf(sampleSnapshot({ template: 'signature' }), await chromiumLaunch());
    return Response.json(
      { status: 'ok', ms: Date.now() - started, bytes: bytes.byteLength },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('pdf health check failed', (error as Error).message?.slice(0, 200));
    return Response.json(
      { status: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
