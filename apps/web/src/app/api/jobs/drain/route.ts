import { runJobs } from '@/lib/jobs';
import { bearerMatches } from '@/lib/secret';

/** Runs due jobs, including retries. Called by the host's scheduler with the CRON_SECRET bearer token. */
export async function POST(request: Request) {
  if (!bearerMatches(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Unauthorised', { status: 401 });
  }
  const result = await runJobs(50);
  return Response.json(result);
}
