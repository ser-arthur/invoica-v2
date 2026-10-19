import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { formatBusinessDate, formatMoney, sumMinor } from '@invoica/core';
import { listDocuments, type DocumentFilter } from '@invoica/db';
import { ButtonLink, EmptyState, Input, Money, PageHeader, Panel, StatePill, cx } from '@/components/ui';
import { inWorkspace } from '@/lib/workspace';
import { RowActions } from '@/components/row-actions';
import { pageOf } from '@/lib/paging';

export const metadata: Metadata = { title: 'Invoices' };

const PAGE_SIZE = 50;

const FILTERS: { value: DocumentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'draft', label: 'Drafts' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; kind?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.value === sp.filter)?.value ?? 'all') as DocumentFilter;
  const kind = sp.kind === 'credit_note' ? 'credit_note' : 'invoice';
  const { docs, open, today } = await inWorkspace(async (tx, ws) => {
    const docs = await listDocuments(tx, { today: ws.today, filter, search: sp.q, kind });
    // The unpaid total comes from the list itself when it already holds every invoice.
    const everything = filter === 'all' && !sp.q?.trim();
    const open =
      kind !== 'invoice'
        ? []
        : everything
          ? docs.filter((d) => ['issued', 'sent', 'part_paid'].includes(d.state) && d.balance > 0)
          : await listDocuments(tx, { today: ws.today, filter: 'open' });
    return { docs, open, today: ws.today };
  });
  const owed = new Map<string, number>();
  for (const d of open) owed.set(d.currency, sumMinor([owed.get(d.currency) ?? 0, d.balance]));
  const shown = pageOf(docs, sp.page, PAGE_SIZE);
  const link = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      filter: filter === 'all' ? undefined : filter,
      q: sp.q,
      kind: kind === 'invoice' ? undefined : kind,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/invoices?${qs}` : '/invoices';
  };

  return (
    <div>
      <PageHeader
        title={kind === 'credit_note' ? 'Credit notes' : 'Invoices'}
        description={
          kind === 'invoice' && owed.size ? (
            <>
              Unpaid now:{' '}
              {[...owed.entries()].map(([c, a], i) => (
                <span key={c} className="font-medium text-ink tabular">
                  {i ? ', ' : ''}
                  {formatMoney(a, c)}
                </span>
              ))}
            </>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter invoices" className="-mx-1 flex gap-1 overflow-x-auto px-1 text-[14px]">
          {kind === 'invoice'
            ? FILTERS.map((f) => (
                <Link
                  key={f.value}
                  href={link({ filter: f.value === 'all' ? undefined : f.value })}
                  aria-current={filter === f.value ? 'page' : undefined}
                  className={cx(
                    'shrink-0 rounded-lg px-3 py-2',
                    filter === f.value
                      ? 'bg-surface font-medium text-ink ring-1 ring-line'
                      : 'text-muted hover:text-ink',
                  )}
                >
                  {f.label}
                </Link>
              ))
            : null}
          <Link
            href={kind === 'invoice' ? '/invoices?kind=credit_note' : '/invoices'}
            className="shrink-0 rounded-lg px-3 py-2 text-muted hover:text-ink"
          >
            {kind === 'invoice' ? 'Credit notes' : 'Back to invoices'}
          </Link>
        </nav>
        <form role="search" className="relative lg:w-72">
          {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
          {kind !== 'invoice' ? <input type="hidden" name="kind" value={kind} /> : null}
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <label htmlFor="q" className="sr-only">
            Search invoices
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Client, number or title"
            className="pl-9"
          />
        </form>
      </div>
      <Panel>
        {docs.length === 0 ? (
          sp.q || filter !== 'all' ? (
            <EmptyState
              title="Nothing here"
              body="No invoices match this view. Try another filter or clear the search."
            />
          ) : (
            <EmptyState
              title={kind === 'credit_note' ? 'No credit notes' : 'Your first invoice'}
              body={
                kind === 'credit_note'
                  ? 'Credit notes you issue to correct an invoice appear here.'
                  : 'Create one, preview it exactly as your client will see it, and issue it with its own number.'
              }
              action={
                kind === 'invoice' ? <ButtonLink href="/invoices/new">New invoice</ButtonLink> : undefined
              }
            />
          )
        ) : (
          <table className="w-full text-left">
            <thead className="hidden border-b border-line text-[13px] text-muted md:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Client
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Number
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  {kind === 'credit_note' ? 'Issued' : 'Due'}
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Amount
                </th>
                {kind === 'invoice' ? (
                  <th scope="col" className="w-14 py-3 pr-3">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.items.map((d) => (
                <tr key={d.id} className="relative hover:bg-sunk">
                  <td className="w-full max-w-0 px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        href={d.state === 'draft' ? `/invoices/${d.id}/edit` : `/invoices/${d.id}`}
                        className="min-w-0 truncate font-medium after:absolute after:inset-0"
                      >
                        {d.clientName}
                      </Link>
                      <Money
                        amount={d.total}
                        currency={d.currency}
                        className="shrink-0 font-medium md:hidden"
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 md:hidden">
                      <p className="min-w-0 truncate text-[13px] text-muted">
                        {d.number ?? 'Draft'}
                        {d.kind === 'credit_note' && d.issueDate
                          ? `, issued ${formatBusinessDate(d.issueDate)}`
                          : d.dueDate && d.state !== 'draft'
                            ? `, due ${formatBusinessDate(d.dueDate)}`
                            : ''}
                      </p>
                      <StatePill state={d.state} overdue={d.overdue} />
                    </div>
                    {d.balance > 0 && d.balance !== d.total && d.state !== 'draft' ? (
                      <p className="mt-1 text-right text-[13px] text-muted tabular md:hidden">
                        {formatMoney(d.balance, d.currency)} left
                      </p>
                    ) : null}
                    {d.credits ? (
                      <p className="mt-1 truncate text-[13px] text-muted md:mt-0">Credits {d.credits}</p>
                    ) : d.title ? (
                      <p className="hidden max-w-[40ch] truncate text-[13px] text-muted md:block">
                        {d.title}
                      </p>
                    ) : null}
                  </td>
                  <td className="hidden px-5 py-3.5 whitespace-nowrap text-muted tabular md:table-cell">
                    {d.number ?? 'Draft'}
                  </td>
                  <td className="hidden px-5 py-3.5 whitespace-nowrap text-muted md:table-cell">
                    {d.kind === 'credit_note'
                      ? d.issueDate
                        ? formatBusinessDate(d.issueDate)
                        : ''
                      : d.dueDate && d.state !== 'draft'
                        ? formatBusinessDate(d.dueDate)
                        : ''}
                  </td>
                  <td className="hidden px-5 py-3.5 md:table-cell">
                    <StatePill state={d.state} overdue={d.overdue} />
                  </td>
                  <td className="hidden px-5 py-3.5 text-right md:table-cell">
                    <Money amount={d.total} currency={d.currency} className="font-medium" />
                    {d.balance > 0 && d.balance !== d.total && d.state !== 'draft' ? (
                      <p className="text-[13px] text-muted tabular">
                        {formatMoney(d.balance, d.currency)} left
                      </p>
                    ) : null}
                  </td>
                  {kind === 'invoice' ? (
                    <td className="w-14 py-2 pr-3 align-middle">
                      <RowActions
                        id={d.id}
                        number={d.number}
                        lifecycle={d.lifecycle}
                        balance={d.balance}
                        currency={d.currency}
                        today={today}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      {shown.pages > 1 ? (
        <nav
          aria-label="Pages"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[14px] text-muted"
        >
          <p className="tabular">
            {shown.from} to {shown.to} of {shown.total}
          </p>
          <div className="flex gap-2">
            {shown.page > 1 ? (
              <ButtonLink
                href={link({ page: shown.page > 2 ? String(shown.page - 1) : undefined })}
                variant="secondary"
                size="sm"
              >
                Previous
              </ButtonLink>
            ) : null}
            {shown.page < shown.pages ? (
              <ButtonLink href={link({ page: String(shown.page + 1) })} variant="secondary" size="sm">
                Next
              </ButtonLink>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
