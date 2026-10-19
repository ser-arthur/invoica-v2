import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { TaxCode } from '../src/tax';
import { creditState, planBalanceCredit, type CreditPlan, type CreditSource } from '../src/credits';
import {
  compoundCode,
  exempt,
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
 * Tests for the findings of the fourth independent review (docs/reviews/review-4.md) on "everything still owed".
 * A payment removed after a settling note gives the balance back; the rest must still credit exactly.
 */

/** Each base not charged on another tax is the net the note took from its slot (criterion 10). */
function expectBasesAreNets(source: CreditSource, plan: CreditPlan) {
  for (const take of plan.taken.slots) {
    const slot = source.slots.find((s) => s.key === take.slot)!;
    const tax = take.taxes.reduce((a, t) => a + t.amount, 0);
    const net = source.pricesIncludeTax && slot.charged ? take.value - tax : take.value;
    take.taxes.forEach((t, k) => {
      if (!slot.taxes[k]!.component.compound) expect(t.base, `${take.slot} ${k}`).toBe(net);
      expect(t.base, `${take.slot} ${k}`).toBeGreaterThanOrEqual(0);
      expect(t.amount, `${take.slot} ${k}`).toBeGreaterThanOrEqual(0);
    });
  }
}

const ghanaInclusive = { currency: 'GHS', taxLevel: 'document' as const, pricesIncludeTax: true };

describe('R4-M1: one pesewa owed under Ghana’s defaults', () => {
  it('GH₵100.00, GH₵29.99 credited and GH₵70.00 paid: the last pesewa can be credited', () => {
    const { source } = sourceOf(invoice([line(1000, 10_000, ghanaCode)], ghanaInclusive));
    const l = ledger(source);
    l.amount(2999);
    const plan = planBalanceCredit(source, l.state(), 1);
    expect(plan.totals.total).toBe(1);
    expectWellFormed(plan.totals);
    expectBasesAreNets(source, plan);
  });

  it('after any earlier amount, a balance of one to three units always settles', () => {
    const { source } = sourceOf(invoice([line(1000, 10_000, ghanaCode)], ghanaInclusive));
    for (let earlier = 2900; earlier <= 3100; earlier++) {
      const l = ledger(source);
      l.amount(earlier);
      for (const balance of [1, 2, 3]) {
        const plan = planBalanceCredit(source, l.state(), balance);
        expect(plan.totals.total, `${earlier} then ${balance}`).toBe(balance);
        expectWellFormed(plan.totals);
      }
    }
  });
});

describe('R4-L1: a settling note’s bases are its net, and nothing is left short', () => {
  it('the review example: an exempt line, a small standard line and a deposit later returned', () => {
    const input = invoice([line(1000, 100_000, exempt), line(1000, 120, ghanaCode)], ghanaInclusive);
    const { source, totals } = sourceOf(input);
    const l = ledger(source);
    const first = l.keep(planBalanceCredit(source, l.state(), totals.total - 500));
    expectBasesAreNets(source, first);
    const second = l.keep(planBalanceCredit(source, l.state(), 500));
    expect(second.totals.total).toBe(500);
    expectBasesAreNets(source, second);
    expectExact(totals, l.notes);
  });
});

describe('R4-L2: tax lowered on a slot’s last unit is credited once the payment is removed', () => {
  it('the review example: £0.64 paid, the rest credited, the payment removed', () => {
    const input = invoice([
      line(5000, 598, vat(50_000)),
      line(3000, 34_008, vat(200_000)),
      line(4000, 100, vat(50_000)),
      line(3000, 4164, vat(0)),
    ]);
    const { source, totals } = sourceOf(input);
    expect(totals.total).toBe(138_481);
    const l = ledger(source);
    l.keep(planBalanceCredit(source, l.state(), totals.total - 64));
    const rest = l.keep(planBalanceCredit(source, l.state(), 64));
    expect(rest.totals.total).toBe(64);
    expectExact(totals, l.notes);
  });
});

describe('everything still owed, then the payment removed', () => {
  const codeArb = fc.constantFrom<TaxCode | null>(
    null,
    vat(200_000),
    vat(50_000),
    vat(0),
    reverse,
    exempt,
    ghanaCode,
    compoundCode,
  );
  const lineArb = fc.record({
    quantity: fc.integer({ min: 1, max: 5 }).map((n) => n * 1000),
    unitPrice: fc.oneof(fc.integer({ min: 1, max: 200 }), fc.integer({ min: 100, max: 50_000 })),
    tax: codeArb,
  });

  it('credits exactly the balance each time, with bases equal to nets, and ends with every row exact', () => {
    fc.assert(
      fc.property(
        fc.array(lineArb, { minLength: 1, maxLength: 5 }),
        fc.constantFrom('line' as const, 'document' as const),
        fc.constantFrom('half-up' as const, 'down' as const, 'half-even' as const),
        fc.boolean(),
        fc.integer({ min: 0, max: 999 }),
        fc.oneof(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 100_000 })),
        (lines, taxLevel, rounding, pricesIncludeTax, earlierShare, paid) => {
          const input = invoice(lines, { taxLevel, rounding, pricesIncludeTax });
          const { source, totals } = sourceOf(input);
          const l = ledger(source);
          const amount = Math.floor((l.valueLeft() * earlierShare) / 1000);
          if (amount > 0) {
            try {
              l.amount(amount);
            } catch {
              // A refused earlier credit leaves the ledger as it was.
            }
          }
          const remaining = totals.total - l.notes.reduce((a, n) => a + n.total, 0);
          fc.pre(paid < remaining);
          const first = l.keep(planBalanceCredit(source, l.state(), remaining - paid));
          expect(first.totals.total).toBe(remaining - paid);
          expectWellFormed(first.totals);
          expectBasesAreNets(source, first);
          const second = l.keep(planBalanceCredit(source, creditState(source, l.earlier), paid));
          expect(second.totals.total).toBe(paid);
          expectWellFormed(second.totals);
          expectBasesAreNets(source, second);
          expectExact(totals, l.notes);
        },
      ),
      { numRuns: 600 },
    );
  });
});
