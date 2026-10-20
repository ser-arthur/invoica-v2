import { DomainError } from './errors';
import { compareDates, type BusinessDate } from './dates';

/** The stored part of a document's state. Part paid and paid are derived from payments. */
export type Lifecycle = 'draft' | 'issued' | 'sent' | 'void';

/** The state shown to people. Credited means closed by credit notes alone; settled, by payments and credit notes together. */
export type DocumentState =
  'draft' | 'issued' | 'sent' | 'part_paid' | 'paid' | 'credited' | 'settled' | 'void';

export type DocumentEvent = 'issue' | 'mark_sent' | 'void';

export const STATE_LABELS: Record<DocumentState, string> = {
  draft: 'Draft',
  issued: 'Issued',
  sent: 'Sent',
  part_paid: 'Part paid',
  paid: 'Paid',
  credited: 'Credited',
  settled: 'Settled',
  void: 'Void',
};

/** `paid` is money received; `credited` is credit notes issued against the document. */
export function deriveState(args: {
  lifecycle: Lifecycle;
  total: number;
  paid: number;
  credited?: number;
}): DocumentState {
  const { lifecycle, total, paid } = args;
  const credited = args.credited ?? 0;
  if (lifecycle === 'draft' || lifecycle === 'void') return lifecycle;
  if (paid + credited >= total) {
    if (credited === 0) return 'paid';
    return paid === 0 ? 'credited' : 'settled';
  }
  if (paid > 0) return 'part_paid';
  return lifecycle;
}

/**
 * The lifecycle after an event, or a DomainError when the event is not allowed. Each refusal says what the person can
 * do, as a page opened before a change made elsewhere meets it.
 */
export function transition(
  lifecycle: Lifecycle,
  event: DocumentEvent,
  context: { paid: number; kind?: 'invoice' | 'credit_note' },
): Lifecycle {
  const noun = context.kind === 'credit_note' ? 'credit note' : 'invoice';
  switch (event) {
    case 'issue':
      if (lifecycle === 'draft') return 'issued';
      throw new DomainError(
        'transition_invalid',
        lifecycle === 'void'
          ? `This ${noun} has already been issued, and is now void.`
          : `This ${noun} has already been issued.`,
      );
    case 'mark_sent':
      if (lifecycle === 'issued' || lifecycle === 'sent') return 'sent';
      throw new DomainError(
        'transition_invalid',
        lifecycle === 'void'
          ? `This ${noun} is void, so it cannot be marked as sent.`
          : `Issue the ${noun} before marking it as sent.`,
      );
    case 'void':
      if ((lifecycle === 'issued' || lifecycle === 'sent') && context.paid === 0) return 'void';
      if (lifecycle === 'issued' || lifecycle === 'sent') {
        throw new DomainError(
          'void_has_payments',
          'A document with payments recorded cannot be voided. Remove the payments or issue a credit note.',
        );
      }
      throw new DomainError(
        'transition_invalid',
        lifecycle === 'void' ? `This ${noun} is already void.` : 'A draft is not voided: delete it instead.',
      );
  }
}

/** Whether a payment of `amount` can be recorded against a document with this lifecycle and balance. */
export function checkPayment(lifecycle: Lifecycle, balance: number, amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new DomainError('payment_not_positive', 'A payment must be more than zero.');
  }
  if (lifecycle !== 'issued' && lifecycle !== 'sent') {
    throw new DomainError(
      'payment_wrong_state',
      lifecycle === 'void'
        ? 'This invoice is void, so no payment can be recorded on it.'
        : 'Issue the invoice before recording a payment.',
    );
  }
  if (amount > balance) {
    throw new DomainError('payment_exceeds_balance', 'The payment is more than the balance due.');
  }
}

/** Overdue is derived every time it is shown: issued, money still owed, and the due date is before today. */
export function isOverdue(args: {
  lifecycle: Lifecycle;
  balance: number;
  dueDate: BusinessDate | null;
  today: BusinessDate;
}): boolean {
  const { lifecycle, balance, dueDate, today } = args;
  if (lifecycle !== 'issued' && lifecycle !== 'sent') return false;
  if (balance <= 0 || !dueDate) return false;
  return compareDates(dueDate, today) < 0;
}
