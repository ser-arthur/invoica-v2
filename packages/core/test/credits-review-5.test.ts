import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeDocument } from '../src/totals';
import type { TaxCode } from '../src/tax';
import { amountLimit, planAmountCredit, planBalanceCredit } from '../src/credits';
import {
  codeOf,
  compoundCode,
  expectExact,
  expectWellFormed,
  ghanaCode,
  invoice,
  ledger,
  line,
  sourceOf,
  vat,
} from './credit-harness';

/** Tests for the findings of the fifth independent review (docs/reviews/review-5.md). */

const ghanaExcluding = { currency: 'GHS', taxLevel: 'document' as const, pricesIncludeTax: false };
const remainingOf = (total: number, l: ReturnType<typeof ledger>) =>
  total - l.notes.reduce((a, n) => a + n.total, 0);

describe('R5-L1: tax left on an emptied slot when less than it is owed', () => {
  it('the review example: GH₵1.00, GH₵0.99 credited, two pesewas paid and settled, the payment reversed, one paid again', () => {
    const { source, totals } = sourceOf(invoice([line(1000, 100, ghanaCode)], ghanaExcluding));
    const l = ledger(source);
    l.amount(99);
    l.keep(planBalanceCredit(source, l.state(), remainingOf(totals.total, l) - 2));
    // The two pesewas are reversed, then one is paid again: one is owed.
    const last = l.keep(planBalanceCredit(source, l.state(), 1));
    expect(last.totals.total).toBe(1);
    expectWellFormed(last.totals);
    // Reversed again, the last pesewa still credits exactly.
    l.keep(planBalanceCredit(source, l.state(), 1));
    expectExact(totals, l.notes);
  });

  const codeArb = fc.constantFrom<TaxCode>(
    ghanaCode,
    compoundCode,
    vat(200_000),
    {
      label: 'Half',
      treatment: 'standard',
      components: [{ name: 'Duty', ratePpm: 500_000, compound: false }],
    },
    {
      label: 'Whole',
      treatment: 'standard',
      components: [{ name: 'Duty', ratePpm: 1_000_000, compound: false }],
    },
    {
      label: 'Four taxes',
      treatment: 'standard',
      components: [
        { name: 'A', ratePpm: 150_000, compound: false },
        { name: 'B', ratePpm: 200_000, compound: true },
        { name: 'C', ratePpm: 50_000, compound: false },
        { name: 'D', ratePpm: 500_000, compound: true },
      ],
    },
  );

  it('settling, reversing and paying again in any amounts always credits exactly what is owed', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            quantity: fc.integer({ min: 1, max: 4 }).map((n) => n * 1000),
            unitPrice: fc.integer({ min: 1, max: 40_000 }),
            tax: codeArb,
          }),
          {
            minLength: 1,
            maxLength: 3,
          },
        ),
        fc.constantFrom('line' as const, 'document' as const),
        fc.constantFrom('half-up' as const, 'down' as const, 'half-even' as const),
        fc.boolean(),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 0, max: 5 }),
        (lines, taxLevel, rounding, pricesIncludeTax, earlierShare, paid, short) => {
          const { source, totals } = sourceOf(invoice(lines, { taxLevel, rounding, pricesIncludeTax }));
          const l = ledger(source);
          const amount = Math.floor((l.valueLeft() * earlierShare) / 1000);
          if (amount > 0) {
            try {
              l.amount(amount);
            } catch {
              // A refused earlier credit leaves the ledger as it was.
            }
          }
          fc.pre(paid < remainingOf(totals.total, l));
          const settle = (balance: number) => {
            const plan = l.keep(planBalanceCredit(source, l.state(), balance));
            expect(plan.totals.total).toBe(balance);
            expectWellFormed(plan.totals);
          };
          settle(remainingOf(totals.total, l) - paid);
          // The payment is reversed, then all but `short` paid again.
          const again = paid - Math.min(short, paid - 1);
          if (paid - again > 0) settle(paid - again);
          settle(remainingOf(totals.total, l));
          expectExact(totals, l.notes);
        },
      ),
      { numRuns: 800 },
    );
  });
});

describe('R5-L5: totals beyond the safe range are refused', () => {
  it('the review example is refused as too large, never stored a penny out', () => {
    const input = invoice(
      [
        line(7_089_749, 29_728_567_573, { label: 'No VAT', treatment: 'outside_scope', components: [] }),
        line(7_500_000, 1_000_000_000_000, vat(200_000)),
      ],
      { taxLevel: 'document', rounding: 'half-even' },
    );
    expect(codeOf(() => computeDocument(input))).toBe('amount_too_large');
  });
});

describe('R5-L6: Ghana settles under either price basis, and the amount hint always plans', () => {
  it('a balance of one to three pesewas settles after any earlier amount, prices including or excluding tax', () => {
    for (const pricesIncludeTax of [true, false]) {
      const { source } = sourceOf(
        invoice([line(1000, 10_000, ghanaCode)], { ...ghanaExcluding, pricesIncludeTax }),
      );
      for (let earlier = 2950; earlier <= 3050; earlier++) {
        const l = ledger(source);
        l.amount(earlier);
        for (const balance of [1, 2, 3])
          expect(planBalanceCredit(source, l.state(), balance).totals.total).toBe(balance);
      }
    }
  });

  it('the hint’s amount can always be credited when prices include tax', () => {
    const { source } = sourceOf(
      invoice([line(1000, 1007, ghanaCode)], { ...ghanaExcluding, pricesIncludeTax: true }),
    );
    for (let earlier = 1; earlier < 1000; earlier += 7) {
      const l = ledger(source);
      l.amount(earlier);
      for (let balance = 1; balance <= 12; balance++) {
        const limit = amountLimit(source, l.state(), balance);
        if (limit > 0)
          expect(planAmountCredit(source, l.state(), limit).totals.total).toBeLessThanOrEqual(balance);
      }
    }
  });
});
