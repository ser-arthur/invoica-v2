'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { formatMoney, parseMoney, toDecimalString } from '@invoica/core';
import {
  creditNoteAction,
  deleteDraftAction,
  markSentAction,
  recordPaymentAction,
  removePaymentAction,
  voidAction,
} from '@/lib/actions/documents';
import { Button, Field, FormMessage, Input, Select, Textarea } from './ui';
import { newKey } from './invoice-editor';

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
  const [key] = useState(() => `pay-${newKey()}-${id.slice(0, 8)}`);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
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

export function CreditNoteButton({
  id,
  number,
  balance,
  currency,
  canCreditWhole,
  taxCodeId,
  taxLabel,
}: {
  id: string;
  number: string;
  balance: number;
  currency: string;
  canCreditWhole: boolean;
  /** The tax code every line of the invoice uses, applied to a credited amount. */
  taxCodeId: string | null;
  taxLabel: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'whole' | 'amount'>(canCreditWhole ? 'whole' : 'amount');
  const [title, setTitle] = useState(`Credit for ${number}`);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [key] = useState(() => `credit-${newKey()}-${id.slice(0, 8)}`);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    let lines: unknown[] | undefined;
    if (mode === 'amount') {
      const minor = parseMoney(amount, currency);
      if (minor === null || minor <= 0) return setMessage('Enter the amount to credit.');
      lines = [
        {
          title,
          description: null,
          quantity: 1000,
          unit: null,
          unitPrice: minor,
          serviceDate: null,
          taxCodeId,
          itemId: null,
        },
      ];
    }
    start(async () => {
      const r = await creditNoteAction({ invoiceId: id, reason, lines, idempotencyKey: key });
      if (!r.ok) return setMessage(r.fieldErrors?.reason ?? r.message);
      setOpen(false);
      router.push(`/invoices/${r.data.id}`);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Credit note
      </Button>
      {open ? (
        <Dialog title={`Credit ${number}`} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4">
            {message ? <FormMessage>{message}</FormMessage> : null}
            <p className="text-[14px] text-muted">
              A credit note corrects an issued invoice. It gets its own number and reduces what the client
              owes, now {formatMoney(balance, currency)}.
            </p>
            <Field label="What to credit" htmlFor="cn-mode">
              <Select
                id="cn-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as 'whole' | 'amount')}
              >
                {canCreditWhole ? <option value="whole">The whole invoice, line by line</option> : null}
                <option value="amount">{taxLabel ? `An amount, plus ${taxLabel}` : 'An amount'}</option>
              </Select>
            </Field>
            {mode === 'amount' ? (
              <div className="grid grid-cols-[1fr_8rem] gap-3">
                <Field label="Line" htmlFor="cn-title">
                  <Input id="cn-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label={currency} htmlFor="cn-amount">
                  <Input
                    id="cn-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-right tabular"
                  />
                </Field>
              </div>
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
              <Button disabled={pending} onClick={submit}>
                {pending ? 'Issuing' : 'Issue credit note'}
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
