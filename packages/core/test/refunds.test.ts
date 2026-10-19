import { describe, expect, it } from 'vitest';
import { checkCredit, creditState, planLineCredit, refundFor } from '../src/credits';
import { codeOf, invoice, line, sourceOf, vat } from './credit-harness';

/** docs/specs/refunds.md: the part of a credit note above the balance owed is refunded, exactly. */

describe('the refund a credit note needs', () => {
  it('is the part of the credit above the balance owed, and nothing within it', () => {
    expect(refundFor(12_000, 0)).toBe(12_000);
    expect(refundFor(12_000, 2_000)).toBe(10_000);
    expect(refundFor(5_000, 12_000)).toBe(0);
    expect(refundFor(12_000, 12_000)).toBe(0);
  });
});

describe('checking a credit with a refund', () => {
  // £100.00 plus VAT: a total of £120.00.
  const { source, totals } = sourceOf(invoice([line(1000, 10_000, vat(200_000))]));
  const whole = planLineCredit(source, creditState(source, []), [{ index: 0, quantity: 1000 }]).totals;
  const check = (balance: number, received: number, refund: number) =>
    codeOf(() => checkCredit({ invoice: totals, balance, received, earlier: [], credit: whole, refund }));

  it('paid in full: the whole invoice is credited with a refund of everything paid', () => {
    expect(whole.total).toBe(12_000);
    expect(check(0, 12_000, 12_000)).toBeNull();
  });

  it('above the balance with no refund is refused as before', () => {
    expect(check(0, 12_000, 0)).toBe('credit_exceeds_balance');
  });

  it('part paid: the refund is exactly the part above the balance', () => {
    expect(check(2_000, 10_000, 10_000)).toBeNull();
    expect(check(2_000, 10_000, 9_999)).toBe('refund_wrong_amount');
    expect(check(2_000, 10_000, 10_001)).toBe('refund_wrong_amount');
  });

  it('within the balance, a refund is refused', () => {
    expect(check(12_000, 0, 1)).toBe('refund_not_needed');
  });

  it('never refunds more than was received', () => {
    expect(check(0, 6_000, 12_000)).toBe('credit_exceeds_received');
  });
});
