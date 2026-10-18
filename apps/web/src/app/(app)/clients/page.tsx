import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { formatMoney } from '@invoica/core';
import { listClients, listDocuments } from '@invoica/db';
import { ButtonLink, EmptyState, Input, PageHeader, Panel } from '@/components/ui';
import { inWorkspace } from '@/lib/workspace';
import { countryName } from '@/lib/countries';

export const metadata: Metadata = { title: 'Clients' };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  const { q, archived } = await searchParams;
  const { clients, owed, counts } = await inWorkspace(async (tx, ws) => {
    const clients = await listClients(tx, { search: q, archived: archived === '1' });
    const invoices = await listDocuments(tx, { today: ws.today });
    const owed = new Map<string, Map<string, number>>();
    const counts = new Map<string, number>();
    for (const d of invoices) {
      counts.set(d.clientId, (counts.get(d.clientId) ?? 0) + (d.state === 'draft' ? 0 : 1));
      if (d.balance > 0 && (d.lifecycle === 'issued' || d.lifecycle === 'sent')) {
        const m = owed.get(d.clientId) ?? new Map<string, number>();
        m.set(d.currency, (m.get(d.currency) ?? 0) + d.balance);
        owed.set(d.clientId, m);
      }
    }
    return { clients, owed, counts };
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Everyone you bill, with what each one owes you right now."
        actions={
          <ButtonLink href="/clients/new">
            <Plus className="size-4" aria-hidden /> New client
          </ButtonLink>
        }
      />
      <form className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center" role="search">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <label htmlFor="q" className="sr-only">
            Search clients
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 text-[14px]">
          <Link
            href="/clients"
            aria-current={archived !== '1' ? 'page' : undefined}
            className="rounded-lg px-3 py-2 text-muted aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-ink"
          >
            Active
          </Link>
          <Link
            href="/clients?archived=1"
            aria-current={archived === '1' ? 'page' : undefined}
            className="rounded-lg px-3 py-2 text-muted aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-ink"
          >
            Archived
          </Link>
        </div>
      </form>
      <Panel>
        {clients.length === 0 ? (
          q ? (
            <EmptyState
              title="No clients match"
              body={`Nothing matches “${q}”. Check the spelling or clear the search.`}
            />
          ) : archived === '1' ? (
            <EmptyState
              title="No archived clients"
              body="Clients you archive are kept here with their invoices."
            />
          ) : (
            <EmptyState
              title="Add your first client"
              body="Save a client once and every invoice to them fills in their name, address and terms."
              action={<ButtonLink href="/clients/new">New client</ButtonLink>}
            />
          )
        ) : (
          <table className="w-full text-left">
            <thead className="hidden border-b border-line text-[13px] text-muted sm:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Client
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Invoices
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Owed now
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((c) => {
                const amounts = [...(owed.get(c.id)?.entries() ?? [])];
                return (
                  <tr key={c.id} className="relative hover:bg-sunk">
                    <td className="px-5 py-3.5">
                      <Link href={`/clients/${c.id}`} className="font-medium after:absolute after:inset-0">
                        {c.name}
                      </Link>
                      <p className="text-[13px] text-muted">
                        {[c.email, c.city, c.countryCode ? countryName(c.countryCode) : null]
                          .filter(Boolean)
                          .join(', ') || 'No contact details yet'}
                      </p>
                    </td>
                    <td className="hidden px-5 py-3.5 text-muted tabular sm:table-cell">
                      {counts.get(c.id) ?? 0}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium tabular">
                      {amounts.length === 0 ? (
                        <span className="text-muted">Nothing</span>
                      ) : (
                        amounts.map(([cur, amt]) => <div key={cur}>{formatMoney(amt, cur)}</div>)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
