import { queueReminders, runJobs } from '@/lib/jobs';
import { bearerMatches } from '@/lib/secret';

/**
 * Queues the reminders due now, then runs due jobs, including retries. Called by the host's scheduler with the
 * CRON_SECRET bearer token, every few minutes.
 */
export async function POST(request: Request) {
  if (!bearerMatches(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Unauthorised', { status: 401 });
  }
  const reminders = await queueReminders();
  const result = await runJobs(50);
  return Response.json({ ...result, reminders });
}
