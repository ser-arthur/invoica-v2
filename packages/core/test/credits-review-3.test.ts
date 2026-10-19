import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeDocument, type DocumentTotals, type LineInput, type TaxSummaryRow } from '../src/totals';
import type { TaxCode } from '../src/tax';
import { amountLimit, checkCredit, creditState, planBalanceCredit, planLineCredit } from '../src/credits';
import { DomainError } from '../src/errors';
import {
  codeOf,
  compoundCode,
  expectExact,
  expectWellFormed,
  ghanaCode,
  invoice,
  ledger,
  line,
  reverse,
  sourceOf,
  vat,
} from './credit-harness';

/**
 * Tests for the findings of the third independent review (docs/reviews/review-3.md), as acceptance criteria 9 to 11
 * of docs/specs/credit-notes.md. Criterion 12 is a database test (packages/db/test/review-3.test.ts).
 */

const RATE = 1_000_000;

/** How far a row's tax is from its rate times its base, in millionths of a minor unit. */
const distance = (r: TaxSummaryRow) => Math.abs(r.amount * RATE - r.ratePpm * r.base);

const codeArb = fc.constantFrom<TaxCode | null>(
  null,
  vat(200_000),
  vat(50_000),
  vat(0),
  reverse,
  ghanaCode,
  compoundCode,
);
const lineArb = fc.record({
  quantity: fc.integer({ min: 1, max: 5 }).map((n) => n * 1000),
  // Prices of a few pence, where each line's rounding is large beside its tax, as well as ordinary ones.
  unitPrice: fc.oneof(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 100, max: 50_000 })),
  tax: codeArb,
});

describe('criterion 9 (R3-L1): a whole line under VAT per line credits the VAT it was charged', () => {
  it('the review example: £1,000.00 beside ten lines of 3p credits £200.00 of VAT', () => {
    const input = invoice([
      ...Array.from({ length: 10 }, () => line(1000, 3, vat(200_000))),
      line(1000, 100_000, vat(200_000)),
    ]);
    const { source, totals } = sourceOf(input);
    expect(totals.taxTotal).toBe(20_010);
    const plan = planLineCredit(source, creditState(source, []), [{ index: 10, quantity: 1000 }]);
    expect(plan.totals.taxTotal).toBe(20_000);
    expect(plan.totals.taxes).toMatchObject([{ base: 100_000, amount: 20_000 }]);
  });

  it('every line credited whole, in any order, credits exactly the tax rows that line was charged', () => {
    fc.assert(
      fc.property(
        fc.array(lineArb, { minLength: 2, maxLength: 8 }),
        fc.constantFrom('half-up' as const, 'down' as const, 'half-even' as const),
        fc.boolean(),
        fc.option(fc.integer({ min: 0, max: 300_000 }), { nil: undefined }),
        fc.integer({ min: 0, max: 10_000 }),
        (lines, rounding, pricesIncludeTax, discountPpm, seed) => {
          const input = invoice(lines, {
            rounding,
            pricesIncludeTax,
            discounts:
              discountPpm === undefined ? [] : [{ label: 'Discount', kind: 'percent', ratePpm: discountPpm }],
          });
          const { source, totals } = sourceOf(input);
          const l = ledger(source);
          const order = lines
            .map((_, i) => i)
            .sort((a, b) => ((a * 7919 + seed) % 97) - ((b * 7919 + seed) % 97));
          for (const i of order) {
            // A line discounted to nothing has nothing to credit.
            if (totals.lines[i]!.amount === totals.lines[i]!.discount) continue;
            const own = computeDocument(
              invoice([{ ...lines[i]!, discount: totals.lines[i]!.discount } as LineInput], {
                rounding,
                pricesIncludeTax,
              }),
            );
            const plan = l.lines([{ index: i, quantity: lines[i]!.quantity }]);
            expect(plan.totals.taxTotal, `line ${i}`).toBe(totals.lines[i]!.tax);
            expect(
              plan.totals.taxes.map((r) => [r.key, r.base, r.amount]),
              `line ${i}`,
            ).toEqual(
              own.taxes.filter((r) => r.base !== 0 || r.amount !== 0).map((r) => [r.key, r.base, r.amount]),
            );
          }
          expectExact(totals, l.notes);
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe('criterion 10 (R3-L1): a note’s tax is the tax on what it credits', () => {
  it('the review’s Ghana example: each tax’s base is the note’s net, and each levy is within a unit of its rate', () => {
    const input = invoice([line(3000, 12_000, ghanaCode), line(1000, 9999, ghanaCode)], {
      currency: 'GHS',
      taxLevel: 'document',
      pricesIncludeTax: true,
    });
    const { source, totals } = sourceOf(input);
    const l = ledger(source);
    l.amount(10_001);
    const second = l.lines([{ index: 1, quantity: 1000 }]);
    for (const r of second.totals.taxes) {
      expect(r.base, r.name).toBe(second.totals.net);
      expect(distance(r), r.name).toBeLessThanOrEqual(RATE);
    }
    l.amount(l.valueLeft());
    expectExact(totals, l.notes);
  });

  it('on any note that credits one place the tax was worked out, each row is within two units of rate times base', () => {
    const stepArb = fc.record({
      kind: fc.constantFrom('lines' as const, 'amount' as const),
      share: fc.integer({ min: 1, max: 999 }),
      index: fc.integer({ min: 0, max: 7 }),
    });
    fc.assert(
      fc.property(
        fc.array(lineArb, { minLength: 1, maxLength: 8 }),
        fc.constantFrom('line' as const, 'document' as const),
        fc.constantFrom('half-up' as const, 'down' as const, 'half-even' as const),
        fc.boolean(),
        fc.array(stepArb, { minLength: 1, maxLength: 4 }),
        (lines, taxLevel, rounding, pricesIncludeTax, steps) => {
          const input = invoice(lines, { taxLevel, rounding, pricesIncludeTax });
          const { source, totals } = sourceOf(input);
          fc.pre(totals.total > 0);
          const l = ledger(source);
          for (const step of steps) {
            const state = l.state();
            const index = step.index % lines.length;
            let note: DocumentTotals;
            try {
              if (step.kind === 'lines') {
                const quantity = Math.floor(
                  ((lines[index]!.quantity - state.quantities[index]!) * step.share) / 1000,
                );
                if (quantity <= 0) continue;
                note = l.lines([{ index, quantity }]).totals;
              } else {
                // One place only: at document level a single tax code, at line level a single line.
                const codes = new Set(lines.map((x) => JSON.stringify(x.tax)));
                if (taxLevel === 'line' ? lines.length > 1 : codes.size > 1) continue;
                const amount = Math.floor((l.valueLeft() * step.share) / 1000);
                if (amount <= 0) continue;
                note = l.amount(amount).totals;
              }
            } catch (error) {
              expect(error).toBeInstanceOf(DomainError);
              continue;
            }
            for (const r of note.taxes)
              expect(distance(r), `${r.name} on ${r.base}`).toBeLessThanOrEqual(2 * RATE);
          }
        },
      ),
      { numRuns: 400 },
    );
  });
});

describe('criterion 10, slot by slot', () => {
  it('on every note, each slot’s tax for each component is within two units of rate times its base, and each base without compounding is the net taken', () => {
    const stepArb = fc.record({
      kind: fc.constantFrom('lines' as const, 'amount' as const),
      share: fc.integer({ min: 1, max: 999 }),
      index: fc.integer({ min: 0, max: 7 }),
    });
    fc.assert(
      fc.property(
        fc.array(lineArb, { minLength: 1, maxLength: 6 }),
        fc.constantFrom('line' as const, 'document' as const),
        fc.constantFrom('half-up' as const, 'down' as const, 'half-even' as const),
        fc.boolean(),
        fc.array(stepArb, { minLength: 1, maxLength: 5 }),
        (lines, taxLevel, rounding, pricesIncludeTax, steps) => {
          const input = invoice(lines, { taxLevel, rounding, pricesIncludeTax });
          const { source, totals } = sourceOf(input);
          fc.pre(totals.total > 0);
          const l = ledger(source);
          for (const step of steps) {
            const state = l.state();
            const index = step.index % lines.length;
            try {
              if (step.kind === 'lines') {
                const quantity = Math.floor(
                  ((lines[index]!.quantity - state.quantities[index]!) * step.share) / 1000,
                );
                if (quantity > 0) l.lines([{ index, quantity }]);
              } else {
                const amount = Math.floor((l.valueLeft() * step.share) / 1000);
                if (amount > 0) l.amount(amount);
              }
            } catch (error) {
              expect(error).toBeInstanceOf(DomainError);
            }
          }
          for (const note of l.earlier) {
            for (const take of note.slots) {
              const slot = source.slots.find((x) => x.key === take.slot)!;
              const tax = take.taxes.reduce((a, t) => a + t.amount, 0);
              const net = pricesIncludeTax && slot.charged ? take.value - tax : take.value;
              take.taxes.forEach((t, k) => {
                const c = slot.taxes[k]!.component;
                expect(Math.abs(t.amount * RATE - c.ratePpm * t.base), c.name).toBeLessThanOrEqual(2 * RATE);
                if (!c.compound) expect(t.base, c.name).toBe(net);
              });
            }
          }
        },
      ),
      { numRuns: 400 },
    );
  });
});

describe('criterion 11 (R3-M1): everything still owed', () => {
  it('the review example: £100.00 plus VAT, £60.03 paid, credits £59.97 exactly', () => {
    const { source, totals } = sourceOf(invoice([line(1000, 10_000, vat(200_000))]));
    const state = creditState(source, []);
    const plan = planBalanceCredit(source, state, 5997);
    expect([plan.totals.net, plan.totals.taxTotal, plan.totals.total]).toEqual([4998, 999, 5997]);
    expectWellFormed(plan.totals);
    expect(() =>
      checkCredit({ invoice: totals, balance: 5997, earlier: [], credit: plan.totals }),
    ).not.toThrow();
  });

  it('the review’s deposit example: £1,000.00 plus VAT less a deposit of £333.33', () => {
    const { source } = sourceOf(invoice([line(1000, 100_000, vat(200_000))]));
    const plan = planBalanceCredit(source, creditState(source, []), 86_667);
    expect(plan.totals.total).toBe(86_667);
  });

  it('with prices including tax, it is the balance as an amount', () => {
    const { source } = sourceOf(invoice([line(1000, 12_000, vat(200_000))], { pricesIncludeTax: true }));
    const plan = planBalanceCredit(source, creditState(source, []), 5997);
    expect([plan.totals.total, plan.totals.taxTotal]).toEqual([5997, 1000]);
  });

  it('refuses nothing, and more than is left on the invoice', () => {
    const { source } = sourceOf(invoice([line(1000, 10_000, vat(200_000))]));
    const state = creditState(source, []);
    expect(codeOf(() => planBalanceCredit(source, state, 0))).toBe('credit_not_positive');
    expect(codeOf(() => planBalanceCredit(source, state, 12_001))).toBe('credit_exceeds_invoice');
  });

  it('after any credits and any part payment, credits exactly the balance in one note', () => {
    const stepArb = fc.record({
      kind: fc.constantFrom('lines' as const, 'amount' as const),
      share: fc.integer({ min: 1, max: 900 }),
      index: fc.integer({ min: 0, max: 3 }),
    });
    fc.assert(
      fc.property(
        fc.array(lineArb, { minLength: 1, maxLength: 4 }),
        fc.constantFrom('line' as const, 'document' as const),
        fc.constantFrom('half-up' as const, 'down' as const, 'half-even' as const),
        fc.boolean(),
        fc.array(stepArb, { maxLength: 3 }),
        fc.integer({ min: 0, max: 999 }),
        (lines, taxLevel, rounding, pricesIncludeTax, steps, paidShare) => {
          const input = invoice(lines, { taxLevel, rounding, pricesIncludeTax });
          const { source, totals } = sourceOf(input);
          fc.pre(totals.total > 0);
          const l = ledger(source);
          for (const step of steps) {
            const state = l.state();
            const index = step.index % lines.length;
            try {
              if (step.kind === 'lines') {
                const quantity = Math.floor(
                  ((lines[index]!.quantity - state.quantities[index]!) * step.share) / 1000,
                );
                if (quantity > 0) l.lines([{ index, quantity }]);
              } else {
                const amount = Math.floor((l.valueLeft() * step.share) / 1000);
                if (amount > 0) l.amount(amount);
              }
            } catch {
              // A refused step leaves the ledger as it was.
            }
          }
          const remaining = totals.total - l.notes.reduce((a, n) => a + n.total, 0);
          const paid = Math.floor((remaining * paidShare) / 1000);
          const balance = remaining - paid;
          fc.pre(balance > 0);
          const plan = planBalanceCredit(source, l.state(), balance);
          expect(plan.totals.total).toBe(balance);
          expectWellFormed(plan.totals);
          expect(() =>
            checkCredit({ invoice: totals, balance, earlier: [...l.notes], credit: plan.totals }),
          ).not.toThrow();
          l.keep(plan);
          if (paid === 0) expectExact(totals, l.notes);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('the limit an amount credit has once part is paid (R3-M1)', () => {
  it('is the largest amount whose credit note stays within the balance', () => {
    const { source } = sourceOf(invoice([line(1000, 10_000, vat(200_000))]));
    expect(amountLimit(source, creditState(source, []), 5997)).toBe(4997);
    expect(amountLimit(source, creditState(source, []), 12_000)).toBe(10_000);
  });

  it('is the balance itself when prices include tax', () => {
    const { source } = sourceOf(invoice([line(1000, 12_000, vat(200_000))], { pricesIncludeTax: true }));
    expect(amountLimit(source, creditState(source, []), 5997)).toBe(5997);
  });
});
