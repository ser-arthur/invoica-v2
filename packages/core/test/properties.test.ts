import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { checkCredit, refundFor } from '../src/credits';
import { addDays } from '../src/dates';
import { DomainError } from '../src/errors';
import { dueReminder, nextReminder } from '../src/reminders';
import { formatExchangeRate, parseExchangeRate, toPence } from '../src/sterling';
import type { DocumentTotals, TaxSummaryRow } from '../src/totals';

/** Properties of the rules added on 19 October 2026, each against a version written here on its own. */

const totals = (total: number): DocumentTotals =>
  ({
    lines: [],
    subtotal: total,
    discounts: [],
    discountTotal: 0,
    net: total,
    taxes: [],
    taxTotal: 0,
    total,
    paid: 0,
    balance: total,
  }) as unknown as DocumentTotals;

const code = (fn: () => void) => {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof DomainError ? error.code : 'other';
  }
};

describe('refunds', () => {
  it('a credit is accepted exactly when its refund is the part above the balance and within what was received', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 0, max: 10_000_000 }),
        (credit, balance, received, refund) => {
          const accepted =
            code(() =>
              checkCredit({
                invoice: totals(credit),
                balance,
                earlier: [],
                credit: totals(credit),
                received,
                refund,
              }),
            ) === null;
          const above = Math.max(0, credit - balance);
          expect(accepted).toBe(refund === above && above <= received);
          expect(refundFor(credit, balance)).toBe(above);
        },
      ),
      { numRuns: 3000 },
    );
  });
});

describe('refunds and the tax already credited', () => {
  const vat = (amount: number, base: number): TaxSummaryRow => ({
    key: 'VAT 200000',
    name: 'VAT',
    ratePpm: 200_000,
    compound: false,
    treatment: 'standard',
    base,
    amount,
    charged: true,
  });
  const withTax = (total: number, amount: number, base: number): DocumentTotals =>
    ({ ...totals(total), taxes: [vat(amount, base)], taxTotal: amount }) as DocumentTotals;

  it('on an invoice with earlier notes, a credit is accepted exactly when its refund fits and its tax is left', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.array(fc.integer({ min: 1, max: 400_000 }), { maxLength: 4 }),
        fc.integer({ min: 1, max: 600_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.boolean(),
        (invoiceTax, earlierTax, creditTax, balance, received, refundAsked) => {
          // Each document's VAT is a fifth of its base, and its total the base plus the VAT.
          const doc = (tax: number) => withTax(tax * 6, tax, tax * 5);
          const credit = doc(creditTax);
          const above = Math.max(0, credit.total - balance);
          const refund = refundAsked ? above : 0;
          const accepted =
            code(() =>
              checkCredit({
                invoice: doc(invoiceTax),
                balance,
                earlier: earlierTax.map(doc),
                credit,
                received,
                refund,
              }),
            ) === null;
          const taxLeft = earlierTax.reduce((a, b) => a + b, 0) + creditTax <= invoiceTax;
          expect(accepted).toBe(refund === above && above <= received && taxLeft);
        },
      ),
      { numRuns: 3000 },
    );
  });
});

describe('VAT in sterling', () => {
  const exact = (amount: number, exponent: number, rate: number) => {
    // pence = amount / 10^exponent * 100 / (rate / 10^6), half up, worked out with whole numbers.
    const n = BigInt(amount) * 100n * 1_000_000n;
    const d = BigInt(rate) * 10n ** BigInt(exponent);
    const q = n / d;
    return Number((n % d) * 2n >= d ? q + 1n : q);
  };

  it('converts any amount at any rate exactly as whole-number arithmetic does, or refuses a figure too large to hold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000_000 }),
        fc.constantFrom(['JPY', 0], ['EUR', 2], ['KWD', 3]) as fc.Arbitrary<[string, number]>,
        fc.integer({ min: 1, max: 999_999_999_999 }),
        (amount, [currency, exponent], rate) => {
          const expected = exact(amount, exponent, rate);
          if (Number.isSafeInteger(expected)) expect(toPence(amount, currency, rate)).toBe(expected);
          else expect(code(() => toPence(amount, currency, rate))).toBe('amount_too_large');
        },
      ),
      { numRuns: 5000 },
    );
  });

  it('more VAT never converts to fewer pounds, and a higher rate never to more', () => {
    fc.assert(
      fc.property(
        fc.nat(10_000_000),
        fc.nat(10_000_000),
        fc.integer({ min: 1, max: 10_000_000_000 }),
        (a, b, rate) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          expect(toPence(lo, 'EUR', rate)).toBeLessThanOrEqual(toPence(hi, 'EUR', rate));
          expect(toPence(hi, 'EUR', rate + 1)).toBeLessThanOrEqual(toPence(hi, 'EUR', rate));
        },
      ),
      { numRuns: 3000 },
    );
  });

  it('a rate printed and read again is the same rate', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999_999_999_999_999 }), (rate) => {
        expect(parseExchangeRate(formatExchangeRate(rate))).toBe(rate);
      }),
      { numRuns: 5000 },
    );
  });

  it('reading anything typed never throws, and gives a positive rate or nothing', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (text) => {
        const rate = parseExchangeRate(text);
        expect(rate === null || (Number.isSafeInteger(rate) && rate > 0)).toBe(true);
      }),
      { numRuns: 5000 },
    );
  });
});

describe('reminders', () => {
  const day = fc.integer({ min: 0, max: 3000 }).map((n) => addDays('2026-01-01', n));
  const offsets = fc.subarray([-3, 0, 7, 14, 30]);

  it('the reminder due today is the latest offset within the week up to today, counted day by day', () => {
    fc.assert(
      fc.property(day, offsets, fc.integer({ min: -10, max: 60 }), (due, chosen, after) => {
        const today = addDays(due, after);
        // Walk back up to six days from today and take the latest offset whose date is one of them.
        let expected: number | null = null;
        for (let back = 0; back < 7 && expected === null; back++) {
          const date = addDays(today, -back);
          const hits = chosen.filter((o) => addDays(due, o) === date);
          if (hits.length) expected = Math.max(...hits);
        }
        // An older offset that is still within the week can be due when a later one is not yet.
        const inWeek = chosen.filter((o) => {
          const date = addDays(due, o);
          return date <= today && date > addDays(today, -7);
        });
        expect(dueReminder(due, chosen, today)).toBe(inWeek.length ? Math.max(...inWeek) : null);
        if (expected !== null) expect(inWeek).toContain(expected);
      }),
      { numRuns: 5000 },
    );
  });

  it('a reminder is never due for a day before the invoice was issued, and otherwise as without the issue date', () => {
    fc.assert(
      fc.property(
        day,
        offsets,
        fc.integer({ min: -10, max: 60 }),
        fc.integer({ min: -40, max: 10 }),
        (due, chosen, after, issuedBefore) => {
          const today = addDays(due, after);
          const issuedOn = addDays(due, issuedBefore);
          const inWeek = chosen.filter((o) => {
            const date = addDays(due, o);
            return date <= today && date > addDays(today, -7) && date >= issuedOn;
          });
          const got = dueReminder(due, chosen, today, issuedOn);
          expect(got).toBe(inWeek.length ? Math.max(...inWeek) : null);
          if (got !== null) expect(addDays(due, got) >= issuedOn).toBe(true);
        },
      ),
      { numRuns: 5000 },
    );
  });

  it('the next reminder is never in the past and never one already sent', () => {
    fc.assert(
      fc.property(day, offsets, fc.integer({ min: -10, max: 60 }), offsets, (due, chosen, after, sent) => {
        const today = addDays(due, after);
        const next = nextReminder(due, chosen, today, sent);
        if (next) {
          expect(next.date >= today).toBe(true);
          expect(sent).not.toContain(next.offset);
          expect(chosen).toContain(next.offset);
        } else {
          for (const o of chosen) expect(addDays(due, o) < today || sent.includes(o)).toBe(true);
        }
      }),
      { numRuns: 3000 },
    );
  });
});
