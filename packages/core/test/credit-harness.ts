import { expect } from 'vitest';
import { computeDocument, type DocumentInput, type DocumentTotals, type LineInput } from '../src/totals';
import type { TaxCode } from '../src/tax';
import {
  creditSource,
  creditState,
  planAmountCredit,
  planLineCredit,
  type CreditPlan,
  type CreditSource,
  type CreditTaken,
} from '../src/credits';
import { DomainError } from '../src/errors';
import { presetFor } from '../src/presets';

/** Shared fixtures for the credit ledger tests (docs/specs/credit-notes.md). */

export const vat = (ratePpm: number): TaxCode => ({
  label: `VAT ${ratePpm / 10_000}%`,
  treatment: ratePpm === 0 ? 'zero' : 'standard',
  components: [{ name: 'VAT', ratePpm, compound: false }],
});
export const reverse: TaxCode = {
  label: 'Reverse charge 20%',
  treatment: 'reverse_charge',
  components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
};
export const exempt: TaxCode = { label: 'Exempt', treatment: 'exempt', components: [] };
const ghana = presetFor('GH')!.codes.find((c) => c.key === 'gh_standard')!;
export const ghanaCode: TaxCode = {
  label: ghana.label,
  treatment: ghana.treatment,
  components: ghana.components,
};
/** A levy with VAT charged on the price and the levy together. */
export const compoundCode: TaxCode = {
  label: 'Levy and VAT',
  treatment: 'standard',
  components: [
    { name: 'Levy', ratePpm: 50_000, compound: false },
    { name: 'VAT on levy', ratePpm: 150_000, compound: true },
  ],
};

export const invoice = (lines: LineInput[], extra: Partial<DocumentInput> = {}): DocumentInput => ({
  currency: 'GBP',
  pricesIncludeTax: false,
  taxLevel: 'line',
  rounding: 'half-up',
  lines,
  ...extra,
});
export const line = (quantity: number, unitPrice: number, tax: TaxCode | null = null): LineInput => ({
  quantity,
  unitPrice,
  tax,
});

export function sourceOf(input: DocumentInput): { source: CreditSource; totals: DocumentTotals } {
  const totals = computeDocument(input);
  return { source: creditSource(input, totals), totals };
}

/** Issues credit notes one after another, keeping the ledger as the database would. */
export function ledger(source: CreditSource) {
  const earlier: CreditTaken[] = [];
  const notes: DocumentTotals[] = [];
  const keep = (plan: CreditPlan) => {
    earlier.push(plan.taken);
    notes.push(plan.totals);
    return plan;
  };
  return {
    notes,
    lines: (request: { index: number; quantity: number }[]) =>
      keep(planLineCredit(source, creditState(source, earlier), request)),
    amount: (amount: number) => keep(planAmountCredit(source, creditState(source, earlier), amount)),
    keep,
    state: () => creditState(source, earlier),
    /** Value not yet credited, in the invoice's price basis. */
    valueLeft: () => Object.values(creditState(source, earlier).slots).reduce((a, v) => a + v.left, 0),
    earlier,
  };
}

export function rowSums(notes: DocumentTotals[]) {
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

export function expectExact(totals: DocumentTotals, notes: DocumentTotals[]) {
  const sums = rowSums(notes);
  for (const r of totals.taxes) expect(sums.get(r.key), r.key).toEqual({ base: r.base, amount: r.amount });
  expect([...sums.keys()].every((k) => totals.taxes.some((r) => r.key === k))).toBe(true);
  expect(notes.reduce((a, n) => a + n.total, 0)).toBe(totals.total);
  expect(notes.reduce((a, n) => a + n.taxTotal, 0)).toBe(totals.taxTotal);
}

export function expectWellFormed(note: DocumentTotals) {
  for (const r of note.taxes) {
    expect(r.amount, r.key).toBeGreaterThanOrEqual(0);
    expect(r.base, r.key).toBeGreaterThanOrEqual(0);
  }
  expect(note.lines.reduce((a, l) => a + l.tax, 0)).toBe(note.taxTotal);
  expect(note.total).toBe(note.net + note.taxTotal);
  expect(note.subtotal - note.discountTotal).toBe(note.lines.reduce((a, l) => a + l.amount - l.discount, 0));
}

export function codeOf(fn: () => unknown): string | null {
  try {
    fn();
  } catch (error) {
    return error instanceof DomainError ? error.code : 'not a domain error';
  }
  return null;
}
