import { and, gte, isNull } from 'drizzle-orm';
import {
  addDays,
  addMonths,
  monthlyTotals,
  sumMinor,
  summariseReceivables,
  type BusinessDate,
  type ReceivablesSummary,
} from '@invoica/core';
import type { Tx } from './client';
import { payment } from './schema';
import { listDocuments, type DocumentSummary } from './documents';

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface Dashboard {
  today: BusinessDate;
  baseCurrency: string;
  receivables: ReceivablesSummary[];
  paidLast30Days: CurrencyAmount[];
  /** Invoices issued this month, less credit notes issued this month. */
  invoicedThisMonth: CurrencyAmount[];
  /** Invoices issued this month. */
  issuedThisMonth: CurrencyAmount[];
  /** Credit notes issued this month. */
  creditedThisMonth: CurrencyAmount[];
  monthlyPaid: { month: string; amount: number }[];
  recent: DocumentSummary[];
  overdue: DocumentSummary[];
  draftCount: number;
  topClients: { clientId: string; name: string; currency: string; paid: number }[];
}

function byCurrency(entries: CurrencyAmount[]): CurrencyAmount[] {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.currency, sumMinor([m.get(e.currency) ?? 0, e.amount]));
  return [...m.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

/** Every figure on the dashboard, derived from documents and payments. */
export async function getDashboard(tx: Tx, today: BusinessDate, baseCurrency: string): Promise<Dashboard> {
  const invoices = await listDocuments(tx, { kind: 'invoice', today });
  const receivables = summariseReceivables(
    invoices.map((d) => ({
      currency: d.currency,
      lifecycle: d.lifecycle,
      total: d.total,
      paid: d.applied,
      dueDate: d.dueDate,
    })),
    today,
  );
  const since = addMonths(`${today.slice(0, 7)}-01`, -11);
  const payments = await tx
    .select({
      amount: payment.amount,
      currency: payment.currency,
      paidOn: payment.paidOn,
      documentId: payment.documentId,
    })
    .from(payment)
    .where(and(isNull(payment.removedAt), gte(payment.paidOn, since)));
  const thirtyDaysAgo = addDays(today, -30);
  const paidLast30Days = byCurrency(
    payments
      .filter((p) => p.paidOn > thirtyDaysAgo && p.paidOn <= today)
      .map((p) => ({ currency: p.currency, amount: p.amount })),
  );
  const monthStart = `${today.slice(0, 7)}-01`;
  const inMonth = (d: DocumentSummary) =>
    d.lifecycle !== 'draft' &&
    d.lifecycle !== 'void' &&
    !!d.issueDate &&
    d.issueDate >= monthStart &&
    d.issueDate <= today;
  // Invoiced this month: invoices issued this month, less credit notes issued this month (docs/domain.md).
  const creditNotes = await listDocuments(tx, { kind: 'credit_note', today });
  const issuedThisMonth = byCurrency(
    invoices.filter(inMonth).map((d) => ({ currency: d.currency, amount: d.total })),
  );
  const creditedThisMonth = byCurrency(
    creditNotes.filter(inMonth).map((d) => ({ currency: d.currency, amount: d.total })),
  );
  const invoicedThisMonth = byCurrency([
    ...issuedThisMonth,
    ...creditedThisMonth.map((c) => ({ currency: c.currency, amount: -c.amount })),
  ]);
  const monthlyPaid = monthlyTotals(
    payments.map((p) => ({ currency: p.currency, date: p.paidOn, amount: p.amount })),
    baseCurrency,
    today,
    6,
  );

  const paidByClient = new Map<string, { clientId: string; name: string; currency: string; paid: number }>();
  for (const d of invoices) {
    if (d.currency !== baseCurrency || d.lifecycle === 'void' || d.lifecycle === 'draft') continue;
    const paid = d.paid;
    if (paid <= 0) continue;
    const row = paidByClient.get(d.clientId) ?? {
      clientId: d.clientId,
      name: d.clientName,
      currency: d.currency,
      paid: 0,
    };
    row.paid = sumMinor([row.paid, paid]);
    paidByClient.set(d.clientId, row);
  }

  return {
    today,
    baseCurrency,
    receivables,
    paidLast30Days,
    invoicedThisMonth,
    issuedThisMonth,
    creditedThisMonth,
    monthlyPaid,
    recent: invoices.slice(0, 6),
    overdue: invoices
      .filter((d) => d.overdue)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    draftCount: invoices.filter((d) => d.state === 'draft').length,
    topClients: [...paidByClient.values()].sort((a, b) => b.paid - a.paid).slice(0, 5),
  };
}
