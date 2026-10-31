// Connects with the address in CHECK_URL and says whom it connected as, or why it could not. Prints no address.
import { sql } from 'drizzle-orm';
import { createDatabase, describeDatabaseError } from '../src/client';

const url = process.env.CHECK_URL;
if (!url) {
  console.error('Set CHECK_URL to the postgres:// address to check.');
  process.exit(1);
}
const { db, pool } = createDatabase(url, { max: 1 });
try {
  const result = await db.execute<{ role: string; database: string; version: string }>(
    sql`select current_user as role, current_database() as database, current_setting('server_version') as version`,
  );
  const row = result.rows[0]!;
  console.log(`Connected as ${row.role} to ${row.database}, PostgreSQL ${row.version}.`);
} catch (error) {
  console.error(`Could not connect: ${describeDatabaseError(error)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
