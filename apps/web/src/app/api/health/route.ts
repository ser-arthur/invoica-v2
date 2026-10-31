import { databaseProblem } from '@invoica/db';
import { getDb, getWorkerDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * For the host's health check and uptime monitoring: whether the app can reach its database, as the app role and as
 * the worker role. The answer says nothing else; when either cannot connect, the function's log names the setting and
 * the driver's reason.
 */
export async function GET() {
  const [app, worker] = await Promise.all([databaseProblem(getDb()), databaseProblem(getWorkerDb())]);
  if (app) console.error(`health check: DATABASE_URL: ${app}`);
  if (worker) console.error(`health check: DATABASE_WORKER_URL: ${worker}`);
  const ok = !app && !worker;
  return Response.json(
    { status: ok ? 'ok' : 'unavailable' },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
