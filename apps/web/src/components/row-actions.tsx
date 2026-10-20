'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { duplicateAction, markSentAction } from '@/lib/actions/documents';
import { PaymentDialog } from './document-actions';
import { showNotice } from '@/lib/notice';
import { reach } from '@/lib/reach';

const item =
  'flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[14px] hover:bg-sunk disabled:opacity-50 sm:min-h-9';

/** The common next steps for an invoice, from its row in a list: record a payment, mark as sent, the PDF, a copy. */
export function RowActions({
  id,
  number,
  lifecycle,
  balance,
  currency,
  today,
}: {
  id: string;
  number: string | null;
  lifecycle: 'draft' | 'issued' | 'sent' | 'void';
  balance: number;
  currency: string;
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const canPay = (lifecycle === 'issued' || lifecycle === 'sent') && balance > 0;
  const name = number ?? 'this draft';

  return (
    <div
      ref={box}
      className={open ? 'relative z-30' : 'relative z-10'}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls={`row-actions-${id}`}
        aria-label={`Actions for ${name}`}
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-sunk hover:text-ink sm:size-9"
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </button>
      {open ? (
        <ul
          id={`row-actions-${id}`}
          className="absolute top-full right-0 z-20 mt-1 w-52 rounded-[12px] border border-line bg-surface p-1.5 shadow-lift"
        >
          {canPay ? (
            <li>
              <button
                type="button"
                className={item}
                onClick={() => {
                  setOpen(false);
                  setPaying(true);
                }}
              >
                Record payment
              </button>
            </li>
          ) : null}
          {lifecycle === 'issued' ? (
            <li>
              <button
                type="button"
                className={item}
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  start(async () => {
                    const r = await reach(markSentAction(id));
                    if (!r.ok) return showNotice(r.message);
                    router.refresh();
                  });
                }}
              >
                Mark as sent
              </button>
            </li>
          ) : null}
          {lifecycle !== 'draft' ? (
            <li>
              <a className={item} href={`/invoices/${id}/pdf?download=1`}>
                Download PDF
              </a>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              className={item}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await reach(duplicateAction(id));
                  if (r.ok) router.push(`/invoices/${r.data.id}/edit`);
                })
              }
            >
              Duplicate
            </button>
          </li>
        </ul>
      ) : null}
      {paying ? (
        <PaymentDialog
          id={id}
          balance={balance}
          currency={currency}
          today={today}
          onClose={() => setPaying(false)}
        />
      ) : null}
    </div>
  );
}
