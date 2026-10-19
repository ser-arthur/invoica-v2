import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { formatBusinessDate, formatMoney, formatRate, type DocumentSnapshot } from '@invoica/core';
import { creditPosition, creditableLines, documentActivity, getDocument } from '@invoica/db';
import { renderDocumentHtml } from '@invoica/documents';
import { FormMessage, PageHeader, Panel, PanelHeading, StatePill, buttonClass } from '@/components/ui';
import {
  CreditNoteButton,
  DuplicateButton,
  MarkSentButton,
  RecordPaymentButton,
  RemovePaymentButton,
  SendEmailButton,
  VoidButton,
} from '@/components/document-actions';
import { DocumentFrame } from '@/components/document-frame';
import { inWorkspace } from '@/lib/workspace';
import { isUuid } from '@/lib/ids';

export const metadata: Metadata = { title: 'Invoice' };

const ACTIVITY: Record<string, string> = {
  'document.draft_created': 'Draft started',
  'document.draft_updated': 'Draft edited',
  'document.issued': 'Issued',
  'document.sent': 'Marked as sent',
  'document.voided': 'Voided',
  'document.pdf_kept': 'PDF kept',
  'payment.recorded': 'Payment recorded',
  'payment.removed': 'Payment removed',
  'credit_note.issued': 'Credit note issued',
  'document.duplicated': 'Copied from another invoice',
  'document.emailed': 'Emailed',
};

const METHOD: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  mobile_money: 'Mobile money',
  card: 'Card',
  cash: 'Cash',
  cheque: 'Cheque',
  other: 'Other',
};

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ issued?: string }>;
}) {
  const { id } = await params;
  const { issued } = await searchParams;
  if (!isUuid(id)) notFound();
  const data = await inWorkspace(async (tx, ws) => {
    const detail = await getDocument(tx, id, ws.today);
    if (!detail) return null;
    const activity = detail.document.lifecycle === 'draft' ? [] : await documentActivity(tx, id);
    const isInvoice = detail.document.kind === 'invoice' && detail.document.lifecycle !== 'draft';
    const creditable = isInvoice ? await creditableLines(tx, id) : [];
    const position = isInvoice ? await creditPosition(tx, detail.document) : null;
    return { detail, activity, creditable, position, today: ws.today, timeZone: ws.organisation.timeZone };
  });
  if (!data) notFound();
  const { detail, activity, creditable, position, today, timeZone } = data;
  const doc = detail.document;
  if (doc.lifecycle === 'draft') redirect(`/invoices/${id}/edit`);
  const snapshot = doc.snapshot as unknown as DocumentSnapshot;
  const isCredit = doc.kind === 'credit_note';
  const money = (n: number) => formatMoney(n, doc.currency);
  const html = renderDocumentHtml(snapshot, {
    fontUrl: (f) => `/doc-fonts/${f}`,
    logoUrl: snapshot.seller.logoFileId ? `/files/${snapshot.seller.logoFileId}` : null,
    voided: doc.lifecycle === 'void',
  });
  const open = !isCredit && (doc.lifecycle === 'issued' || doc.lifecycle === 'sent') && detail.balance > 0;
  const credit = position?.ok ? position : null;
  const taxLabel = (tax: (typeof creditable)[number]['tax']) =>
    tax && tax.components.length
      ? tax.components.map((c) => `${c.name} ${formatRate(c.ratePpm)}`).join(' + ')
      : null;
  const emailText = `Hello,\n\nPlease find attached invoice ${doc.number} for ${money(snapshot.balanceDue)}${
    snapshot.dueDate ? `, due ${formatBusinessDate(snapshot.dueDate, 'long')}` : ''
  }.\n\nThank you,\n${snapshot.seller.name}`;

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {doc.number}
            <StatePill state={detail.state} overdue={detail.overdue} />
          </span>
        }
        description={
          isCredit ? (
            <>Credit note for {detail.client.name}</>
          ) : (
            <>
              <Link
                href={`/clients/${detail.client.id}`}
                className="text-ink underline-offset-4 hover:underline"
              >
                {detail.client.name}
              </Link>
              {snapshot.title ? `, ${snapshot.title}` : ''}
            </>
          )
        }
        back={{ href: '/invoices', label: 'Invoices' }}
        actions={
          <>
            <a href={`/invoices/${id}/pdf?download=1`} className={buttonClass('secondary')}>
              <Download className="size-4" aria-hidden /> PDF
            </a>
            {!isCredit && doc.lifecycle !== 'void' ? (
              <SendEmailButton
                id={id}
                sent={doc.lifecycle === 'sent'}
                defaultTo={detail.client.email ?? ''}
                defaultSubject={`Invoice ${doc.number} from ${snapshot.seller.name}`}
                defaultMessage={emailText}
              />
            ) : null}
            {!isCredit && doc.lifecycle === 'issued' ? <MarkSentButton id={id} /> : null}
            {open ? (
              <RecordPaymentButton id={id} balance={detail.balance} currency={doc.currency} today={today} />
            ) : null}
          </>
        }
      />
      {issued ? (
        <div className="mb-6">
          <FormMessage tone="info">
            {doc.number} is issued and kept. Download the PDF or email it to {detail.client.name}, then mark
            it as sent.
          </FormMessage>
        </div>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <DocumentFrame html={html} />
        <div className="flex flex-col gap-6">
          <Panel>
            <dl className="divide-y divide-line">
              <div className="flex items-baseline justify-between px-5 py-3">
                <dt className="text-muted">{isCredit ? 'Credited' : 'Total'}</dt>
                <dd className="font-medium tabular">{money(doc.total)}</dd>
              </div>
              {!isCredit ? (
                <>
                  <div className="flex items-baseline justify-between px-5 py-3">
                    <dt className="text-muted">Paid</dt>
                    <dd className="tabular">{money(detail.applied.paid)}</dd>
                  </div>
                  {detail.applied.credited ? (
                    <div className="flex items-baseline justify-between px-5 py-3">
                      <dt className="text-muted">Credited</dt>
                      <dd className="tabular">{money(detail.applied.credited)}</dd>
                    </div>
                  ) : null}
                  {doc.lifecycle === 'void' ? (
                    <div className="px-5 py-4 text-[14px]">
                      <dt className="font-medium">
                        Voided
                        {doc.voidedAt
                          ? ` on ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(doc.voidedAt)}`
                          : ''}
                      </dt>
                      <dd className="mt-1 text-muted">
                        {doc.voidReason ? `Reason: ${doc.voidReason}. ` : ''}Nothing is owed on it.
                      </dd>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between px-5 py-4">
                        <dt className="font-medium">Balance due</dt>
                        <dd
                          className={`font-display text-xl font-semibold tabular ${detail.overdue ? 'text-danger' : ''}`}
                        >
                          {money(detail.balance)}
                        </dd>
                      </div>
                      {doc.dueDate ? (
                        <div className="flex items-baseline justify-between px-5 py-3 text-[14px]">
                          <dt className="text-muted">Due</dt>
                          <dd>{formatBusinessDate(doc.dueDate, 'long')}</dd>
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              ) : snapshot.credits ? (
                <div className="px-5 py-3 text-[14px]">
                  <dt className="text-muted">Credits</dt>
                  <dd>
                    <Link href={`/invoices/${doc.creditedDocumentId}`} className="text-brand hover:underline">
                      {snapshot.credits.number}
                    </Link>
                    : {snapshot.credits.reason}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Panel>

          {!isCredit ? (
            <Panel>
              <PanelHeading>Payments</PanelHeading>
              {detail.payments.length === 0 ? (
                <p className="px-5 py-4 text-[14px] text-muted">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {detail.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className={p.removedAt ? 'text-muted line-through' : ''}>
                        <p className="font-medium tabular">{money(p.amount)}</p>
                        <p className="text-[13px] text-muted">
                          {formatBusinessDate(p.paidOn)}, {METHOD[p.method] ?? p.method}
                          {p.reference ? `, ${p.reference}` : ''}
                        </p>
                        {p.removedReason ? <p className="text-[13px]">Removed: {p.removedReason}</p> : null}
                      </div>
                      {!p.removedAt && doc.lifecycle !== 'void' ? (
                        <RemovePaymentButton paymentId={p.id} documentId={id} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}

          {!isCredit && detail.creditNotes.length ? (
            <Panel>
              <PanelHeading>Credit notes</PanelHeading>
              <ul className="divide-y divide-line">
                {detail.creditNotes.map((c) => (
                  <li key={c.id}>
                    <Link href={`/invoices/${c.id}`} className="flex justify-between px-5 py-3 hover:bg-sunk">
                      <span className="font-medium">{c.number}</span>
                      <span className="tabular">{money(c.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {!isCredit && (doc.lifecycle === 'issued' || doc.lifecycle === 'sent') ? (
            <Panel className="p-5">
              <h2 className="text-[15px] font-semibold">Need to change it?</h2>
              <p className="mt-1 text-[14px] text-muted">
                Issued invoices stay as they were sent. Correct one with a credit note, or void it if it was
                raised in error.
              </p>
              {position && !position.ok && detail.balance > 0 ? (
                <p className="mt-3 text-[14px] text-muted">{position.reason}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {detail.balance > 0 && credit ? (
                  <CreditNoteButton
                    id={id}
                    number={doc.number ?? ''}
                    balance={detail.balance}
                    currency={doc.currency}
                    canCreditWhole={detail.applied.paid + detail.applied.credited === 0}
                    lines={creditable
                      .map((l, index) => ({
                        id: l.id,
                        index,
                        title: l.title,
                        remaining: l.quantity - (credit.state.quantities[index] ?? 0),
                        unitPrice: l.unitPrice,
                        taxLabel: taxLabel(l.tax),
                      }))
                      .filter((l) => l.remaining > 0)}
                    source={credit.source}
                    ledger={credit.ledger.taken}
                    invoiceTotals={snapshot.totals}
                    earlier={credit.ledger.totals}
                  />
                ) : null}
                {detail.applied.paid === 0 && detail.applied.credited === 0 ? (
                  <VoidButton id={id} number={doc.number ?? ''} />
                ) : null}
                <DuplicateButton id={id} />
              </div>
            </Panel>
          ) : null}

          {activity.length ? (
            <Panel>
              <PanelHeading>Activity</PanelHeading>
              <ol className="flex flex-col gap-3 px-5 py-4 text-[14px]">
                {activity
                  .filter((a) => ACTIVITY[a.action] && a.action !== 'document.draft_updated')
                  .map((a, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {ACTIVITY[a.action]}
                        {a.action === 'payment.recorded' && typeof a.data.amount === 'number'
                          ? `, ${money(a.data.amount)}`
                          : ''}
                      </span>
                      <time className="shrink-0 text-muted" dateTime={a.at.toISOString()}>
                        {new Intl.DateTimeFormat('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone,
                        }).format(a.at)}
                      </time>
                    </li>
                  ))}
              </ol>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
