import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeDocument, type DocumentInput, type DocumentTotals, type LineInput } from '../src/totals';
import type { TaxCode } from '../src/tax';
import {
  checkCredit,
  creditSource,
  creditState,
  creditedLines,
  planAmountCredit,
  planLineCredit,
  type CreditPlan,
  type CreditSource,
  type CreditedLine,
} from '../src/credits';
import { DomainError } from '../src/errors';
import { presetFor } from '../src/presets';

/** Acceptance criteria: docs/specs/credit-notes.md. */

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
const exempt: TaxCode = { label: 'Exempt', treatment: 'exempt', components: [] };
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

function sourceOf(input: DocumentInput): { source: CreditSource; totals: DocumentTotals } {
  const totals = computeDocument(input);
  return { source: creditSource(input, totals), totals };
}

/** Issues credit notes one after another, keeping the ledger as the database would. */
function ledger(source: CreditSource) {
  const earlier: CreditedLine[] = [];
  const notes: DocumentTotals[] = [];
  return {
    notes,
    lines(request: { index: number; quantity: number }[]): CreditPlan {
      const plan = planLineCredit(source, creditState(source, earlier), request);
      earlier.push(...creditedLines(plan));
      notes.push(plan.totals);
      return plan;
    },
    amount(amount: number): CreditPlan {
      const plan = planAmountCredit(source, creditState(source, earlier), amount);
      earlier.push(...creditedLines(plan));
      notes.push(plan.totals);
      return plan;
    },
    state: () => creditState(source, earlier),
  };
}

function rowSums(notes: DocumentTotals[]) {
  const sums = new Map<string, { base: number; amount: number }>();
  for (const n of notes)
    for (const r of n.taxes) {
      const s = sums.get(r.key) ?? { base: 0, amount: 0 };
      s.base += r.base;
      s.amount += r.amount;
      sums.set(r.key, s);
    }
  return sums;
}

function expectExact(totals: DocumentTotals, notes: DocumentTotals[]) {
  const sums = rowSums(notes);
  for (const r of totals.taxes) expect(sums.get(r.key), r.key).toEqual({ base: r.base, amount: r.amount });
  expect([...sums.keys()].every((k) => totals.taxes.some((r) => r.key === k))).toBe(true);
  expect(notes.reduce((a, n) => a + n.total, 0)).toBe(totals.total);
  expect(notes.reduce((a, n) => a + n.taxTotal, 0)).toBe(totals.taxTotal);
}

function expectWellFormed(note: DocumentTotals) {
  for (const r of note.taxes) {
    expect(r.amount, r.key).toBeGreaterThanOrEqual(0);
    expect(r.base, r.key).toBeGreaterThanOrEqual(0);
  }
  expect(note.lines.reduce((a, l) => a + l.tax, 0)).toBe(note.taxTotal);
  expect(note.total).toBe(note.net + note.taxTotal);
  expect(note.subtotal - note.discountTotal).toBe(note.lines.reduce((a, l) => a + l.amount - l.discount, 0));
}

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
  } catch (error) {
    return error instanceof DomainError ? error.code : 'not a domain error';
  }
  return null;
}

describe('criterion 1: the whole invoice', () => {
  it('reproduces the invoice exactly, discounts included', () => {
    const input = invoice(
      [line(3000, 3333, vat(200_000)), line(1000, 1001, vat(50_000)), line(1500, 999, vat(0))],
      { discounts: [{ label: 'Loyalty', kind: 'amount', amount: 1234 }] },
    );
    const { source, totals } = sourceOf(input);
    const l = ledger(source);
    l.lines(input.lines.map((x, index) => ({ index, quantity: x.quantity })));
    expectExact(totals, l.notes);
    expect(l.notes[0]!.discountTotal).toBe(totals.discountTotal);
  });
});

describe('criteria 2 to 4: any mix of credits', () => {
  const codeArb = fc.constantFrom<TaxCode | null>(
    null,
    vat(200_000),
    vat(50_000),
    vat(0),
    reverse,
    exempt,
    ghanaCode,
  );
  const lineArb = fc.record({
    quantity: fc.integer({ min: 1, max: 6 }).map((n) => n * 500),
    unitPrice: fc.integer({ min: 1, max: 300_000 }),
    tax: codeArb,
  });
  const stepArb = fc.record({
    kind: fc.constantFrom('lines' as const, 'amount' as const),
    share: fc.integer({ min: 1, max: 999 }),
    pick: fc.integer({ min: 0, max: 63 }),
  });

  it('credit every tax row exactly once everything is credited, and never print a negative or foreign row', () => {
    fc.assert(
      fc.property(
        fc.array(lineArb, { minLength: 1, maxLength: 5 }),
        fc.constantFrom('line' as const, 'document' as const),
        fc.constantFrom('half-up' as const, 'down' as const, 'half-even' as const),
        fc.boolean(),
        fc.option(fc.integer({ min: 0, max: 400_000 }), { nil: undefined }),
        fc.array(stepArb, { maxLength: 5 }),
        (lines, taxLevel, rounding, pricesIncludeTax, discountPpm, steps) => {
          const input = invoice(lines, {
            taxLevel,
            rounding,
            pricesIncludeTax,
            discounts:
              discountPpm === undefined ? [] : [{ label: 'Discount', kind: 'percent', ratePpm: discountPpm }],
          });
          const totals = computeDocument(input);
          fc.pre(totals.total > 0);
          const source = creditSource(input, totals);
          const l = ledger(source);
          for (const step of steps) {
            const state = l.state();
            if (step.kind === 'lines') {
              const request = lines
                .map((x, index) => ({
                  index,
                  quantity:
                    (step.pick >> index) & 1
                      ? Math.floor(((x.quantity - state.quantities[index]!) * step.share) / 1000)
                      : 0,
                }))
                .filter((r) => r.quantity > 0);
              if (request.length === 0) continue;
              try {
                l.lines(request);
              } catch (error) {
                // Refused when a group has less value left than the lines ask for, or the note would be for nothing.
                expect(error).toBeInstanceOf(DomainError);
                expect(['credit_exceeds_group', 'credit_not_positive', 'credit_too_small']).toContain(
                  (error as DomainError).code,
                );
              }
            } else {
              const left = Object.values(state.groups).reduce((a, v) => a + v.left, 0);
              const amount = Math.floor((left * step.share) / 1000);
              if (amount <= 0) continue;
              try {
                l.amount(amount);
              } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
                expect(['credit_not_positive', 'credit_too_small']).toContain((error as DomainError).code);
              }
            }
          }
          const left = Object.values(l.state().groups).reduce((a, v) => a + v.left, 0);
          if (left > 0) l.amount(left);
          for (const note of l.notes) expectWellFormed(note);
          expectExact(totals, l.notes);
        },
      ),
      { numRuns: 400 },
    );
  });

  it('a note only shows rows for the tax groups it credits (review 2, R2-M2)', () => {
    const input = invoice([line(4000, 1503, vat(200_000)), line(1000, 1013, vat(50_000))], {
      taxLevel: 'document',
      rounding: 'down',
    });
    const { source, totals } = sourceOf(input);
    expect(totals.taxes.map((r) => r.amount)).toEqual([1202, 51]);
    const l = ledger(source);
    const notes = [
      l.lines([{ index: 0, quantity: 1000 }]),
      l.lines([{ index: 1, quantity: 1000 }]),
      l.lines([{ index: 0, quantity: 1000 }]),
      l.lines([{ index: 0, quantity: 1000 }]),
      l.lines([{ index: 0, quantity: 1000 }]),
    ];
    for (const [i, n] of notes.entries()) {
      const rates = n.totals.taxes.map((r) => r.ratePpm);
      expect(rates, `note ${i + 1}`).toEqual([i === 1 ? 50_000 : 200_000]);
      expectWellFormed(n.totals);
    }
    expectExact(totals, l.notes);
  });
});

describe('criterion 5: limits', () => {
  const input = invoice([line(1000, 10_000, vat(200_000)), line(2000, 5000, vat(0))]);
  const { source } = sourceOf(input);

  it('refuses more of a line than is left', () => {
    const state = creditState(source, []);
    expect(codeOf(() => planLineCredit(source, state, [{ index: 0, quantity: 50_000 }]))).toBe(
      'credit_exceeds_quantity',
    );
  });

  it('refuses a line from elsewhere, the same line twice and a credit of nothing', () => {
    const state = creditState(source, []);
    expect(codeOf(() => planLineCredit(source, state, [{ index: 5, quantity: 1000 }]))).toBe(
      'credit_line_not_found',
    );
    expect(
      codeOf(() =>
        planLineCredit(source, state, [
          { index: 0, quantity: 500 },
          { index: 0, quantity: 500 },
        ]),
      ),
    ).toBe('credit_line_repeated');
    expect(codeOf(() => planLineCredit(source, state, [{ index: 0, quantity: 0 }]))).toBe('credit_nothing');
  });

  it('refuses an amount above what is left on the invoice, and lines beyond what an amount left in their group', () => {
    const l = ledger(source);
    expect(codeOf(() => l.amount(20_001))).toBe('credit_exceeds_invoice');
    l.amount(10_000);
    // The amount took half of each group's value, so the standard-rated line can no longer be credited in full.
    expect(codeOf(() => l.lines([{ index: 0, quantity: 1000 }]))).toBe('credit_exceeds_group');
    l.lines([{ index: 0, quantity: 500 }]);
  });
});

describe('criterion 6: review 2 worked examples', () => {
  it('R2-H1: a zero-rated line credited first, then the rest as an amount, credits all the VAT', () => {
    const input = invoice([line(1000, 500_000, vat(200_000)), line(1000, 500_000, vat(0))]);
    const { source, totals } = sourceOf(input);
    const l = ledger(source);
    l.lines([{ index: 1, quantity: 1000 }]);
    const rest = l.amount(500_000);
    expect([rest.totals.net, rest.totals.taxTotal, rest.totals.total]).toEqual([500_000, 100_000, 600_000]);
    expectExact(totals, l.notes);
  });

  it('R2-H1, the other order: after the standard-rated line, the zero-rated rest can be credited by amount', () => {
    const input = invoice([line(1000, 500_000, vat(200_000)), line(1000, 500_000, vat(0))]);
    const { source, totals } = sourceOf(input);
    const l = ledger(source);
    l.lines([{ index: 0, quantity: 1000 }]);
    const rest = l.amount(500_000);
    expect(rest.totals.taxTotal).toBe(0);
    expectExact(totals, l.notes);
  });

  it('R2-M1: amount credits in parts add up to the VAT, and the rest can always be credited', () => {
    const input = invoice([line(1000, 10_000, vat(200_000))]);
    const { source, totals } = sourceOf(input);
    for (const part of [837, 838, 1004, 1005]) {
      const l = ledger(source);
      l.amount(part);
      l.amount(part);
      l.amount(10_000 - 2 * part);
      expectExact(totals, l.notes);
    }
  });

  it('R2-M1: ten lines of 53p with VAT per line, credited in full by amount, credit exactly the VAT charged', () => {
    const input = invoice(Array.from({ length: 10 }, () => line(1000, 53, vat(200_000))));
    const { source, totals } = sourceOf(input);
    expect(totals.taxTotal).toBe(110);
    const l = ledger(source);
    l.amount(530);
    expectExact(totals, l.notes);
  });
});

describe('criterion 7: price basis', () => {
  it('an amount credit on an invoice priced excluding tax is priced excluding tax', () => {
    const input = invoice([line(1000, 50_000, vat(200_000)), line(1000, 20_000, vat(0))]);
    const { source } = sourceOf(input);
    const plan = planAmountCredit(source, creditState(source, []), 30_000);
    expect(plan.pricesIncludeTax).toBe(false);
    expect(plan.lines.map((x) => x.unitPrice)).toEqual([21_429, 8571]);
    expect([plan.totals.net, plan.totals.taxTotal, plan.totals.total]).toEqual([30_000, 4286, 34_286]);
  });

  it('an amount credit on an invoice priced including tax is priced including tax', () => {
    const input = invoice([line(1000, 12_000, vat(200_000))], { pricesIncludeTax: true });
    const { source } = sourceOf(input);
    const plan = planAmountCredit(source, creditState(source, []), 6000);
    expect(plan.pricesIncludeTax).toBe(true);
    expect([plan.totals.total, plan.totals.taxTotal, plan.totals.net]).toEqual([6000, 1000, 5000]);
  });

  it('a reverse-charge share is a net amount, its VAT shown and not charged', () => {
    const input = invoice([line(1000, 10_000, reverse)]);
    const { source } = sourceOf(input);
    const plan = planAmountCredit(source, creditState(source, []), 4000);
    expect([plan.totals.total, plan.totals.taxTotal]).toEqual([4000, 0]);
    expect(plan.totals.taxes[0]).toMatchObject({ base: 4000, amount: 800, charged: false });
  });

  it('Ghana: each levy is credited in proportion and exactly at the end', () => {
    const input = invoice([line(1000, 10_000, ghanaCode)], { currency: 'GHS', taxLevel: 'document' });
    const { source, totals } = sourceOf(input);
    const l = ledger(source);
    const half = l.amount(5000);
    expect(half.totals.taxes.map((r) => r.amount)).toEqual([125, 125, 750]);
    l.amount(5000);
    expectExact(totals, l.notes);
  });
});

describe('checking a credit against the invoice', () => {
  const input = invoice([line(1000, 10_000, vat(200_000)), line(1000, 10_000, vat(0))]);
  const { source, totals } = sourceOf(input);

  it('passes a credit within the balance and the tax charged, and refuses one above the balance', () => {
    const credit = planLineCredit(source, creditState(source, []), [{ index: 0, quantity: 1000 }]).totals;
    expect(() => checkCredit({ invoice: totals, balance: totals.total, earlier: [], credit })).not.toThrow();
    expect(codeOf(() => checkCredit({ invoice: totals, balance: 5000, earlier: [], credit }))).toBe(
      'credit_exceeds_balance',
    );
  });

  it('refuses tax the invoice did not charge, and more than was charged once earlier notes are counted', () => {
    const zeroOnly = computeDocument(invoice([line(1000, 10_000, vat(0))]));
    const at20 = computeDocument(invoice([line(1000, 8333, vat(200_000))]));
    expect(
      codeOf(() => checkCredit({ invoice: zeroOnly, balance: zeroOnly.total, earlier: [], credit: at20 })),
    ).toBe('credit_tax_not_on_invoice');
    const half = computeDocument(invoice([line(1000, 6000, vat(200_000))]));
    expect(
      codeOf(() => checkCredit({ invoice: totals, balance: totals.total, earlier: [half], credit: half })),
    ).toBe('credit_exceeds_tax');
  });
});

describe('a fixed discount on a line', () => {
  it('is taken off before tax and shown as one discount row', () => {
    const t = computeDocument(invoice([{ ...line(1000, 10_000, vat(200_000)), discount: 1000 }]));
    expect([t.discountTotal, t.net, t.taxTotal, t.total]).toEqual([1000, 9000, 1800, 10_800]);
    expect(t.discounts).toEqual([{ label: 'Discount', amount: 1000 }]);
  });

  it('cannot be more than the line or below zero', () => {
    expect(codeOf(() => computeDocument(invoice([{ ...line(1000, 100), discount: 101 }])))).toBe(
      'discount_exceeds_line',
    );
    expect(codeOf(() => computeDocument(invoice([{ ...line(1000, 100), discount: -1 }])))).toBe(
      'discount_exceeds_line',
    );
  });
});
