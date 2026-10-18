import { sumMinor } from './money';
import { addMonths, daysBetween, monthKey, type BusinessDate } from './dates';
import { isOverdue, type Lifecycle } from './states';

export interface ReceivableDocument {
  currency: string;
  lifecycle: Lifecycle;
  total: number;
  /** Payments and credits applied. */
  paid: number;
  dueDate: BusinessDate | null;
}

export interface AgeingBuckets {
  notDue: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
}

export interface ReceivablesSummary {
  currency: string;
  /** Money still owed on issued documents. The one definition of outstanding, used on every screen. */
  outstanding: number;
  openCount: number;
  overdue: number;
  overdueCount: number;
  ageing: AgeingBuckets;
}

/** Whether a document counts towards outstanding: issued or sent, with a balance above zero. */
export function isOpen(doc: ReceivableDocument): boolean {
  return (doc.lifecycle === 'issued' || doc.lifecycle === 'sent') && doc.total - doc.paid > 0;
}

/** Outstanding, overdue and ageing per currency. Amounts in different currencies are never added together. */
export function summariseReceivables(
  docs: readonly ReceivableDocument[],
  today: BusinessDate,
): ReceivablesSummary[] {
  const byCurrency = new Map<string, ReceivablesSummary>();
  for (const doc of docs) {
    if (!isOpen(doc)) continue;
    const balance = doc.total - doc.paid;
    const row = byCurrency.get(doc.currency) ?? {
      currency: doc.currency,
      outstanding: 0,
      openCount: 0,
      overdue: 0,
      overdueCount: 0,
      ageing: { notDue: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 },
    };
    row.outstanding = sumMinor([row.outstanding, balance]);
    row.openCount += 1;
    if (isOverdue({ lifecycle: doc.lifecycle, balance, dueDate: doc.dueDate, today })) {
      row.overdue = sumMinor([row.overdue, balance]);
      row.overdueCount += 1;
      const late = daysBetween(doc.dueDate!, today);
      const bucket =
        late <= 30 ? 'days1to30' : late <= 60 ? 'days31to60' : late <= 90 ? 'days61to90' : 'over90';
      row.ageing[bucket] += balance;
    } else {
      row.ageing.notDue += balance;
    }
    byCurrency.set(doc.currency, row);
  }
  return [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export interface DatedAmount {
  currency: string;
  date: BusinessDate;
  amount: number;
}

/** Totals per calendar month for the `months` months ending with the month of `today`, oldest first. */
export function monthlyTotals(
  entries: readonly DatedAmount[],
  currencyCode: string,
  today: BusinessDate,
  months: number,
): { month: string; amount: number }[] {
  const keys = Array.from({ length: months }, (_, i) =>
    monthKey(addMonths(`${monthKey(today)}-01`, i - months + 1)),
  );
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const e of entries) {
    if (e.currency !== currencyCode) continue;
    const key = monthKey(e.date);
    if (totals.has(key)) totals.set(key, sumMinor([totals.get(key) ?? 0, e.amount]));
  }
  return keys.map((month) => ({ month, amount: totals.get(month) ?? 0 }));
}
