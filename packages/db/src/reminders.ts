import { and, eq, sql } from 'drizzle-orm';
import {
  DomainError,
  dueReminder,
  nextReminder,
  reminderKind,
  todayIn,
  type BusinessDate,
  type ReminderKind,
  type ReminderWording,
} from '@invoica/core';
import type { ReminderSettingsInput } from '@invoica/schemas';
import type { Database, Tx } from './client';
import { client, document, organisation, outbox, reminderPause } from './schema';
import { audit } from './audit';
import { appliedAmounts } from './documents';
import { enqueue } from './outbox';
import { organisationEntitlements } from './plans';
import { withOrganisation, type Actor } from './tenancy';

/** Reminders about unpaid invoices (docs/specs/reminders.md). */

const scheduledKey = (documentId: string, offset: number) => `reminder:${documentId}:${offset}`;

/**
 * Queues every scheduled reminder due at `now`. The scan reads across organisations only through
 * `app.reminder_candidates`, as the worker role, which returns the ids of invoices that may have a reminder due
 * (`app.due_reminders` serves app images from before migration 0022, decision 0011). Inside
 * each invoice's organisation, as its owner, the plan is checked and the reminder due is chosen with the business
 * date worked out here (`todayIn`, `dueReminder`), as the invoice page works it out, so the database's own time zone
 * data never decides the day. A reminder's key is its invoice and offset, so a second scan queues nothing more.
 * Returns how many this scan added. A reminder that fails to queue is left for the next scan.
 */
export async function queueDueReminders(db: Database, worker: Database, now: Date): Promise<number> {
  const due = await worker.execute<{
    organisation_id: string;
    document_id: string;
    offset_days: number;
    owner_user_id: string;
  }>(sql`select * from app.reminder_candidates(${now})`);
  let queued = 0;
  for (const row of due.rows) {
    const actor: Actor = { userId: row.owner_user_id, organisationId: row.organisation_id };
    try {
      await withOrganisation(db, actor, async (tx) => {
        const [org] = await tx.select().from(organisation).where(eq(organisation.id, actor.organisationId));
        if (!org || !organisationEntitlements(org, now).reminders) return;
        const [doc] = await tx
          .select({ dueDate: document.dueDate, issuedAt: document.issuedAt })
          .from(document)
          .where(eq(document.id, row.document_id));
        if (!doc?.dueDate || !doc.issuedAt) return;
        const offset = dueReminder(
          doc.dueDate,
          org.reminderOffsets,
          todayIn(org.timeZone, now),
          todayIn(org.timeZone, doc.issuedAt),
        );
        if (offset === null) return;
        const added = await enqueue(
          tx,
          actor,
          'document.reminder',
          { documentId: row.document_id, offset },
          scheduledKey(row.document_id, offset),
        );
        if (added) queued += 1;
      });
    } catch (error) {
      // One reminder that cannot be queued waits for the next scan; the others still go.
      console.error('reminder not queued', row.document_id, (error as Error).message?.slice(0, 200));
    }
  }
  return queued;
}

/** Pauses or resumes the scheduled reminders of an invoice. */
export async function setRemindersPaused(
  tx: Tx,
  actor: Actor,
  documentId: string,
  paused: boolean,
): Promise<void> {
  const [doc] = await tx.select({ kind: document.kind }).from(document).where(eq(document.id, documentId));
  if (!doc || doc.kind !== 'invoice')
    throw new DomainError('document_not_found', 'This invoice does not exist.');
  if (paused) {
    await tx
      .insert(reminderPause)
      .values({ organisationId: actor.organisationId, documentId, pausedBy: actor.userId })
      .onConflictDoNothing();
  } else {
    await tx.delete(reminderPause).where(eq(reminderPause.documentId, documentId));
  }
  await audit(tx, actor, paused ? 'reminders.paused' : 'reminders.resumed', 'document', documentId);
}

export interface ReminderContext {
  to: string;
  kind: ReminderKind;
  wording: ReminderWording | null;
  business: string;
  client: string;
  number: string;
  /** Owed now. */
  balance: number;
  currency: string;
  locale: string;
  dueDate: BusinessDate;
  today: BusinessDate;
  lifecycle: 'issued' | 'sent';
}

/**
 * What a reminder says when it is sent, or null when it should not go: the invoice is paid, credited, settled or
 * void by now, or its client has no email. A scheduled reminder (an offset) also needs reminders on for the
 * organisation and the client, the invoice not paused and a plan that includes them.
 */
export async function reminderContext(
  tx: Tx,
  documentId: string,
  offset: number | null,
  now: Date,
): Promise<ReminderContext | null> {
  const [doc] = await tx.select().from(document).where(eq(document.id, documentId));
  if (!doc || doc.kind !== 'invoice' || (doc.lifecycle !== 'issued' && doc.lifecycle !== 'sent')) return null;
  if (!doc.dueDate || !doc.number) return null;
  const [org] = await tx.select().from(organisation).where(eq(organisation.id, doc.organisationId));
  const [owner] = await tx.select().from(client).where(eq(client.id, doc.clientId));
  if (!org || !owner?.email) return null;
  const applied = (await appliedAmounts(tx, [doc.id])).get(doc.id)!;
  const balance = doc.total - applied.paid - applied.credited;
  if (balance <= 0) return null;
  if (offset !== null) {
    const [paused] = await tx.select().from(reminderPause).where(eq(reminderPause.documentId, doc.id));
    if (!org.remindersEnabled || !owner.remindersEnabled || paused) return null;
    if (!organisationEntitlements(org, now).reminders) return null;
  }
  const today = todayIn(org.timeZone, now);
  // Worded for the day it goes, so a reminder caught up after its day reads as late.
  const kind = reminderKind(doc.dueDate, today);
  return {
    to: owner.email,
    kind,
    wording: org.reminderWording[kind] ?? null,
    business: org.name,
    client: owner.contactName || owner.name,
    number: doc.number,
    balance,
    currency: doc.currency,
    locale: org.locale,
    dueDate: doc.dueDate,
    today,
    lifecycle: doc.lifecycle,
  };
}

/**
 * Queues one reminder at once, whatever the schedule, which it leaves as it is. `key` comes from the request, so a
 * repeated click queues one reminder.
 */
export async function sendReminderNow(
  tx: Tx,
  actor: Actor,
  documentId: string,
  key: string,
  now: Date,
): Promise<void> {
  const [org] = await tx.select().from(organisation).where(eq(organisation.id, actor.organisationId));
  if (!org || !organisationEntitlements(org, now).reminders) {
    throw new DomainError('reminders_not_in_plan', 'Reminders are part of the Pro and Studio plans.');
  }
  const context = await reminderContext(tx, documentId, null, now);
  if (!context) {
    throw new DomainError(
      'reminder_not_possible',
      'A reminder can only go for an issued invoice with something owed, to a client with an email address.',
    );
  }
  await enqueue(
    tx,
    actor,
    'document.reminder',
    { documentId, offset: null },
    `reminder:${documentId}:now:${key}`,
  );
  await audit(tx, actor, 'reminder.requested', 'document', documentId);
}

/** Whether an invoice is being reminded about, and when the next reminder goes. */
export async function reminderStatus(
  tx: Tx,
  documentId: string,
  today: BusinessDate,
): Promise<{
  on: boolean;
  clientOn: boolean;
  hasEmail: boolean;
  paused: boolean;
  next: { offset: number; date: BusinessDate } | null;
}> {
  const [doc] = await tx.select().from(document).where(eq(document.id, documentId));
  if (!doc) throw new DomainError('document_not_found', 'This invoice does not exist.');
  const [org] = await tx.select().from(organisation).where(eq(organisation.id, doc.organisationId));
  const [owner] = await tx.select().from(client).where(eq(client.id, doc.clientId));
  const [paused] = await tx.select().from(reminderPause).where(eq(reminderPause.documentId, documentId));
  const jobs = await tx
    .select({ key: outbox.idempotencyKey })
    .from(outbox)
    .where(and(eq(outbox.topic, 'document.reminder'), sql`${outbox.payload}->>'documentId' = ${documentId}`));
  const sent = jobs
    .map((j) => /^reminder:[^:]+:(-?\d+)$/.exec(j.key)?.[1])
    .filter((o): o is string => o !== undefined)
    .map(Number);
  const on = !!org?.remindersEnabled;
  let next: { offset: number; date: BusinessDate } | null = null;
  if (on && doc.dueDate) {
    // The scan sends today the reminder that is due and not yet sent, before any later one.
    const issuedOn = doc.issuedAt ? todayIn(org!.timeZone, doc.issuedAt) : today;
    const dueToday = dueReminder(doc.dueDate, org!.reminderOffsets, today, issuedOn);
    next =
      dueToday !== null && !sent.includes(dueToday)
        ? { offset: dueToday, date: today }
        : nextReminder(doc.dueDate, org!.reminderOffsets, today, sent);
  }
  return {
    on,
    clientOn: !!owner?.remindersEnabled,
    hasEmail: !!owner?.email,
    paused: !!paused,
    next,
  };
}

/** Saves when reminders go and what they say. */
export async function updateReminderSettings(
  tx: Tx,
  actor: Actor,
  input: ReminderSettingsInput,
  now: Date = new Date(),
): Promise<void> {
  if (input.remindersEnabled) {
    const [org] = await tx.select().from(organisation).where(eq(organisation.id, actor.organisationId));
    if (!org || !organisationEntitlements(org, now).reminders) {
      throw new DomainError('reminders_not_in_plan', 'Reminders are part of the Pro and Studio plans.');
    }
  }
  await tx
    .update(organisation)
    .set({
      remindersEnabled: input.remindersEnabled,
      reminderOffsets: input.reminderOffsets,
      reminderWording: input.reminderWording,
    })
    .where(eq(organisation.id, actor.organisationId));
  await audit(tx, actor, 'organisation.reminders_updated', 'organisation', actor.organisationId, {
    enabled: input.remindersEnabled,
    offsets: input.reminderOffsets,
    ownWording: Object.keys(input.reminderWording),
  });
}
