import 'server-only';
import { reminderEmail, type DocumentSnapshot } from '@invoica/core';
import {
  documentPdfState,
  drainOutbox,
  getOrganisation,
  markSent,
  audit,
  queueDueReminders,
  reminderContext,
  withOrganisation,
  type ClaimedJob,
} from '@invoica/db';
import { getDb, getWorkerDb } from './db';
import { keptPdf } from './pdf';
import { EMAIL_FROM, getEmailAdapter } from './email';
import { messageSender } from './sender';

function actorOf(job: ClaimedJob) {
  if (!job.requestedBy) throw new Error('Job has no requesting user.');
  return { userId: job.requestedBy, organisationId: job.organisationId };
}

const handlers = {
  'document.render_pdf': async (job: ClaimedJob) => {
    await keptPdf(actorOf(job), String(job.payload.documentId));
  },
  /** Emails an issued document with its kept PDF attached, then records it as sent. */
  'document.email': async (job: ClaimedJob) => {
    const actor = actorOf(job);
    const documentId = String(job.payload.documentId);
    const pdf = await keptPdf(actor, documentId);
    if (!pdf) throw new Error('Document not found or not issued.');
    const state = await withOrganisation(getDb(), actor, (tx) => documentPdfState(tx, documentId));
    // A document voided after its email was queued is not sent; the job finishes without sending.
    if (!state || state.lifecycle === 'void') return;
    const snapshot = state.snapshot as unknown as DocumentSnapshot;
    const business = await withOrganisation(getDb(), actor, (tx) => getOrganisation(tx, actor));
    const sent = await getEmailAdapter().send({
      ...messageSender(business, snapshot.seller.email, EMAIL_FROM()),
      to: String(job.payload.to),
      subject: String(job.payload.subject),
      text: String(job.payload.message),
      idempotencyKey: `outbox-${job.id}`,
      attachments: [
        {
          filename: `${pdf.number.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`,
          contentType: 'application/pdf',
          content: pdf.bytes,
        },
      ],
    });
    await withOrganisation(getDb(), actor, async (tx) => {
      if (state.lifecycle === 'issued') await markSent(tx, actor, documentId, new Date(), 'email');
      await audit(tx, actor, 'document.emailed', 'document', documentId, { messageId: sent.id });
    });
  },
  /**
   * Reminds a client about an unpaid invoice (docs/specs/reminders.md), with its kept PDF and what is owed at the
   * moment of sending. Nothing is sent when the invoice is paid, credited, settled or void by then.
   */
  'document.reminder': async (job: ClaimedJob) => {
    const actor = actorOf(job);
    const documentId = String(job.payload.documentId);
    const offset = typeof job.payload.offset === 'number' ? job.payload.offset : null;
    const context = await withOrganisation(getDb(), actor, (tx) =>
      reminderContext(tx, documentId, offset, new Date()),
    );
    if (!context) return;
    const pdf = await keptPdf(actor, documentId);
    if (!pdf) throw new Error('Document not found or not issued.');
    const email = reminderEmail({
      kind: context.kind,
      wording: context.wording,
      business: context.business,
      client: context.client,
      number: context.number,
      balance: context.balance,
      currency: context.currency,
      locale: context.locale,
      dueDate: context.dueDate,
      today: context.today,
    });
    const state = await withOrganisation(getDb(), actor, (tx) => documentPdfState(tx, documentId));
    const snapshot = state?.snapshot as unknown as DocumentSnapshot | undefined;
    const business = await withOrganisation(getDb(), actor, (tx) => getOrganisation(tx, actor));
    const sent = await getEmailAdapter().send({
      ...messageSender(business, snapshot?.seller.email ?? null, EMAIL_FROM()),
      to: context.to,
      subject: email.subject,
      text: email.text,
      idempotencyKey: `outbox-${job.id}`,
      attachments: [
        {
          filename: `${pdf.number.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`,
          contentType: 'application/pdf',
          content: pdf.bytes,
        },
      ],
    });
    await withOrganisation(getDb(), actor, async (tx) => {
      if (context.lifecycle === 'issued') await markSent(tx, actor, documentId, new Date(), 'reminder');
      await audit(tx, actor, 'reminder.sent', 'document', documentId, {
        offset,
        to: context.to,
        balance: context.balance,
        messageId: sent.id,
      });
    });
  },
};

/** Runs due background jobs. Called after requests that queue work, and on a schedule for retries. */
export async function runJobs(max = 10) {
  return drainOutbox(getWorkerDb(), handlers, max);
}

/** Queues the reminders due now. Called on the host's schedule, before the jobs run. */
export async function queueReminders(now = new Date()) {
  return queueDueReminders(getDb(), getWorkerDb(), now);
}
