import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export interface MigrationResult {
  applied: string[];
  alreadyApplied: string[];
}

/**
 * Applies every SQL file in migrations/ in name order, each in its own transaction, recording a checksum.
 * Refuses to run when a migration that has already been applied has changed on disk.
 */
export async function migrate(ownerUrl: string, dir = MIGRATIONS_DIR): Promise<MigrationResult> {
  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query(`create table if not exists schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )`);
    const done = new Map<string, string>(
      (
        await client.query<{ name: string; checksum: string }>('select name, checksum from schema_migrations')
      ).rows.map((r) => [r.name, r.checksum]),
    );
    const files = readdirSync(dir)
      .filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f))
      .sort();
    const result: MigrationResult = { applied: [], alreadyApplied: [] };
    for (const file of files) {
      const sql = readFileSync(join(dir, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = done.get(file);
      if (previous) {
        if (previous !== checksum) {
          throw new Error(`Migration ${file} has changed since it was applied. Add a new migration instead.`);
        }
        result.alreadyApplied.push(file);
        continue;
      }
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (name, checksum) values ($1, $2)', [
          file,
          checksum,
        ]);
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
      result.applied.push(file);
    }
    return result;
  } finally {
    await client.end();
  }
}
