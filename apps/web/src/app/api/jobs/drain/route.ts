import { queueReminders, runJobs } from '@/lib/jobs';
import { bearerMatches } from '@/lib/secret';

/**
 * Queues the reminders due now, then runs due jobs, including retries. Called by the host's scheduler with the
 * CRON_SECRET bearer token: every fifteen minutes on Vercel (`apps/web/vercel.json`), every five on a server of our
 * own (`deploy/compose.yaml`). The jobs run even when queuing the reminders fails; the answer is then 500, so the
 * scheduler's log and an uptime monitor show it.
 */
export const dynamic = 'force-dynamic';
/** A cold function may start Chromium for the PDFs the jobs need. */
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!bearerMatches(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Unauthorised', { status: 401 });
  }
  let reminders: number | null = null;
  try {
    reminders = await queueReminders();
  } catch (error) {
    console.error('reminder scan failed', (error as Error).message?.slice(0, 200));
  }
  const result = await runJobs(50);
  return Response.json({ ...result, reminders }, { status: reminders === null ? 500 : 200 });
}

/** Vercel's scheduler calls with GET, with the same bearer token (decision 0016). */
export const GET = POST;
