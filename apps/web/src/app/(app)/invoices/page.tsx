import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { formatBusinessDate, formatMoney } from '@invoica/core';
import { listDocuments, type DocumentFilter } from '@invoica/db';
import { ButtonLink, EmptyState, Input, Money, PageHeader, Panel, StatePill, cx } from '@/components/ui';
import { inWorkspace } from '@/lib/workspace';

export const metadata: Metadata = { title: 'Invoices' };

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
  searchParams: Promise<{ filter?: string; q?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.value === sp.filter)?.value ?? 'all') as DocumentFilter;
  const kind = sp.kind === 'credit_note' ? 'credit_note' : 'invoice';
  const { docs, open } = await inWorkspace(async (tx, ws) => {
    const docs = await listDocuments(tx, { today: ws.today, filter, search: sp.q, kind });
    const open = kind === 'invoice' ? await listDocuments(tx, { today: ws.today, filter: 'open' }) : [];
    return { docs, open };
  });
  const owed = new Map<string, number>();
  for (const d of open) owed.set(d.currency, (owed.get(d.currency) ?? 0) + d.balance);
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
                  Due
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {docs.map((d) => (
                <tr key={d.id} className="relative hover:bg-sunk">
                  <td className="px-5 py-3.5">
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
                        {d.dueDate && d.state !== 'draft' ? `, due ${formatBusinessDate(d.dueDate)}` : ''}
                      </p>
                      <StatePill state={d.state} overdue={d.overdue} />
                    </div>
                    {d.title ? (
                      <p className="hidden max-w-[40ch] truncate text-[13px] text-muted md:block">
                        {d.title}
                      </p>
                    ) : null}
                  </td>
                  <td className="hidden px-5 py-3.5 text-muted tabular md:table-cell">
                    {d.number ?? 'Draft'}
                  </td>
                  <td className="hidden px-5 py-3.5 text-muted md:table-cell">
                    {d.dueDate && d.state !== 'draft' ? formatBusinessDate(d.dueDate) : ''}
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
