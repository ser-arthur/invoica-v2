import 'server-only';
import { drainOutbox, type ClaimedJob } from '@invoica/db';
import { getDb } from './db';
import { keptPdf } from './pdf';

function actorOf(job: ClaimedJob) {
  if (!job.requestedBy) throw new Error('Job has no requesting user.');
  return { userId: job.requestedBy, organisationId: job.organisationId };
}

const handlers = {
  'document.render_pdf': async (job: ClaimedJob) => {
    await keptPdf(actorOf(job), String(job.payload.documentId));
  },
};

/** Runs due background jobs. Called after requests that queue work, and on a schedule for retries. */
export async function runJobs(max = 10) {
  return drainOutbox(getDb(), handlers, max);
}
