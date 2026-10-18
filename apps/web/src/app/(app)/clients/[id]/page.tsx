import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { formatBusinessDate, formatMoney, summariseReceivables } from '@invoica/core';
import { getClient, listDocuments } from '@invoica/db';
import { ButtonLink, Money, PageHeader, Panel, PanelHeading, StatePill } from '@/components/ui';
import { ArchiveClientButton } from '@/components/archive-client-button';
import { inWorkspace } from '@/lib/workspace';
import { countryName } from '@/lib/countries';
import { isUuid } from '@/lib/ids';

export const metadata: Metadata = { title: 'Client' };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await inWorkspace(async (tx, ws) => {
    const found = await getClient(tx, id);
    if (!found) return null;
    const invoices = await listDocuments(tx, { today: ws.today, clientId: id });
    return { ...found, invoices, today: ws.today, base: ws.organisation.baseCurrency };
  });
  if (!data) notFound();
  const { client, fields, invoices } = data;
  const summary = summariseReceivables(
    invoices.map((d) => ({
      currency: d.currency,
      lifecycle: d.lifecycle,
      total: d.total,
      paid: d.applied,
      dueDate: d.dueDate,
    })),
    data.today,
  );
  const paidToDate = new Map<string, number>();
  for (const d of invoices)
    if (d.lifecycle !== 'void' && d.lifecycle !== 'draft')
      paidToDate.set(d.currency, (paidToDate.get(d.currency) ?? 0) + d.applied);
  const address = [
    client.addressLine1,
    client.addressLine2,
    client.city,
    client.region,
    client.postcode,
    client.countryCode ? countryName(client.countryCode) : null,
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title={client.name}
        description={
          client.archivedAt ? 'Archived. Their invoices are kept.' : (client.contactName ?? undefined)
        }
        back={{ href: '/clients', label: 'Clients' }}
        actions={
          <>
            <ButtonLink href={`/clients/${id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
            <ArchiveClientButton id={id} archived={!!client.archivedAt} />
            <ButtonLink href={`/invoices/new?client=${id}`}>
              <Plus className="size-4" aria-hidden /> New invoice
            </ButtonLink>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Panel>
            <dl className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-5 py-4">
                <dt className="text-[13px] text-muted">Owes you now</dt>
                <dd className="mt-1 font-display text-[22px] font-semibold tabular">
                  {summary.length === 0
                    ? formatMoney(0, client.currency ?? data.base)
                    : summary.map((s) => (
                        <div key={s.currency}>{formatMoney(s.outstanding, s.currency)}</div>
                      ))}
                </dd>
              </div>
              <div className="px-5 py-4">
                <dt className="text-[13px] text-muted">Overdue</dt>
                <dd className="mt-1 font-display text-[22px] font-semibold tabular">
                  {summary.length === 0
                    ? formatMoney(0, client.currency ?? data.base)
                    : summary.map((s) => (
                        <div key={s.currency} className={s.overdue > 0 ? 'text-danger' : ''}>
                          {formatMoney(s.overdue, s.currency)}
                        </div>
                      ))}
                </dd>
              </div>
              <div className="px-5 py-4">
                <dt className="text-[13px] text-muted">Paid to date</dt>
                <dd className="mt-1 font-display text-[22px] font-semibold tabular">
                  {paidToDate.size === 0
                    ? formatMoney(0, client.currency ?? data.base)
                    : [...paidToDate.entries()].map(([c, a]) => <div key={c}>{formatMoney(a, c)}</div>)}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel>
            <PanelHeading>Invoices</PanelHeading>
            {invoices.length === 0 ? (
              <p className="px-5 py-8 text-muted">No invoices for {client.name} yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {invoices.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/invoices/${d.id}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 hover:bg-sunk sm:grid-cols-[1fr_9rem_7rem]"
                    >
                      <div>
                        <p className="font-medium">{d.number ?? 'Draft'}</p>
                        <p className="text-[13px] text-muted">
                          {d.title ?? (d.issueDate ? formatBusinessDate(d.issueDate) : 'Not issued yet')}
                        </p>
                      </div>
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
        </div>
        <Panel className="self-start">
          <PanelHeading>Details</PanelHeading>
          <dl className="flex flex-col gap-4 px-5 py-4 text-[14px]">
            <div>
              <dt className="text-muted">Email</dt>
              <dd>{client.email ?? 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted">Address</dt>
              <dd>{address.length ? address.map((l) => <div key={l}>{l}</div>) : 'Not set'}</dd>
            </div>
            {client.taxNumber ? (
              <div>
                <dt className="text-muted">Tax number</dt>
                <dd>{client.taxNumber}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted">Payment terms</dt>
              <dd>
                {client.paymentTermsDays === null ? 'Your usual terms' : `${client.paymentTermsDays} days`}
              </dd>
            </div>
            {fields.map((f) => (
              <div key={f.id}>
                <dt className="text-muted">{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
            {client.notes ? (
              <div>
                <dt className="text-muted">Private notes</dt>
                <dd className="whitespace-pre-line">{client.notes}</dd>
              </div>
            ) : null}
          </dl>
        </Panel>
      </div>
    </div>
  );
}
