import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeDocument, type DocumentInput, type DocumentTotals, type LineInput } from '../src/totals';
import type { TaxCode } from '../src/tax';
import { checkCredit, creditSource, planAmountCredit, planLineCredit } from '../src/credits';
import { DomainError } from '../src/errors';
import { presetFor } from '../src/presets';

const vat = (ratePpm: number): TaxCode => ({
  label: `VAT ${ratePpm / 10_000}%`,
  treatment: ratePpm === 0 ? 'zero' : 'standard',
  components: [{ name: 'VAT', ratePpm, compound: false }],
});
const reverse: TaxCode = {
  label: 'Reverse charge 20%',
  treatment: 'reverse_charge',
  components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
};
const ghana = presetFor('GH')!.codes.find((c) => c.key === 'gh_standard')!;
const ghanaCode: TaxCode = { label: ghana.label, treatment: ghana.treatment, components: ghana.components };

const invoice = (lines: LineInput[], extra: Partial<DocumentInput> = {}): DocumentInput => ({
  currency: 'GBP',
  pricesIncludeTax: false,
  taxLevel: 'line',
  rounding: 'half-up',
  lines,
  ...extra,
});
const line = (quantity: number, unitPrice: number, tax: TaxCode | null = null): LineInput => ({
  quantity,
  unitPrice,
  tax,
});

function rows(t: DocumentTotals) {
  return Object.fromEntries(t.taxes.map((r) => [r.key, [r.base, r.amount]]));
}

function codeOf(error: unknown): string | null {
  return error instanceof DomainError ? error.code : null;
}

describe('crediting the lines of an invoice', () => {
  it('crediting every line in full gives the invoice figures exactly, discounts included', () => {
    const input = invoice(
      [line(3000, 3333, vat(200_000)), line(1000, 1001, vat(50_000)), line(1500, 999, vat(0))],
      { discounts: [{ label: 'Loyalty', kind: 'amount', amount: 1234 }] },
    );
    const totals = computeDocument(input);
    const source = creditSource(input, totals);
    const plan = planLineCredit(
      source,
      [0, 0, 0],
      [
        { index: 0, quantity: 3000 },
        { index: 1, quantity: 1000 },
        { index: 2, quantity: 1500 },
      ],
    );
    expect(plan.totals.total).toBe(totals.total);
    expect(plan.totals.taxTotal).toBe(totals.taxTotal);
    expect(plan.totals.subtotal).toBe(totals.subtotal);
    expect(plan.totals.discountTotal).toBe(totals.discountTotal);
    expect(rows(plan.totals)).toEqual(rows(totals));
  });

  it('credits taken one unit at a time add up to the invoice: 3 at 1.01 with VAT 20% per line', () => {
    const input = invoice([line(3000, 101, vat(200_000))]);
    const totals = computeDocument(input);
    expect([totals.taxTotal, totals.total]).toEqual([61, 364]);
    const source = creditSource(input, totals);
    const first = planLineCredit(source, [0], [{ index: 0, quantity: 1000 }]);
    const second = planLineCredit(source, [1000], [{ index: 0, quantity: 1000 }]);
    const third = planLineCredit(source, [2000], [{ index: 0, quantity: 1000 }]);
    expect([first.totals.taxTotal, second.totals.taxTotal, third.totals.taxTotal]).toEqual([20, 20, 21]);
    expect(first.totals.total + second.totals.total + third.totals.total).toBe(364);
  });

  it('copies the price and the tax the invoice line used', () => {
    const input = invoice([line(2000, 5000, vat(0)), line(1000, 8000, vat(200_000))]);
    const totals = computeDocument(input);
    const plan = planLineCredit(creditSource(input, totals), [0, 0], [{ index: 0, quantity: 1000 }]);
    expect(plan.lines).toEqual([{ index: 0, quantity: 1000, unitPrice: 5000, tax: vat(0) }]);
    expect([plan.totals.total, plan.totals.taxTotal]).toEqual([5000, 0]);
  });

  it('refuses a quantity above what is still uncredited on the line', () => {
    const input = invoice([line(1000, 10_000, vat(200_000))]);
    const source = creditSource(input, computeDocument(input));
    expect(codeOf(catchError(() => planLineCredit(source, [0], [{ index: 0, quantity: 50_000 }])))).toBe(
      'credit_exceeds_quantity',
    );
    expect(codeOf(catchError(() => planLineCredit(source, [600], [{ index: 0, quantity: 500 }])))).toBe(
      'credit_exceeds_quantity',
    );
  });

  it('refuses a credit of nothing, a line that is not on the invoice and the same line twice', () => {
    const input = invoice([line(1000, 10_000, vat(200_000))]);
    const source = creditSource(input, computeDocument(input));
    expect(codeOf(catchError(() => planLineCredit(source, [0], [{ index: 0, quantity: 0 }])))).toBe(
      'credit_nothing',
    );
    expect(codeOf(catchError(() => planLineCredit(source, [0], [{ index: 3, quantity: 1000 }])))).toBe(
      'credit_line_not_found',
    );
    expect(
      codeOf(
        catchError(() =>
          planLineCredit(
            source,
            [0],
            [
              { index: 0, quantity: 500 },
              { index: 0, quantity: 500 },
            ],
          ),
        ),
      ),
    ).toBe('credit_line_repeated');
  });

  it('keeps prices including tax as they were invoiced', () => {
    const input = invoice([line(1000, 1001, vat(200_000))], { pricesIncludeTax: true });
    const totals = computeDocument(input);
    const plan = planLineCredit(creditSource(input, totals), [0], [{ index: 0, quantity: 1000 }]);
    expect(plan.pricesIncludeTax).toBe(true);
    expect([plan.totals.total, plan.totals.taxTotal]).toEqual([totals.total, totals.taxTotal]);
  });

  it('property: credits split any way add up to the invoice, row by row', () => {
    const codeArb = fc.constantFrom<TaxCode | null>(
      null,
      vat(200_000),
      vat(50_000),
      vat(0),
      reverse,
      ghanaCode,
    );
    const lineArb = fc.record({
      quantity: fc.integer({ min: 1, max: 20_000 }),
      unitPrice: fc.integer({ min: 0, max: 500_000 }),
      tax: codeArb,
    });
    fc.assert(
      fc.property(
        fc.array(lineArb, { minLength: 1, maxLength: 5 }),
        fc.constantFrom('line' as const, 'document' as const),
        fc.constantFrom('half-up' as const, 'down' as const),
        fc.boolean(),
        fc.option(fc.integer({ min: 0, max: 400_000 }), { nil: undefined }),
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 4 }),
        (lines, taxLevel, rounding, pricesIncludeTax, discountPpm, cuts) => {
          const input = invoice(lines, {
            taxLevel,
            rounding,
            pricesIncludeTax,
            discounts:
              discountPpm === undefined ? [] : [{ label: 'Discount', kind: 'percent', ratePpm: discountPpm }],
          });
          const totals = computeDocument(input);
          const source = creditSource(input, totals);
          const credited = lines.map(() => 0);
          const sum = { total: 0, taxTotal: 0, rows: new Map<string, number>() };
          // Each cut is the share of every line's remaining quantity taken by the next credit, out of 1000.
          const steps = [...cuts.map((c) => c), 1000];
          for (const share of steps) {
            const request = lines
              .map((l, index) => {
                const remaining = l.quantity - credited[index]!;
                const quantity = share === 1000 ? remaining : Math.floor((remaining * share) / 1000);
                return { index, quantity };
              })
              .filter((r) => r.quantity > 0);
            if (request.length === 0) continue;
            const plan = planLineCredit(source, credited, request);
            for (const r of request) credited[r.index]! += r.quantity;
            sum.total += plan.totals.total;
            sum.taxTotal += plan.totals.taxTotal;
            for (const row of plan.totals.taxes)
              sum.rows.set(row.key, (sum.rows.get(row.key) ?? 0) + row.amount);
          }
          expect(sum.total).toBe(totals.total);
          expect(sum.taxTotal).toBe(totals.taxTotal);
          for (const row of totals.taxes) expect(sum.rows.get(row.key) ?? 0).toBe(row.amount);
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe('crediting an amount', () => {
  it('shares the amount across the tax rates the invoice charged (review H3)', () => {
    const input = invoice([line(1000, 50_000, vat(200_000)), line(1000, 10_000, vat(0))]);
    const totals = computeDocument(input);
    expect([totals.total, totals.taxTotal]).toEqual([70_000, 10_000]);
    const plan = planAmountCredit(creditSource(input, totals), totals, 30_000);
    expect(plan.pricesIncludeTax).toBe(true);
    expect(plan.lines.map((l) => [l.unitPrice, l.tax?.label])).toEqual([
      [25_714, 'VAT 20%'],
      [4286, 'VAT 0%'],
    ]);
    expect([plan.totals.total, plan.totals.taxTotal]).toEqual([30_000, 4286]);
  });

  it('a reverse-charge share is a net amount and its VAT is shown, not charged', () => {
    const input = invoice([line(1000, 10_000, reverse)]);
    const totals = computeDocument(input);
    const plan = planAmountCredit(creditSource(input, totals), totals, 4000);
    expect([plan.totals.total, plan.totals.taxTotal]).toEqual([4000, 0]);
    expect(plan.totals.taxes[0]).toMatchObject({ base: 4000, amount: 800, charged: false });
  });

  it('a Ghana invoice credited by amount keeps every levy at its rate', () => {
    const input = invoice([line(1000, 10_000, ghanaCode)], { currency: 'GHS', taxLevel: 'document' });
    const totals = computeDocument(input);
    const plan = planAmountCredit(creditSource(input, totals), totals, 6000);
    expect(plan.totals.total).toBe(6000);
    expect(plan.totals.taxes.map((r) => r.amount)).toEqual([125, 125, 750]);
  });

  it('refuses an amount of zero or less', () => {
    const input = invoice([line(1000, 10_000, vat(200_000))]);
    const totals = computeDocument(input);
    expect(codeOf(catchError(() => planAmountCredit(creditSource(input, totals), totals, 0)))).toBe(
      'credit_not_positive',
    );
  });
});

describe('checking a credit against the invoice', () => {
  const input = invoice([line(1000, 10_000, vat(200_000)), line(1000, 10_000, vat(0))]);
  const totals = computeDocument(input);
  const source = creditSource(input, totals);

  it('passes a credit within the balance and the tax charged', () => {
    const credit = planLineCredit(source, [0, 0], [{ index: 0, quantity: 1000 }]).totals;
    expect(() => checkCredit({ invoice: totals, balance: totals.total, earlier: [], credit })).not.toThrow();
  });

  it('refuses a credit above the balance still owed', () => {
    const credit = planLineCredit(source, [0, 0], [{ index: 0, quantity: 1000 }]).totals;
    expect(
      codeOf(catchError(() => checkCredit({ invoice: totals, balance: 5000, earlier: [], credit }))),
    ).toBe('credit_exceeds_balance');
  });

  it('refuses tax the invoice did not charge (review H1, case 1)', () => {
    const zeroOnly = invoice([line(1000, 10_000, vat(0))]);
    const zeroTotals = computeDocument(zeroOnly);
    const credit = computeDocument(invoice([line(1000, 8333, vat(200_000))]));
    expect(
      codeOf(
        catchError(() =>
          checkCredit({ invoice: zeroTotals, balance: zeroTotals.total, earlier: [], credit }),
        ),
      ),
    ).toBe('credit_tax_not_on_invoice');
  });

  it('refuses more tax than was charged once earlier credit notes are counted', () => {
    const half = computeDocument(invoice([line(1000, 6000, vat(200_000))]));
    expect(
      codeOf(
        catchError(() =>
          checkCredit({ invoice: totals, balance: totals.total, earlier: [half], credit: half }),
        ),
      ),
    ).toBe('credit_exceeds_tax');
  });

  it('refuses a credit of nothing', () => {
    const credit = computeDocument(invoice([line(1000, 0, vat(200_000))]));
    expect(
      codeOf(catchError(() => checkCredit({ invoice: totals, balance: totals.total, earlier: [], credit }))),
    ).toBe('credit_not_positive');
  });
});

describe('a fixed discount on a line', () => {
  it('is taken off before tax and shown as one discount row', () => {
    const t = computeDocument({ ...invoice([{ ...line(1000, 10_000, vat(200_000)), discount: 1000 }]) });
    expect([t.discountTotal, t.net, t.taxTotal, t.total]).toEqual([1000, 9000, 1800, 10_800]);
    expect(t.discounts).toEqual([{ label: 'Discount', amount: 1000 }]);
  });

  it('cannot be more than the line or below zero', () => {
    expect(codeOf(catchError(() => computeDocument(invoice([{ ...line(1000, 100), discount: 101 }]))))).toBe(
      'discount_exceeds_line',
    );
    expect(codeOf(catchError(() => computeDocument(invoice([{ ...line(1000, 100), discount: -1 }]))))).toBe(
      'discount_exceeds_line',
    );
  });
});

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected an error.');
}
