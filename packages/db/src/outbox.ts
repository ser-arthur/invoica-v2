import { sql } from 'drizzle-orm';
import type { Database, Tx } from './client';
import { outbox } from './schema';
import type { Actor } from './tenancy';

/** Queues work to run after the transaction commits. A repeated key is ignored. */
export async function enqueue(
  tx: Tx,
  actor: Actor,
  topic: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
): Promise<void> {
  await tx
    .insert(outbox)
    .values({
      organisationId: actor.organisationId,
      topic,
      payload,
      idempotencyKey,
      requestedBy: actor.userId,
    })
    .onConflictDoNothing();
}

export interface ClaimedJob {
  id: string;
  organisationId: string;
  topic: string;
  payload: Record<string, unknown>;
  requestedBy: string | null;
  attempts: number;
}

export async function claimJobs(db: Database, limit: number): Promise<ClaimedJob[]> {
  const r = await db.execute<{
    id: string;
    organisation_id: string;
    topic: string;
    payload: Record<string, unknown>;
    requested_by: string | null;
    attempts: number;
  }>(sql`select * from app.claim_outbox(${limit})`);
  return r.rows.map((j) => ({
    id: j.id,
    organisationId: j.organisation_id,
    topic: j.topic,
    payload: j.payload,
    requestedBy: j.requested_by,
    attempts: j.attempts,
  }));
}

export async function finishJob(
  db: Database,
  id: string,
  ok: boolean,
  error: string | null = null,
): Promise<void> {
  await db.execute(sql`select app.finish_outbox(${id}::uuid, ${ok}, ${error})`);
}

export type JobHandler = (job: ClaimedJob) => Promise<void>;

/** Runs due jobs until none are left or `max` have run. Returns how many succeeded and failed. */
export async function drainOutbox(
  db: Database,
  handlers: Record<string, JobHandler>,
  max = 20,
): Promise<{ done: number; failed: number }> {
  let done = 0;
  let failed = 0;
  while (done + failed < max) {
    const jobs = await claimJobs(db, Math.min(5, max - done - failed));
    if (jobs.length === 0) break;
    for (const job of jobs) {
      const handler = handlers[job.topic];
      try {
        if (!handler) throw new Error(`No handler for ${job.topic}`);
        await handler(job);
        await finishJob(db, job.id, true);
        done += 1;
      } catch (error) {
        await finishJob(db, job.id, false, (error as Error).message);
        failed += 1;
      }
    }
  }
  return { done, failed };
}
