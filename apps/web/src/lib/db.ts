import 'server-only';
import { createDatabase, type DatabaseHandle } from '@invoica/db';
import { env } from './env';

const globalForDb = globalThis as unknown as { invoicaDb?: DatabaseHandle; invoicaWorkerDb?: DatabaseHandle };

/** One connection pool per server process, kept across hot reloads in development. */
export function getDb() {
  if (!globalForDb.invoicaDb) globalForDb.invoicaDb = createDatabase(env.databaseUrl, { max: 10 });
  return globalForDb.invoicaDb.db;
}

/** The worker role's pool, used only to claim and finish background jobs. */
export function getWorkerDb() {
  if (!globalForDb.invoicaWorkerDb) {
    globalForDb.invoicaWorkerDb = createDatabase(env.workerDatabaseUrl, { max: 2 });
  }
  return globalForDb.invoicaWorkerDb.db;
}
