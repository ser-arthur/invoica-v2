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
  planAmountCredit,
  planLineCredit,
  quantityToString,
  toDecimalString,
  type CreditPlan,
  type CreditSource,
  type DocumentTotals,
} from '@invoica/core';
import {
  creditNoteAction,
  deleteDraftAction,
  duplicateAction,
  markSentAction,
  recordPaymentAction,
  removePaymentAction,
  sendDocumentAction,
  voidAction,
} from '@/lib/actions/documents';
import { requestKey } from '@/lib/request-key';
import { Button, Field, FormMessage, Input, Select, Textarea } from './ui';

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full max-w-md rounded-[16px] bg-surface p-6 shadow-lift">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
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
                  const r = await deleteDraftAction(id);
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
          await markSentAction(id);
          router.refresh();
        })
      }
    >
      Mark as sent
    </Button>
  );
}

export function RecordPaymentButton({
  id,
  balance,
  currency,
  today,
}: {
  id: string;
  balance: number;
  currency: string;
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(toDecimalString(balance, currency));
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [key, setKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function openDialog() {
    // Each time the dialog opens it is a new payment, with its own key; retrying inside the dialog reuses it.
    setKey(requestKey());
    setAmount(toDecimalString(balance, currency));
    setPaidOn(today);
    setReference('');
    setMessage(null);
    setOpen(true);
  }

  function submit() {
    const minor = parseMoney(amount, currency);
    if (minor === null || minor <= 0) {
      setMessage('Enter the amount received.');
      return;
    }
    start(async () => {
      const r = await recordPaymentAction({
        documentId: id,
        amount: minor,
        paidOn,
        method,
        reference,
        note: null,
        idempotencyKey: key,
      });
      if (!r.ok) {
        setMessage(r.message);
        return;
      }
      if (r.data.duplicate) {
        setMessage('This payment was already recorded.');
        router.refresh();
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={openDialog}>
        Record payment
      </Button>
      {open ? (
        <Dialog title="Record a payment" onClose={() => setOpen(false)}>
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
                <Input id="pay-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
              </Field>
            </div>
            <Field label="How it was paid" htmlFor="pay-method">
              <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="bank_transfer">Bank transfer</option>
                <option value="mobile_money">Mobile money</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Reference" htmlFor="pay-ref" hint="Optional, as it appears on your statement.">
              <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={pending} onClick={submit}>
                {pending ? 'Saving' : 'Record payment'}
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
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
                    const r = await removePaymentAction(paymentId, documentId, reason);
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
                    const r = await voidAction({ documentId: id, reason });
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

type CreditMode = 'whole' | 'lines' | 'amount';

export function CreditNoteButton({
  id,
  number,
  balance,
  currency,
  canCreditWhole,
  lines,
  source,
  credited,
  invoiceTotals,
  earlier,
}: {
  id: string;
  number: string;
  balance: number;
  currency: string;
  canCreditWhole: boolean;
  lines: CreditableLine[];
  /** The invoice as issued, so the credit is worked out here exactly as the server will. */
  source: CreditSource;
  credited: number[];
  invoiceTotals: DocumentTotals;
  earlier: DocumentTotals[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const firstMode: CreditMode = canCreditWhole ? 'whole' : lines.length ? 'lines' : 'amount';
  const [mode, setMode] = useState<CreditMode>(firstMode);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [key, setKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const money = (n: number) => formatMoney(n, currency);

  function openDialog() {
    setKey(requestKey());
    setMode(firstMode);
    setQuantities({});
    setAmount('');
    setReason('');
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
          credited,
          source.lines.map((l, index) => ({ index, quantity: l.quantity - (credited[index] ?? 0) })),
        );
      } else if (mode === 'lines') {
        const bad = lineRequest.find((r) => r.quantity === null);
        if (bad) return { plan: null, error: `Enter a quantity for ${bad.line.title}.` };
        const request = lineRequest
          .map((r) => ({ index: r.line.index, quantity: r.quantity ?? 0 }))
          .filter((r) => r.quantity > 0);
        if (request.length === 0) return { plan: null, error: null };
        plan = planLineCredit(source, credited, request);
      } else {
        if (!amount.trim()) return { plan: null, error: null };
        const minor = parseMoney(amount, currency);
        if (minor === null || minor <= 0) return { plan: null, error: 'Enter the amount to credit.' };
        plan = planAmountCredit(source, invoiceTotals, minor);
      }
      checkCredit({ invoice: invoiceTotals, balance, earlier, credit: plan.totals });
      return { plan, error: null };
    } catch (error) {
      return {
        plan: null,
        error: error instanceof DomainError ? error.message : 'This credit cannot be worked out.',
      };
    }
  }, [mode, lineRequest, amount, source, credited, invoiceTotals, earlier, balance, currency]);

  function submit() {
    if (!preview.plan) return setMessage(preview.error ?? 'Choose what to credit.');
    const base = { invoiceId: id, reason, idempotencyKey: key };
    const input =
      mode === 'whole'
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
      const r = await creditNoteAction(input);
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
                <option value="amount">An amount, including tax</option>
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
                hint="Shared across the invoice's tax rates in proportion to what was invoiced at each."
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
                <div className="flex justify-between">
                  <dt className="text-muted">Credit note total</dt>
                  <dd className="font-medium tabular">{money(preview.plan.totals.total)}</dd>
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
              </dl>
            ) : preview.error ? (
              <p className="text-[14px] text-danger" role="status">
                {preview.error}
              </p>
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
                {pending ? 'Issuing' : 'Issue credit note'}
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
          const r = await duplicateAction(id);
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
      const r = await sendDocumentAction({ documentId: id, to, subject, message, idempotencyKey: key });
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
