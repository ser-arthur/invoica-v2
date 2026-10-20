import type { Metadata } from 'next';
import Link from 'next/link';
import {
  chaseOrder,
  formatBusinessDate,
  formatMoney,
  sumMinor,
  type ReceivablesSummary,
} from '@invoica/core';
import {
  getDashboard,
  listClients,
  undeliveredEmails,
  withOrganisation,
  type UndeliveredEmail,
} from '@invoica/db';
import { ButtonLink, Headline, Money, Panel, PanelHeading, StatePill, cx } from '@/components/ui';
import { getDb } from '@/lib/db';
import { requireWorkspace } from '@/lib/session';

export const metadata: Metadata = { title: 'Dashboard' };

const AGEING = [
  { key: 'notDue', label: 'Not due yet', tone: 'bg-brand-bright' },
  { key: 'days1to30', label: '1 to 30 days late', tone: 'bg-[#e0a43a]' },
  { key: 'days31to60', label: '31 to 60 days late', tone: 'bg-[#d9742c]' },
  { key: 'days61to90', label: '61 to 90 days late', tone: 'bg-[#c4462a]' },
  { key: 'over90', label: 'Over 90 days late', tone: 'bg-[#8f1f1a]' },
] as const;

function greeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(new Date()),
  );
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

interface Late {
  id: string;
  clientName: string;
  number: string | null;
  balance: number;
  currency: string;
  daysLate: number;
}

const daysLate = (n: number) => (n === 1 ? '1 day late' : `${n} days late`);

function OwedBand({
  summary,
  currency,
  first,
}: {
  summary: ReceivablesSummary | undefined;
  currency: string;
  first: Late | null;
}) {
  const outstanding = summary?.outstanding ?? 0;
  const total = Math.max(outstanding, 1);
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-6 p-5 sm:p-7">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[14px] font-medium text-muted">Owed to you</h2>
            <p className="mt-1 font-display text-[44px] leading-none font-semibold tracking-[-0.035em] text-ink sm:text-[60px]">
              <Headline amount={outstanding} currency={currency} />
            </p>
          </div>
          <p className="text-[14px] text-muted">
            {summary ? (
              <>
                {summary.openCount} open {summary.openCount === 1 ? 'invoice' : 'invoices'}
                {summary.overdueCount > 0 ? (
                  <>
                    , <span className="font-medium text-danger">{summary.overdueCount} overdue</span>
                  </>
                ) : null}
              </>
            ) : (
              'Nothing outstanding'
            )}
          </p>
        </div>
        <div>
          <div
            className="flex h-3 overflow-hidden rounded-full bg-sunk"
            role="img"
            aria-label="How late the money owed to you is"
          >
            {summary
              ? AGEING.map((a) => {
                  const value = summary.ageing[a.key];
                  if (value <= 0) return null;
                  return (
                    <span
                      key={a.key}
                      className={cx('h-full', a.tone)}
                      style={{ width: `${(value / total) * 100}%` }}
                    />
                  );
                })
              : null}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
            {AGEING.filter((a) => a.key === 'notDue' || (summary?.ageing[a.key] ?? 0) > 0).map((a) => (
              <div key={a.key} className="flex flex-col gap-0.5">
                <dt className="flex items-center gap-2 text-[12px] text-muted">
                  <span aria-hidden className={cx('size-2 rounded-full', a.tone)} />
                  {a.label}
                </dt>
                <dd className="text-[14px] font-medium tabular">
                  {formatMoney(summary?.ageing[a.key] ?? 0, currency)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        {first ? (
          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px]">
              Chase <span className="font-medium">{first.clientName}</span> first:{' '}
              <span className="font-medium tabular">{formatMoney(first.balance, first.currency)}</span> on{' '}
              {first.number}, <span className="text-danger">{daysLate(first.daysLate)}</span>.
            </p>
            <ButtonLink
              href={`/invoices/${first.id}`}
              variant="secondary"
              size="sm"
              className="self-start sm:self-auto"
            >
              Open {first.number}
            </ButtonLink>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function MonthlyBars({ data, currency }: { data: { month: string; amount: number }[]; currency: string }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="flex h-44 items-end gap-3 px-5 pt-6 pb-4">
      {data.map((d) => {
        const label = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(
          new Date(`${d.month}-01T00:00:00Z`),
        );
        return (
          <div key={d.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[11px] text-muted tabular">
              {d.amount > 0 ? formatMoney(d.amount, currency).replace(/\.\d+$/, '') : ''}
            </span>
            <span
              className={cx('w-full max-w-10 rounded-t-[6px]', d.amount > 0 ? 'bg-brand' : 'bg-sunk')}
              style={{ height: `${Math.max((d.amount / max) * 100, 3)}%` }}
              title={`${label}: ${formatMoney(d.amount, currency)}`}
            />
            <span className="text-[12px] text-muted">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function GettingStarted({ hasProfile, hasClient }: { hasProfile: boolean; hasClient: boolean }) {
  const steps = [
    {
      done: hasProfile,
      title: 'Add your business details',
      body: 'Address, logo and how clients pay you. They appear on every invoice.',
      href: '/settings',
      cta: 'Open settings',
    },
    {
      done: hasClient,
      title: 'Add your first client',
      body: 'Their name and address, once. Every invoice to them fills itself in.',
      href: '/clients/new',
      cta: 'Add a client',
    },
    {
      done: false,
      title: 'Create your first invoice',
      body: 'Preview it as you type, then issue it with its own number.',
      href: '/invoices/new',
      cta: 'New invoice',
    },
  ];
  return (
    <Panel>
      <PanelHeading>Three steps to your first invoice</PanelHeading>
      <ol className="divide-y divide-line">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <span
              className={cx(
                'flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold',
                s.done ? 'bg-brand text-brand-ink' : 'border border-line-strong text-ink',
              )}
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="flex-1">
              <p className={cx('font-medium', s.done && 'text-muted line-through')}>{s.title}</p>
              <p className="text-[14px] text-muted">{s.body}</p>
            </div>
            {!s.done ? (
              <ButtonLink
                href={s.href}
                variant={i === 2 ? 'primary' : 'secondary'}
                size="sm"
                className="self-start sm:self-auto"
              >
                {s.cta}
              </ButtonLink>
            ) : (
              <span className="text-[13px] text-brand">Done</span>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/** Invoices still owed whose latest email or reminder could not be sent (docs/specs/email-status.md). */
function Undelivered({ items }: { items: UndeliveredEmail[] }) {
  return (
    <div role="alert" className="rounded-[14px] bg-danger-soft px-5 py-4 text-[14px] text-danger">
      <p className="font-medium">
        {items.length === 1 ? 'An email could not be sent.' : `${items.length} emails could not be sent.`}{' '}
        Check the address, then send it again from the invoice.
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {items.map((u) => (
          <li key={`${u.documentId}-${u.kind}`}>
            <Link
              href={`/invoices/${u.documentId}`}
              className="font-medium underline underline-offset-4 hover:decoration-2"
            >
              {u.number}
            </Link>
            , {u.clientName}: {u.kind === 'reminder' ? 'a reminder' : `the invoice to ${u.to}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function DashboardPage() {
  const { actor, organisation, today } = await requireWorkspace();
  const base = organisation.baseCurrency;
  const [dash, clients, undelivered] = await withOrganisation(getDb(), actor, async (tx) => {
    const dashboard = await getDashboard(tx, today, base);
    return [dashboard, await listClients(tx), await undeliveredEmails(tx)] as const;
  });
  const baseSummary = dash.receivables.find((r) => r.currency === base);
  const otherOwed = dash.receivables.filter((r) => r.currency !== base);
  const paid30 = dash.paidLast30Days.find((p) => p.currency === base)?.amount ?? 0;
  const refunded30 = dash.refundedLast30Days.find((p) => p.currency === base)?.amount ?? 0;
  const invoiced = dash.invoicedThisMonth.find((p) => p.currency === base)?.amount ?? 0;
  const issuedMonth = dash.issuedThisMonth.find((p) => p.currency === base)?.amount ?? 0;
  const creditedMonth = dash.creditedThisMonth.find((p) => p.currency === base)?.amount ?? 0;
  const isNew = dash.recent.length === 0;
  const late = chaseOrder(dash.overdue, today);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[26px] leading-tight font-semibold tracking-[-0.02em] sm:text-[30px]">
            {greeting(organisation.timeZone)}
          </h1>
          <p className="mt-1 text-muted">
            {formatBusinessDate(today, 'long')}, {organisation.name}
          </p>
        </div>
      </div>

      {undelivered.length > 0 ? <Undelivered items={undelivered} /> : null}

      {isNew ? (
        <GettingStarted hasProfile={!!organisation.addressLine1} hasClient={clients.length > 0} />
      ) : null}

      {isNew ? null : <OwedBand summary={baseSummary} currency={base} first={late[0] ?? null} />}

      {otherOwed.length > 0 ? (
        <p className="-mt-2 text-[14px] text-muted">
          Also owed in other currencies:{' '}
          {otherOwed.map((o, i) => (
            <span key={o.currency} className="font-medium text-ink tabular">
              {i > 0 ? ', ' : ''}
              {formatMoney(o.outstanding, o.currency)}
            </span>
          ))}
        </p>
      ) : null}

      {isNew ? null : (
        <>
          <Panel>
            <dl className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                refunded30 > 0
                  ? {
                      label: 'Net received in the last 30 days',
                      value: formatMoney(paid30, base),
                      note: `${formatMoney(sumMinor([paid30, refunded30]), base)} paid, ${formatMoney(refunded30, base)} refunded`,
                    }
                  : { label: 'Paid in the last 30 days', value: formatMoney(paid30, base), note: null },
                creditedMonth > 0
                  ? {
                      label: 'Net invoiced this month',
                      value: formatMoney(invoiced, base),
                      note: `${formatMoney(issuedMonth, base)} invoiced, ${formatMoney(creditedMonth, base)} credited`,
                    }
                  : { label: 'Invoiced this month', value: formatMoney(invoiced, base), note: null },
                { label: 'Drafts waiting', value: String(dash.draftCount), note: null },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4 sm:flex-col sm:flex-nowrap sm:items-start sm:justify-start"
                >
                  <dt className="text-[13px] text-muted">{s.label}</dt>
                  <dd className="font-display text-[22px] font-semibold tracking-[-0.02em] tabular">
                    {s.value}
                  </dd>
                  {s.note ? <dd className="w-full text-[13px] text-muted tabular">{s.note}</dd> : null}
                </div>
              ))}
            </dl>
          </Panel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Panel>
              <PanelHeading
                action={
                  <Link href="/invoices?filter=overdue" className="text-[13px] text-brand hover:underline">
                    All overdue
                  </Link>
                }
              >
                Needs chasing
              </PanelHeading>
              {late.length === 0 ? (
                <p className="px-5 py-8 text-muted">Nothing overdue. Every client is paying on time.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {late.slice(0, 5).map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/invoices/${d.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-sunk"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{d.clientName}</p>
                          <p className="text-[13px] text-muted">
                            {d.number}, <span className="text-danger">{daysLate(d.daysLate)}</span>
                          </p>
                        </div>
                        <Money amount={d.balance} currency={d.currency} className="font-medium" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel>
              <PanelHeading>Money in, last six months</PanelHeading>
              <MonthlyBars data={dash.monthlyPaid} currency={base} />
            </Panel>
          </div>

          <Panel>
            <PanelHeading
              action={
                <Link href="/invoices" className="text-[13px] text-brand hover:underline">
                  All invoices
                </Link>
              }
            >
              Recent invoices
            </PanelHeading>
            {dash.recent.length === 0 ? (
              <p className="px-5 py-8 text-muted">Your invoices will appear here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {dash.recent.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/invoices/${d.id}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-sunk sm:grid-cols-[1fr_8rem_9rem_7rem]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{d.clientName}</p>
                        <p className="text-[13px] text-muted">{d.number ?? 'Draft'}</p>
                      </div>
                      <span className="hidden text-[13px] text-muted sm:block">
                        {d.issueDate ? formatBusinessDate(d.issueDate) : ''}
                      </span>
                      <span className="hidden sm:block">
                        <StatePill state={d.state} overdue={d.overdue} />
                      </span>
                      <Money amount={d.total} currency={d.currency} className="text-right font-medium" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
