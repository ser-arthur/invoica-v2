import { sql } from 'drizzle-orm';
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

/**
 * For health checks: null when the database answers, otherwise why not, in the driver's words. Those name the role,
 * the database or the host, never a password.
 */
export async function databaseProblem(db: Database): Promise<string | null> {
  try {
    await db.execute(sql`select 1`);
    return null;
  } catch (error) {
    return describeDatabaseError(error);
  }
}

interface DriverError {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
  errors?: unknown;
}

/**
 * The code and words of a database error, at most 200 characters: the driver's own error inside a failed query, and
 * the first of several when every address of a host refused.
 */
export function describeDatabaseError(error: unknown): string {
  let e = (error ?? {}) as DriverError;
  for (let depth = 0; depth < 5; depth++) {
    if (e.cause && typeof e.cause === 'object') e = e.cause as DriverError;
    else if (!e.message && Array.isArray(e.errors) && e.errors[0] && typeof e.errors[0] === 'object')
      e = e.errors[0] as DriverError;
    else break;
  }
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message : '';
  return ([code, message].filter(Boolean).join(' ') || 'no reason given').slice(0, 200);
}
