import { toDecimalString, type DocumentSnapshot } from '@invoica/core';
import { exportOrganisation } from '@invoica/db';
import { inWorkspace } from '@/lib/workspace';
import { toCsv } from '@/lib/csv';

/** Downloads all of the organisation's data as JSON, or invoices, payments or clients as CSV. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const format = params.get('format') === 'csv' ? 'csv' : 'json';
  const type = params.get('type') ?? 'invoices';
  const data = await inWorkspace((tx) => exportOrganisation(tx));
  const stamp = new Date().toISOString().slice(0, 10);
  const name = (data.organisation[0]?.name ?? 'invoica').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase();
  if (format === 'json') {
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}-export-${stamp}.json"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }
  const clients = new Map(data.clients.map((c) => [c.id, c.name]));
  const docs = new Map(data.documents.map((d) => [d.id, d]));
  let csv: string;
  if (type === 'payments') {
    csv = toCsv(
      ['invoice', 'client', 'paid_on', 'amount', 'currency', 'method', 'reference', 'removed'],
      data.payments.map((p) => {
        const d = docs.get(p.documentId);
        return [
          d?.number,
          d ? clients.get(d.clientId) : '',
          p.paidOn,
          toDecimalString(p.amount, p.currency),
          p.currency,
          p.method,
          p.reference,
          p.removedAt ? 'yes' : 'no',
        ];
      }),
    );
  } else if (type === 'clients') {
    csv = toCsv(
      [
        'name',
        'contact',
        'email',
        'address_line1',
        'address_line2',
        'city',
        'region',
        'postcode',
        'country',
        'tax_number',
        'currency',
        'payment_terms_days',
        'archived',
      ],
      data.clients.map((c) => [
        c.name,
        c.contactName,
        c.email,
        c.addressLine1,
        c.addressLine2,
        c.city,
        c.region,
        c.postcode,
        c.countryCode,
        c.taxNumber,
        c.currency,
        c.paymentTermsDays,
        c.archivedAt ? 'yes' : 'no',
      ]),
    );
  } else {
    csv = toCsv(
      [
        'kind',
        'number',
        'status',
        'client',
        'issue_date',
        'due_date',
        'currency',
        'subtotal',
        'discounts',
        'tax',
        'total',
        'credits_invoice',
      ],
      data.documents
        .filter((d) => d.lifecycle !== 'draft')
        .map((d) => {
          const snap = d.snapshot as unknown as DocumentSnapshot | null;
          return [
            d.kind,
            d.number,
            d.lifecycle,
            clients.get(d.clientId),
            d.issueDate,
            d.dueDate,
            d.currency,
            toDecimalString(d.subtotal, d.currency),
            toDecimalString(d.discountTotal, d.currency),
            toDecimalString(d.taxTotal, d.currency),
            toDecimalString(d.total, d.currency),
            snap?.credits?.number ?? '',
          ];
        }),
    );
  }
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}-${type}-${stamp}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
