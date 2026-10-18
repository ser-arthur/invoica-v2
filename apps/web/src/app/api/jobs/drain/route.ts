import { timingSafeEqual } from 'node:crypto';
import { runJobs } from '@/lib/jobs';

/** Runs due jobs, including retries. Called by the host's scheduler with the CRON_SECRET bearer token. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (
    !secret ||
    given.length !== secret.length ||
    !timingSafeEqual(Buffer.from(given), Buffer.from(secret))
  ) {
    return new Response('Unauthorised', { status: 401 });
  }
  const result = await runJobs(50);
  return Response.json(result);
}
