import { describe, expect, it } from 'vitest';
import { computeDocument } from '../src/totals';
import type { TaxCode } from '../src/tax';
import { amountLimit, planAmountCredit } from '../src/credits';
import { codeOf, ghanaCode, invoice, ledger, line, sourceOf, vat } from './credit-harness';

/** Tests for the findings of the seventh independent review (docs/reviews/review-7.md). */

describe('R7-L4: taxes that come to more than a price including them', () => {
  it('are refused when the invoice is worked out, so no invoice is issued with a net below zero', () => {
    const five: TaxCode = {
      label: 'Five taxes',
      treatment: 'standard',
      components: Array.from({ length: 5 }, (_, i) => ({
        name: `Tax ${i + 1}`,
        ratePpm: 400_000,
        compound: false,
      })),
    };
    const input = invoice([line(4000, 1, five), line(1000, 100, null)], { pricesIncludeTax: true });
    expect(codeOf(() => computeDocument(input))).toBe('tax_exceeds_price');
    // An ordinary price at the same code is fine.
    expect(
      computeDocument(invoice([line(1000, 10_000, five)], { pricesIncludeTax: true })).net,
    ).toBeGreaterThan(0);
  });
});

describe('R7-L2: the amount hint with prices including tax', () => {
  it('the review example: GH₵0.24 standard-rated beside GH₵20.00 zero-rated finds an amount that can be credited', () => {
    const zero: TaxCode = {
      label: 'Zero-rated',
      treatment: 'zero',
      components: [{ name: 'VAT', ratePpm: 0, compound: false }],
    };
    const { source } = sourceOf(
      invoice([line(1000, 24, ghanaCode), line(1000, 2000, zero)], {
        currency: 'GHS',
        taxLevel: 'document',
        pricesIncludeTax: true,
      }),
    );
    const l = ledger(source);
    l.amount(1);
    const limit = amountLimit(source, l.state(), 1973);
    expect(limit).toBeGreaterThan(0);
    expect(planAmountCredit(source, l.state(), limit).totals.total).toBeLessThanOrEqual(1973);
  });

  it('stays the balance when the balance itself can be credited', () => {
    const { source } = sourceOf(invoice([line(1000, 12_000, vat(200_000))], { pricesIncludeTax: true }));
    expect(amountLimit(source, ledger(source).state(), 5997)).toBe(5997);
  });
});
