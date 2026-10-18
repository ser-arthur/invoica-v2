import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface DatabaseHandle {
  db: Database;
  pool: pg.Pool;
}

export function createDatabase(url: string, options: { max?: number } = {}): DatabaseHandle {
  const pool = new pg.Pool({ connectionString: url, max: options.max ?? 10 });
  return { db: drizzle(pool, { schema }), pool };
}
