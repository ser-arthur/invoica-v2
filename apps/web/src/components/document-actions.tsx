'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  DomainError,
  checkCredit,
  formatMoney,
  formatRate,
  parseMoney,
  parseQuantity,
  amountLimit,
  planAmountCredit,
  planBalanceCredit,
  planLineCredit,
  quantityToString,
  refundFor,
  toDecimalString,
  creditState,
  type CreditPlan,
  type CreditSource,
  type CreditTaken,
  type DocumentTotals,
} from '@invoica/core';
import { Dialog } from './dialog';
import {
  creditNoteAction,
  deleteDraftAction,
  duplicateAction,
  markSentAction,
  recordPaymentAction,
  removePaymentAction,
  sendDocumentAction,
  sendReminderNowAction,
  setRemindersPausedAction,
  voidAction,
} from '@/lib/actions/documents';
import { requestKey } from '@/lib/request-key';
import { Button, Field, FormMessage, Input, Select, Textarea } from './ui';
import { showNotice } from '@/lib/notice';
import { reach } from '@/lib/reach';

export { Dialog };

function MethodOptions() {
  return (
    <>
      <option value="bank_transfer">Bank transfer</option>
      <option value="mobile_money">Mobile money</option>
      <option value="card">Card</option>
      <option value="cash">Cash</option>
      <option value="cheque">Cheque</option>
      <option value="other">Other</option>
    </>
  );
}

export function DeleteDraftButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Delete draft
      </Button>
      {open ? (
        <Dialog title="Delete this draft?" onClose={() => setOpen(false)}>
          <p className="text-muted">It has no number yet, so nothing is lost from your records.</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await reach(deleteDraftAction(id));
                  if (r.ok) {
                    router.push('/invoices');
                    router.refresh();
                  }
                })
              }
            >
              Delete draft
            </Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

export function MarkSentButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await reach(markSentAction(id));
          if (!r.ok) return showNotice(r.message);
          router.refresh();
        })
      }
    >
      Mark as sent
    </Button>
  );
}

/**
 * The form for recording a payment. Each time it opens it is a new payment with its own request key; a retry from
 * the same form reuses the key, so the payment is recorded once.
 */
export function PaymentDialog({
  id,
  balance,
  currency,
  today,
  onClose,
}: {
  id: string;
  balance: number;
  currency: string;
  today: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(toDecimalString(balance, currency));
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [key] = useState(() => requestKey());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const minor = parseMoney(amount, currency);
    if (minor === null || minor <= 0) {
      setMessage('Enter the amount received.');
      return;
    }
    start(async () => {
      const r = await reach(
        recordPaymentAction({
          documentId: id,
          amount: minor,
          paidOn,
          method,
          reference,
          note: null,
          idempotencyKey: key,
        }),
      );
      if (!r.ok) {
        setMessage(r.message);
        return;
      }
      if (r.data.duplicate) {
        setMessage('This payment was already recorded.');
        router.refresh();
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog title="Record a payment" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {message ? <FormMessage>{message}</FormMessage> : null}
        <p className="text-[14px] text-muted">Balance due: {formatMoney(balance, currency)}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${currency})`} htmlFor="pay-amount">
            <Input
              id="pay-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-right tabular"
              autoFocus
            />
          </Field>
          <Field label="Received on" htmlFor="pay-date">
            <Input
              id="pay-date"
              type="date"
              value={paidOn}
              max={today}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </Field>
        </div>
        <Field label="How it was paid" htmlFor="pay-method">
          <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <MethodOptions />
          </Select>
        </Field>
        <Field label="Reference" htmlFor="pay-ref" hint="Optional, as it appears on your statement.">
          <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={submit}>
            {pending ? 'Saving' : 'Record payment'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function RecordPaymentButton(props: { id: string; balance: number; currency: string; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Record payment
      </Button>
      {open ? <PaymentDialog {...props} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function RemovePaymentButton({ paymentId, documentId }: { paymentId: string; documentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Remove
      </Button>
      {open ? (
        <Dialog title="Remove this payment?" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4">
            {message ? <FormMessage>{message}</FormMessage> : null}
            <p className="text-muted">
              It stays in the activity record, marked as removed, with your reason.
            </p>
            <Field label="Reason" htmlFor="rm-reason">
              <Input id="rm-reason" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Keep it
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await reach(removePaymentAction(paymentId, documentId, reason));
                    if (!r.ok) return setMessage(r.message);
                    setOpen(false);
                    router.refresh();
                  })
                }
              >
                Remove payment
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

export function VoidButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Void
      </Button>
      {open ? (
        <Dialog title={`Void ${number}?`} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4">
            {message ? <FormMessage>{message}</FormMessage> : null}
            <p className="text-muted">
              The invoice keeps its number and is marked void. Nothing will be owed on it. Use this for an
              invoice raised in error.
            </p>
            <Field label="Reason" htmlFor="void-reason">
              <Input id="void-reason" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Keep it
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await reach(voidAction({ documentId: id, reason }));
                    if (!r.ok) return setMessage(r.fieldErrors?.reason ?? r.message);
                    setOpen(false);
                    router.refresh();
                  })
                }
              >
                Void invoice
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

export interface CreditableLine {
  id: string;
  /** The line's position on the invoice. */
  index: number;
  title: string;
  /** Thousandths still uncredited. */
  remaining: number;
  unitPrice: number;
  taxLabel: string | null;
}

type CreditMode = 'whole' | 'lines' | 'amount' | 'balance';

export function CreditNoteButton({
  id,
  number,
  balance,
  received,
  today,
  currency,
  canCreditWhole,
  lines,
  source,
  ledger,
  invoiceTotals,
  earlier,
}: {
  id: string;
  number: string;
  balance: number;
  /** Payments received less refunds already made: what a refund can return. */
  received: number;
  today: string;
  currency: string;
  canCreditWhole: boolean;
  lines: CreditableLine[];
  /** The invoice as issued, so the credit is worked out here exactly as the server will. */
  source: CreditSource;
  /** What the credit notes already issued against the invoice took from it. */
  ledger: CreditTaken[];
  invoiceTotals: DocumentTotals;
  earlier: DocumentTotals[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const firstMode: CreditMode = canCreditWhole ? 'whole' : lines.length ? 'lines' : 'balance';
  const [mode, setMode] = useState<CreditMode>(firstMode);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refundedOn, setRefundedOn] = useState(today);
  const [refundMethod, setRefundMethod] = useState('bank_transfer');
  const [refundReference, setRefundReference] = useState('');
  const [key, setKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const money = (n: number) => formatMoney(n, currency);
  const state = useMemo(() => creditState(source, ledger), [source, ledger]);
  const valueLeft = Object.values(state.slots).reduce((a, g) => a + g.left, 0);
  const limit = useMemo(() => amountLimit(source, state, balance), [source, state, balance]);
  const basis = source.pricesIncludeTax ? 'including tax' : 'before tax';

  function openDialog() {
    setKey(requestKey());
    setMode(firstMode);
    setQuantities({});
    setAmount('');
    setReason('');
    setRefundedOn(today);
    setRefundMethod('bank_transfer');
    setRefundReference('');
    setMessage(null);
    setOpen(true);
  }

  const lineRequest = useMemo(
    () =>
      lines
        .filter((l) => (quantities[l.id] ?? '').trim() !== '')
        .map((l) => ({ line: l, quantity: parseQuantity(quantities[l.id] ?? '') })),
    [lines, quantities],
  );

  const preview = useMemo((): { plan: CreditPlan | null; error: string | null } => {
    try {
      let plan: CreditPlan;
      if (mode === 'whole') {
        plan = planLineCredit(
          source,
          state,
          source.lines.map((l, index) => ({ index, quantity: l.quantity - (state.quantities[index] ?? 0) })),
        );
      } else if (mode === 'lines') {
        const bad = lineRequest.find((r) => r.quantity === null);
        if (bad) return { plan: null, error: `Enter a quantity for ${bad.line.title}.` };
        const request = lineRequest
          .map((r) => ({ index: r.line.index, quantity: r.quantity ?? 0 }))
          .filter((r) => r.quantity > 0);
        if (request.length === 0) return { plan: null, error: null };
        plan = planLineCredit(source, state, request);
      } else if (mode === 'balance') {
        plan = planBalanceCredit(source, state, balance);
      } else {
        if (!amount.trim()) return { plan: null, error: null };
        const minor = parseMoney(amount, currency);
        if (minor === null || minor <= 0) return { plan: null, error: 'Enter the amount to credit.' };
        plan = planAmountCredit(source, state, minor);
      }
      checkCredit({
        invoice: invoiceTotals,
        balance,
        earlier,
        credit: plan.totals,
        received,
        refund: refundFor(plan.totals.total, balance),
      });
      return { plan, error: null };
    } catch (error) {
      return {
        plan: null,
        error: error instanceof DomainError ? error.message : 'This credit cannot be worked out.',
      };
    }
  }, [mode, lineRequest, amount, source, state, invoiceTotals, earlier, balance, received, currency]);
  // The part above the balance owed is paid back to the client, and recorded with the note.
  const refund = preview.plan ? refundFor(preview.plan.totals.total, balance) : 0;

  function submit() {
    if (!preview.plan) return setMessage(preview.error ?? 'Choose what to credit.');
    const base = {
      invoiceId: id,
      reason,
      idempotencyKey: key,
      ...(refund > 0
        ? { refund: { refundedOn, method: refundMethod, reference: refundReference.trim() || null } }
        : {}),
    };
    const input =
      mode === 'whole' || mode === 'balance'
        ? { ...base, mode }
        : mode === 'lines'
          ? {
              ...base,
              mode,
              lines: lineRequest
                .filter((r) => (r.quantity ?? 0) > 0)
                .map((r) => ({ lineId: r.line.id, quantity: r.quantity ?? 0 })),
            }
          : { ...base, mode, amount: parseMoney(amount, currency) ?? 0 };
    start(async () => {
      const r = await reach(creditNoteAction(input));
      if (!r.ok) return setMessage(r.fieldErrors?.reason ?? r.message);
      setOpen(false);
      router.push(`/invoices/${r.data.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={openDialog}>
        Credit note
      </Button>
      {open ? (
        <Dialog title={`Credit ${number}`} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4">
            {message ? <FormMessage>{message}</FormMessage> : null}
            <p className="text-[14px] text-muted">
              A credit note corrects an issued invoice. It gets its own number, cannot be undone, and reduces
              what the client owes, now {money(balance)}. Prices and tax are taken from the invoice.
            </p>
            <Field label="What to credit" htmlFor="cn-mode">
              <Select id="cn-mode" value={mode} onChange={(e) => setMode(e.target.value as CreditMode)}>
                {canCreditWhole ? <option value="whole">The whole invoice</option> : null}
                {lines.length ? <option value="lines">Some of the lines</option> : null}
                <option value="amount">An amount, {basis}</option>
                {balance > 0 && (!canCreditWhole || received > 0) ? (
                  <option value="balance">Everything still owed, {money(balance)}</option>
                ) : null}
              </Select>
            </Field>
            {mode === 'lines' ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Quantities to credit</legend>
                {lines.map((l) => (
                  <div key={l.id} className="grid grid-cols-[1fr_6.5rem] items-center gap-3">
                    <label htmlFor={`cn-q-${l.id}`} className="min-w-0 text-[14px]">
                      <span className="block truncate font-medium">{l.title}</span>
                      <span className="block text-[13px] text-muted">
                        {quantityToString(l.remaining)} left at {money(l.unitPrice)}
                        {l.taxLabel ? `, ${l.taxLabel}` : ''}
                      </span>
                    </label>
                    <Input
                      id={`cn-q-${l.id}`}
                      inputMode="decimal"
                      placeholder="0"
                      value={quantities[l.id] ?? ''}
                      onChange={(e) => setQuantities((q) => ({ ...q, [l.id]: e.target.value }))}
                      className="text-right tabular"
                    />
                  </div>
                ))}
              </fieldset>
            ) : null}
            {mode === 'amount' ? (
              <Field
                label={`Amount (${currency})`}
                htmlFor="cn-amount"
                hint={`${
                  limit >= valueLeft
                    ? `Up to ${money(valueLeft)} ${basis}.`
                    : received > 0
                      ? `Up to ${money(valueLeft)} ${basis}. Above ${money(limit)}, the credit note is more than the ${money(balance)} still owed, and you record the refund of the difference.`
                      : `Up to ${money(limit)} ${basis}, which keeps the credit note within the ${money(balance)} still owed.`
                } Shared across the invoice's tax rates in proportion to what is left at each.`}
              >
                <Input
                  id="cn-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-right tabular"
                />
              </Field>
            ) : null}
            {preview.plan ? (
              <dl className="rounded-[12px] bg-sunk px-4 py-3 text-[14px]">
                <div className="flex justify-between text-muted">
                  <dt>
                    Before{' '}
                    {preview.plan.totals.taxes.every((t) => t.ratePpm === 0 || t.name === 'VAT')
                      ? 'VAT'
                      : 'tax'}
                  </dt>
                  <dd className="tabular">{money(preview.plan.totals.net)}</dd>
                </div>
                {preview.plan.totals.taxes
                  .filter((t) => t.ratePpm > 0)
                  .map((t) => (
                    <div key={t.key} className="flex justify-between text-muted">
                      <dt>
                        {t.name} {formatRate(t.ratePpm)}
                        {t.charged ? '' : ', reverse charge'}
                      </dt>
                      <dd className="tabular">{money(t.amount)}</dd>
                    </div>
                  ))}
                <div className="mt-2 flex justify-between border-t border-line pt-2">
                  <dt className="font-medium">Credit note total</dt>
                  <dd className="font-medium tabular">{money(preview.plan.totals.total)}</dd>
                </div>
              </dl>
            ) : preview.error ? (
              <p className="text-[14px] text-danger" role="status">
                {preview.error}
              </p>
            ) : null}
            {refund > 0 ? (
              <fieldset className="flex flex-col gap-3 rounded-[12px] border border-line px-4 py-3">
                <legend className="px-1 text-[14px] font-medium">Refund of {money(refund)}</legend>
                <p className="text-[14px] text-muted">
                  This credit note is {money(refund)} more than is still owed, so that much goes back to the
                  client. Record the refund you have made.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Refunded on" htmlFor="cn-refund-date">
                    <Input
                      id="cn-refund-date"
                      max={today}
                      type="date"
                      value={refundedOn}
                      onChange={(e) => setRefundedOn(e.target.value)}
                    />
                  </Field>
                  <Field label="How it was refunded" htmlFor="cn-refund-method">
                    <Select
                      id="cn-refund-method"
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                    >
                      <MethodOptions />
                    </Select>
                  </Field>
                </div>
                <Field
                  label="Reference"
                  htmlFor="cn-refund-ref"
                  hint="Optional, as it appears on your statement."
                >
                  <Input
                    id="cn-refund-ref"
                    value={refundReference}
                    onChange={(e) => setRefundReference(e.target.value)}
                  />
                </Field>
              </fieldset>
            ) : null}
            <Field label="Reason" htmlFor="cn-reason" hint="Printed on the credit note.">
              <Textarea
                id="cn-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-16"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={pending || !preview.plan} onClick={submit}>
                {pending
                  ? 'Issuing'
                  : refund > 0
                    ? 'Issue credit note and record refund'
                    : 'Issue credit note'}
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

export function DuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await reach(duplicateAction(id));
          if (r.ok) router.push(`/invoices/${r.data.id}/edit`);
        })
      }
    >
      {pending ? 'Copying' : 'Duplicate'}
    </Button>
  );
}

export function SendEmailButton({
  id,
  defaultTo,
  defaultSubject,
  defaultMessage,
  sent,
}: {
  id: string;
  defaultTo: string;
  defaultSubject: string;
  defaultMessage: string;
  sent: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function openDialog() {
    // A new key for each send; a retry inside the dialog reuses it, so the email goes once.
    setKey(requestKey());
    setDone(false);
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    start(async () => {
      const r = await reach(
        sendDocumentAction({ documentId: id, to, subject, message, idempotencyKey: key }),
      );
      if (!r.ok) return setError(r.fieldErrors ? Object.values(r.fieldErrors)[0]! : r.message);
      setDone(true);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant={sent ? 'secondary' : 'primary'} onClick={openDialog}>
        {sent ? 'Send again' : 'Send'}
      </Button>
      {open ? (
        <Dialog title="Send by email" onClose={() => setOpen(false)}>
          {done ? (
            <div className="flex flex-col gap-4">
              <FormMessage tone="info">
                On its way to {to}, with the PDF attached. It is marked as sent once delivered.
              </FormMessage>
              <Button className="self-end" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {error ? <FormMessage>{error}</FormMessage> : null}
              <Field label="To" htmlFor="send-to">
                <Input
                  id="send-to"
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Subject" htmlFor="send-subject">
                <Input id="send-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
              <Field label="Message" htmlFor="send-message" hint="The invoice PDF is attached.">
                <Textarea
                  id="send-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-40"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={pending} onClick={submit}>
                  {pending ? 'Sending' : 'Send invoice'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      ) : null}
    </>
  );
}

/** Pauses or resumes an invoice's reminders, and sends one now. */
export function ReminderControls({
  id,
  paused,
  canPause,
  canSend,
}: {
  id: string;
  paused: boolean;
  canPause: boolean;
  canSend: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: 'danger' | 'info'; text: string } | null>(null);
  // Kept until a reminder is on its way, so trying again after a lost answer sends one reminder.
  const [sendKey, setSendKey] = useState(() => requestKey());
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
      <div className="flex flex-wrap gap-2">
        {canSend ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await reach(sendReminderNowAction(id, sendKey));
                if (!r.ok) return setMessage({ tone: 'danger', text: r.message });
                setSendKey(requestKey());
                setMessage({ tone: 'info', text: 'A reminder is on its way.' });
                router.refresh();
              })
            }
          >
            Send a reminder now
          </Button>
        ) : null}
        {canPause ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await reach(setRemindersPausedAction(id, !paused));
                if (!r.ok) return setMessage({ tone: 'danger', text: r.message });
                setMessage(null);
                router.refresh();
              })
            }
          >
            {paused ? 'Resume reminders' : 'Pause reminders for this invoice'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
