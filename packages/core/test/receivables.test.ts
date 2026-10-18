import { describe, expect, it } from 'vitest';
import { monthlyTotals, summariseReceivables, type ReceivableDocument } from '../src/receivables';

const d = (over: Partial<ReceivableDocument>): ReceivableDocument => ({
  currency: 'GBP',
  lifecycle: 'sent',
  total: 10_000,
  paid: 0,
  dueDate: '2026-10-30',
  ...over,
});

describe('receivables', () => {
  it('uses one definition of outstanding and never mixes currencies', () => {
    const rows = summariseReceivables(
      [
        d({}),
        d({ paid: 4000 }),
        d({ lifecycle: 'draft' }),
        d({ lifecycle: 'void' }),
        d({ paid: 10_000 }),
        d({ currency: 'GHS', total: 50_000 }),
        d({ dueDate: '2026-10-01' }),
        d({ dueDate: '2026-07-01' }),
      ],
      '2026-10-18',
    );
    expect(rows.map((r) => [r.currency, r.outstanding, r.openCount, r.overdue, r.overdueCount])).toEqual([
      ['GBP', 36_000, 4, 20_000, 2],
      ['GHS', 50_000, 1, 0, 0],
    ]);
    expect(rows[0]?.ageing).toEqual({
      notDue: 16_000,
      days1to30: 10_000,
      days31to60: 0,
      days61to90: 0,
      over90: 10_000,
    });
  });

  it('totals payments by month for the months ending with this one', () => {
    const rows = monthlyTotals(
      [
        { currency: 'GBP', date: '2026-10-02', amount: 100 },
        { currency: 'GBP', date: '2026-10-20', amount: 50 },
        { currency: 'GBP', date: '2026-08-31', amount: 25 },
        { currency: 'GBP', date: '2026-04-30', amount: 999 },
        { currency: 'USD', date: '2026-10-02', amount: 7 },
      ],
      'GBP',
      '2026-10-18',
      3,
    );
    expect(rows).toEqual([
      { month: '2026-08', amount: 25 },
      { month: '2026-09', amount: 0 },
      { month: '2026-10', amount: 150 },
    ]);
  });
});
