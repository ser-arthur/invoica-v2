'use server';

import { after } from 'next/server';
import { DomainError } from '@invoica/core';
import { revalidatePath } from 'next/cache';
import {
  createCreditNote,
  createDraft,
  deleteDraft,
  enqueue,
  getDocument,
  duplicateDocument,
  issueDocument,
  markSent,
  recordPayment,
  removePayment,
  updateDraft,
  voidDocument,
} from '@invoica/db';
import { creditNoteInput, draftInput, paymentInput, sendDocumentInput, voidInput } from '@invoica/schemas';
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

export async function saveDraftAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = draftInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const savedId = await inWorkspace(async (tx, ws) => {
      if (id) {
        await updateDraft(tx, ws.actor, id, parsed.data);
        return id;
      }
      return createDraft(tx, ws.actor, parsed.data);
    });
    refresh(savedId);
    return { ok: true, data: { id: savedId } };
  } catch (error) {
    return failure(error);
  }
}

/** Saves the draft as it stands and issues it, in one transaction. */
export async function saveAndIssueAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = draftInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const result = await inWorkspace(async (tx, ws) => {
      let draftId = id;
      if (draftId) await updateDraft(tx, ws.actor, draftId, parsed.data);
      else draftId = await createDraft(tx, ws.actor, parsed.data);
      const { number } = await issueDocument(tx, ws.actor, draftId, new Date());
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

export async function duplicateAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const newId = await inWorkspace((tx, ws) => duplicateDocument(tx, ws.actor, id));
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
