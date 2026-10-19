import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { createDatabase, type DatabaseHandle } from '../src/client';
import { migrate } from '../src/migrate';
import { dropDatabase, provisionDatabase } from '../src/provision';
import { authUser } from '../src/schema';
import { withUser } from '../src/tenancy';

export const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL ?? '';

export interface TestDatabase extends DatabaseHandle {
  name: string;
  ownerUrl: string;
  appUrl: string;
  workerUrl: string;
  /** Connected as the worker role, which only runs the outbox functions. */
  worker: DatabaseHandle;
  close(): Promise<void>;
}

/** A fresh, migrated database for one test file, connected as the app role. */
export async function createTestDatabase(): Promise<TestDatabase> {
  if (!ADMIN_URL)
    throw new Error('Set TEST_DATABASE_ADMIN_URL to a superuser connection for the test server.');
  const name = `invoica_test_${randomBytes(4).toString('hex')}`;
  const urls = await provisionDatabase({
    adminUrl: ADMIN_URL,
    database: name,
    appPassword: 'invoica_app',
    ownerPassword: 'invoica_owner',
  });
  await migrate(urls.ownerUrl);
  const handle = createDatabase(urls.appUrl, { max: 5 });
  const worker = createDatabase(urls.workerUrl, { max: 2 });
  return {
    ...handle,
    name,
    ...urls,
    worker,
    async close() {
      await handle.pool.end();
      await worker.pool.end();
      await dropDatabase(ADMIN_URL, name);
    },
  };
}

let counter = 0;

/** Creates a user and an organisation they own. Returns the actor for that organisation. */
export async function createUserWithOrganisation(t: TestDatabase, orgName: string) {
  counter += 1;
  const userId = `user_${counter}_${randomBytes(3).toString('hex')}`;
  await t.db
    .insert(authUser)
    .values({ id: userId, name: `Test user ${counter}`, email: `${userId}@example.test` });
  const organisationId = await withUser(t.db, userId, async (tx) => {
    const r = await tx.execute<{ id: string }>(
      sql`select app.create_organisation(${orgName}, 'GB', 'GBP', 'Europe/London', 30) as id`,
    );
    return r.rows[0]!.id;
  });
  return { userId, organisationId };
}
