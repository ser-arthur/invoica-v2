import { databaseAnswers } from '@invoica/db';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** For the host's health check and uptime monitoring: whether the app can reach its database. Says nothing else. */
export async function GET() {
  const ok = await databaseAnswers(getDb());
  return Response.json(
    { status: ok ? 'ok' : 'unavailable' },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
