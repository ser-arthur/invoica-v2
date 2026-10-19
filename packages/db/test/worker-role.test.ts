import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { claimJobs, drainOutbox, enqueue, finishJob } from '../src/outbox';
import { outbox } from '../src/schema';
import { withOrganisation } from '../src/tenancy';
import { createTestDatabase, createUserWithOrganisation, type TestDatabase } from './helpers';

/**
 * The outbox worker runs as its own role (review 1, L3): the app role can no longer call the functions that claim
 * and finish jobs across organisations, and the worker role can call nothing else.
 */

let t: TestDatabase;
let a: { userId: string; organisationId: string };
let b: { userId: string; organisationId: string };

beforeAll(async () => {
  t = await createTestDatabase();
  a = await createUserWithOrganisation(t, 'Worker Office A');
  b = await createUserWithOrganisation(t, 'Worker Office B');
});

afterAll(async () => {
  await t?.close();
});

const queue = (actor: typeof a, key: string, topic = 'test.job') =>
  withOrganisation(t.db, actor, (tx) => enqueue(tx, actor, topic, { key }, key));

const jobByKey = (actor: typeof a, key: string) =>
  withOrganisation(t.db, actor, async (tx) => {
    const [job] = await tx.select().from(outbox).where(eq(outbox.idempotencyKey, key));
    return job!;
  });

const failure = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (error) {
    return String((error as { cause?: Error }).cause?.message ?? (error as Error).message);
  }
  throw new Error('Expected a failure.');
};

describe('the app role', () => {
  it('cannot claim or finish jobs', async () => {
    await queue(a, 'app-cannot-claim');
    expect(await failure(t.db.execute(sql`select * from app.claim_outbox(10)`))).toMatch(/permission denied/);
    const job = await jobByKey(a, 'app-cannot-claim');
    expect(
      await failure(t.db.execute(sql`select app.finish_outbox(${job.id}::uuid, true, null::text, true)`)),
    ).toMatch(/permission denied|does not exist/);
  });
});

describe('the worker role', () => {
  it('claims jobs from every organisation and finishes them', async () => {
    await queue(a, 'worker-a');
    await queue(b, 'worker-b');
    const jobs = await claimJobs(t.worker.db, 50);
    const orgs = new Set(jobs.map((j) => j.organisationId));
    expect(orgs.has(a.organisationId) && orgs.has(b.organisationId)).toBe(true);
    for (const job of jobs) await finishJob(t.worker.db, job.id, true);
    expect((await jobByKey(a, 'worker-a')).status).toBe('done');
    expect((await jobByKey(b, 'worker-b')).status).toBe('done');
  });

  it('can read and change no table', async () => {
    for (const table of ['outbox', 'document', 'client', 'auth_user', 'organisation']) {
      expect(await failure(t.worker.db.execute(sql.raw(`select 1 from ${table} limit 1`))), table).toMatch(
        /permission denied/,
      );
    }
    expect(await failure(t.worker.db.execute(sql`update outbox set status = 'done'`))).toMatch(
      /permission denied/,
    );
  });

  it('cannot call the app’s functions', async () => {
    expect(await failure(t.worker.db.execute(sql`select * from app.my_organisations()`))).toMatch(
      /permission denied/,
    );
  });
});

describe('failures', () => {
  it('a failure worth retrying goes back to the queue with a delay', async () => {
    await queue(a, 'retry-later', 'test.retry');
    const result = await drainOutbox(
      t.worker.db,
      { 'test.retry': async () => Promise.reject(new Error('provider down')) },
      50,
    );
    expect(result.failed).toBeGreaterThan(0);
    const job = await jobByKey(a, 'retry-later');
    expect([job.status, job.attempts, job.lastError]).toEqual(['pending', 1, 'provider down']);
    expect(job.runAfter.getTime()).toBeGreaterThan(Date.now());
  });

  it('a failure that cannot succeed later fails the job at once', async () => {
    await queue(a, 'never-retry', 'test.permanent');
    const refused = Object.assign(new Error('the sending address is not verified'), { retry: false });
    await drainOutbox(t.worker.db, { 'test.permanent': async () => Promise.reject(refused) }, 50);
    const job = await jobByKey(a, 'never-retry');
    expect([job.status, job.attempts, job.lastError]).toEqual([
      'failed',
      1,
      'the sending address is not verified',
    ]);
  });
});
