'use server';

import { after } from 'next/server';
import { DomainError } from '@invoica/core';
import { revalidatePath } from 'next/cache';
import {
  createCreditNote,
  createDraft,
  deleteDraft,
  documentForKey,
  lockRequestKey,
  enqueue,
  getDocument,
  duplicateDocument,
  issueDocument,
  markSent,
  recordPayment,
  removePayment,
  sendReminderNow,
  setRemindersPaused,
  updateDraft,
  voidDocument,
  type Tx,
} from '@invoica/db';
import {
  creditNoteInput,
  draftInput,
  issueConfirmation,
  paymentInput,
  sendDocumentInput,
  voidInput,
} from '@invoica/schemas';
import { inWorkspace } from '../workspace';
import { runJobs } from '../jobs';
import { failure, invalid, type ActionResult } from './result';

function refresh(id?: string) {
  revalidatePath('/invoices');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/invoices/${id}`);
}

function runJobsLater() {
  after(async () => {
    try {
      await runJobs(25);
    } catch (error) {
      console.error('background jobs failed', (error as Error).message);
    }
  });
}

async function earlierForKey(tx: Tx, key: string | undefined) {
  if (!key) return null;
  await lockRequestKey(tx, key);
  return documentForKey(tx, key);
}

export async function saveDraftAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = draftInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const savedId = await inWorkspace(async (tx, ws) => {
      // A repeated first save (its answer lost on the way back) finds the draft it created. The key is held for the
      // transaction, so a repeat that overlaps the first waits for it.
      const earlier = id ? null : await earlierForKey(tx, parsed.data.idempotencyKey);
      const existing = id ?? earlier?.id ?? null;
      if (existing) {
        if (!earlier || earlier.lifecycle === 'draft') await updateDraft(tx, ws.actor, existing, parsed.data);
        return existing;
      }
      return createDraft(tx, ws.actor, parsed.data);
    });
    refresh(savedId);
    return { ok: true, data: { id: savedId } };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Saves the draft as it stands and issues it, in one transaction. `confirmed` is the total the person confirmed;
 * when the total worked out on the server is another, nothing is saved or issued and the new figure is given.
 */
export async function saveAndIssueAction(
  id: string | null,
  input: unknown,
  confirmed?: unknown,
): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = draftInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const shown = confirmed === undefined ? undefined : issueConfirmation.safeParse(confirmed);
  if (shown && !shown.success) return invalid(shown.error);
  try {
    const result = await inWorkspace(async (tx, ws) => {
      const earlier = id ? null : await earlierForKey(tx, parsed.data.idempotencyKey);
      // The same request already issued this invoice: return it.
      if (earlier && earlier.lifecycle !== 'draft') return { id: earlier.id, number: earlier.number ?? '' };
      let draftId = id ?? earlier?.id ?? null;
      if (draftId) await updateDraft(tx, ws.actor, draftId, parsed.data);
      else draftId = await createDraft(tx, ws.actor, parsed.data);
      const { number } = await issueDocument(tx, ws.actor, draftId, new Date(), shown?.data);
      return { id: draftId, number };
    });
    refresh(result.id);
    runJobsLater();
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteDraftAction(id: string): Promise<ActionResult> {
  try {
    await inWorkspace((tx, ws) => deleteDraft(tx, ws.actor, id));
    refresh();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function markSentAction(id: string): Promise<ActionResult> {
  try {
    await inWorkspace((tx, ws) => markSent(tx, ws.actor, id, new Date()));
    refresh(id);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function voidAction(input: unknown): Promise<ActionResult> {
  const parsed = voidInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await inWorkspace((tx, ws) =>
      voidDocument(tx, ws.actor, parsed.data.documentId, parsed.data.reason, new Date()),
    );
    refresh(parsed.data.documentId);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function recordPaymentAction(input: unknown): Promise<ActionResult<{ duplicate: boolean }>> {
  const parsed = paymentInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const r = await inWorkspace((tx, ws) => recordPayment(tx, ws.actor, parsed.data));
    refresh(parsed.data.documentId);
    return { ok: true, data: { duplicate: r.duplicate } };
  } catch (error) {
    return failure(error);
  }
}

export async function removePaymentAction(
  paymentId: string,
  documentId: string,
  reason: string,
): Promise<ActionResult> {
  if (!reason.trim()) return { ok: false, message: 'Say why the payment is removed.' };
  try {
    await inWorkspace((tx, ws) => removePayment(tx, ws.actor, paymentId, reason.trim()));
    refresh(documentId);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function creditNoteAction(
  input: unknown,
): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = creditNoteInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const r = await inWorkspace((tx, ws) => createCreditNote(tx, ws.actor, parsed.data, new Date()));
    refresh(parsed.data.invoiceId);
    runJobsLater();
    return { ok: true, data: { id: r.id, number: r.number } };
  } catch (error) {
    return failure(error);
  }
}

export async function duplicateAction(id: string, key?: string): Promise<ActionResult<{ id: string }>> {
  if (key !== undefined && (typeof key !== 'string' || key.length < 8 || key.length > 100)) {
    return { ok: false, message: 'Something went wrong and nothing was saved. Try again.' };
  }
  try {
    const newId = await inWorkspace((tx, ws) => duplicateDocument(tx, ws.actor, id, key));
    refresh(newId);
    return { ok: true, data: { id: newId } };
  } catch (error) {
    return failure(error);
  }
}

/** Queues an issued invoice to be emailed with its PDF. A repeated request with the same key sends once. */
export async function sendDocumentAction(input: unknown): Promise<ActionResult> {
  const parsed = sendDocumentInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { documentId, to, subject, message, idempotencyKey } = parsed.data;
  try {
    await inWorkspace(async (tx, ws) => {
      const detail = await getDocument(tx, documentId, ws.today);
      if (!detail || detail.document.lifecycle === 'draft' || detail.document.lifecycle === 'void') {
        throw new DomainError('send_wrong_state', 'Only issued invoices can be sent.');
      }
      await enqueue(
        tx,
        ws.actor,
        'document.email',
        { documentId, to, subject, message },
        `email:${idempotencyKey}`,
      );
    });
    runJobsLater();
    refresh(documentId);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function setRemindersPausedAction(id: string, paused: boolean): Promise<ActionResult> {
  try {
    await inWorkspace((tx, ws) => setRemindersPaused(tx, ws.actor, id, paused));
    refresh(id);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function sendReminderNowAction(id: string, key: string): Promise<ActionResult> {
  if (typeof key !== 'string' || key.length < 8 || key.length > 100) {
    return { ok: false, message: 'Something went wrong and nothing was sent. Try again.' };
  }
  try {
    await inWorkspace((tx, ws) => sendReminderNow(tx, ws.actor, id, key, new Date()));
    refresh(id);
    runJobsLater();
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
