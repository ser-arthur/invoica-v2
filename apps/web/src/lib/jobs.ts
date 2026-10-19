import 'server-only';
import type { DocumentSnapshot } from '@invoica/core';
import {
  documentPdfState,
  drainOutbox,
  markSent,
  audit,
  withOrganisation,
  type ClaimedJob,
} from '@invoica/db';
import { getDb } from './db';
import { keptPdf } from './pdf';
import { EMAIL_FROM, getEmailAdapter } from './email';

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
    const sent = await getEmailAdapter().send({
      from: EMAIL_FROM().replace(/^[^<]*</, `${snapshot.seller.name.replace(/[<>"]/g, '')} via Invoica <`),
      replyTo: snapshot.seller.email,
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
};

/** Runs due background jobs. Called after requests that queue work, and on a schedule for retries. */
export async function runJobs(max = 10) {
  return drainOutbox(getDb(), handlers, max);
}
