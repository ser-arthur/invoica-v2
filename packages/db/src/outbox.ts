import { and, asc, inArray, sql } from 'drizzle-orm';
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
): Promise<boolean> {
  const added = await tx
    .insert(outbox)
    .values({
      organisationId: actor.organisationId,
      topic,
      payload,
      idempotencyKey,
      requestedBy: actor.userId,
    })
    .onConflictDoNothing()
    .returning({ id: outbox.id });
  return added.length > 0;
}

export interface ClaimedJob {
  id: string;
  organisationId: string;
  topic: string;
  payload: Record<string, unknown>;
  requestedBy: string | null;
  attempts: number;
}

/** Claims due jobs across every organisation. `db` connects as the worker role. */
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

/** Records a job's outcome. A failure with `retry` false fails the job at once. `db` connects as the worker role. */
export async function finishJob(
  db: Database,
  id: string,
  ok: boolean,
  error: string | null = null,
  retry = true,
): Promise<void> {
  await db.execute(sql`select app.finish_outbox(${id}::uuid, ${ok}, ${error}::text, ${retry})`);
}

export type JobHandler = (job: ClaimedJob) => Promise<void>;

/**
 * Runs due jobs until none are left or `max` have run, claiming and finishing them through `worker` (the worker
 * role). Handlers do their own work inside the job's organisation. An error with `retry: false` is not retried.
 * Returns how many succeeded and failed.
 */
export async function drainOutbox(
  worker: Database,
  handlers: Record<string, JobHandler>,
  max = 20,
): Promise<{ done: number; failed: number }> {
  let done = 0;
  let failed = 0;
  while (done + failed < max) {
    const jobs = await claimJobs(worker, Math.min(5, max - done - failed));
    if (jobs.length === 0) break;
    for (const job of jobs) {
      const handler = handlers[job.topic];
      try {
        if (!handler) throw new Error(`No handler for ${job.topic}`);
        await handler(job);
        await finishJob(worker, job.id, true);
        done += 1;
      } catch (error) {
        // A handler may reject with anything, null included.
        const retry = (error as { retry?: unknown } | null)?.retry !== false;
        const message = (error as Error | null)?.message || 'The job failed without saying why.';
        await finishJob(worker, job.id, false, message, retry);
        failed += 1;
      }
    }
  }
  return { done, failed };
}

/** An email or reminder for a document that has not gone (docs/specs/email-status.md). */
export interface EmailDelivery {
  kind: 'email' | 'reminder';
  /** The address an email was written to; null for a reminder, whose address is the client's when it goes. */
  to: string | null;
  /** Waiting for its first try, tried and waiting to be tried again, or given up on. */
  status: 'sending' | 'retrying' | 'failed';
}

const DELIVERY_TOPICS = { 'document.email': 'email', 'document.reminder': 'reminder' } as const;

/**
 * The emails and reminders for a document that have not gone: each one waiting or being tried again, and the
 * latest of each kind that could not be sent, unless one of that kind was sent or queued after it.
 */
export async function emailDeliveries(tx: Tx, documentId: string): Promise<EmailDelivery[]> {
  const rows = await tx
    .select({
      topic: outbox.topic,
      payload: outbox.payload,
      status: outbox.status,
      lastError: outbox.lastError,
    })
    .from(outbox)
    .where(
      and(
        inArray(outbox.topic, Object.keys(DELIVERY_TOPICS)),
        sql`${outbox.payload} ->> 'documentId' = ${documentId}`,
      ),
    )
    .orderBy(asc(outbox.createdAt), asc(outbox.id));
  const out: EmailDelivery[] = [];
  for (const kind of ['email', 'reminder'] as const) {
    const mine = rows.filter((r) => DELIVERY_TOPICS[r.topic as keyof typeof DELIVERY_TOPICS] === kind);
    const to = (r: (typeof mine)[number]) => (kind === 'email' ? String(r.payload.to ?? '') || null : null);
    for (const r of mine) {
      if (r.status === 'pending' || r.status === 'running') {
        out.push({ kind, to: to(r), status: r.lastError ? 'retrying' : 'sending' });
      }
    }
    const last = mine.at(-1);
    if (last?.status === 'failed') out.push({ kind, to: to(last), status: 'failed' });
  }
  return out;
}

/** An invoice whose latest email or reminder could not be sent, for the dashboard. */
export interface UndeliveredEmail {
  documentId: string;
  number: string;
  clientName: string;
  kind: 'email' | 'reminder';
  to: string | null;
}

/**
 * The invoices still owed on whose latest email, or latest reminder, could not be sent, newest first. One that was
 * sent or queued again since is left out, as on the invoice page, and so is one paid, credited or void since.
 */
export async function undeliveredEmails(tx: Tx, limit = 10): Promise<UndeliveredEmail[]> {
  const result = await tx.execute<{
    document_id: string;
    number: string;
    client_name: string;
    topic: keyof typeof DELIVERY_TOPICS;
    to: string | null;
  }>(sql`
    select l.document_id, d.number, c.name as client_name, l.topic, l.payload ->> 'to' as to
    from (
      select distinct on (o.payload ->> 'documentId', o.topic)
        (o.payload ->> 'documentId')::uuid as document_id, o.topic, o.status, o.payload, o.created_at
      from outbox o
      where o.topic in ('document.email', 'document.reminder')
      order by o.payload ->> 'documentId', o.topic, o.created_at desc, o.id desc
    ) l
    join document d on d.id = l.document_id
    join client c on c.id = d.client_id
    where l.status = 'failed' and d.kind = 'invoice' and d.lifecycle in ('issued', 'sent')
      and d.total
        - coalesce((select sum(p.amount) from payment p where p.document_id = d.id and p.removed_at is null), 0)
        + coalesce((select sum(r.amount) from refund r where r.document_id = d.id), 0)
        - coalesce((
            select sum(n.total) from document n
            where n.credited_document_id = d.id and n.kind = 'credit_note' and n.lifecycle in ('issued', 'sent')
          ), 0) > 0
    order by l.created_at desc
    limit ${limit}
  `);
  return result.rows.map((r) => ({
    documentId: r.document_id,
    number: r.number,
    clientName: r.client_name,
    kind: DELIVERY_TOPICS[r.topic],
    to: DELIVERY_TOPICS[r.topic] === 'email' ? r.to : null,
  }));
}
