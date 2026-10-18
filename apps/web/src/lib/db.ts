import 'server-only';
import { createDatabase, type DatabaseHandle } from '@invoica/db';
import { env } from './env';

const globalForDb = globalThis as unknown as { invoicaDb?: DatabaseHandle };

/** One connection pool per server process, kept across hot reloads in development. */
export function getDb() {
  if (!globalForDb.invoicaDb) globalForDb.invoicaDb = createDatabase(env.databaseUrl, { max: 10 });
  return globalForDb.invoicaDb.db;
}
