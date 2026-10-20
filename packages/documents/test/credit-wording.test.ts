import { describe, expect, it } from 'vitest';
import type { DocumentSnapshot, TaxCode } from '@invoica/core';
import { buildView } from '../src/index';
import { FIXTURES, snapshot } from './fixtures';

/**
 * The credit note wording in docs/specs/credit-notes.md: every credit note from a VAT-registered seller prints
 * the decrease before VAT; a UK reverse-charge credit note asks the customer to account for the output tax
 * adjustment; in Ghana the figure is "Total before taxes"; zero-rated amounts on a credit note are a reduction.
 */

const asCredit = (s: DocumentSnapshot): DocumentSnapshot => ({
  ...s,
  kind: 'credit_note',
  number: 'CN-0007',
  dueDate: null,
  paymentsShown: [],
  balanceDue: 0,
});

const labels = (s: DocumentSnapshot) => buildView(s).totals.map((t) => t.label);
const row = (s: DocumentSnapshot, label: string) => buildView(s).totals.find((t) => t.label === label);

const ZERO: TaxCode = {
  label: 'Zero-rated',
  treatment: 'zero',
  components: [{ name: 'VAT', ratePpm: 0, compound: false }],
};
const REVERSE: TaxCode = {
  label: 'Reverse charge: VAT 20%',
  treatment: 'reverse_charge',
  components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
};

const ukSeller = FIXTURES.ukVat!.seller;

describe('Total before VAT on every credit note', () => {
  it('prices excluding VAT and no discount: the decrease before VAT is labelled as such', () => {
    const note = asCredit(FIXTURES.ukVat!);
    expect(labels(note)).toEqual(['Total before VAT', 'VAT 20%', 'Total credited']);
    expect(row(note, 'Total before VAT')!.value).toBe('£5,600.00');
  });

  it('with a discount: subtotal, discount, then the total before VAT', () => {
    const note = asCredit({
      ...FIXTURES.ukVat!,
      ...snapshot({
        number: 'CN-0008',
        currency: 'GBP',
        lineStyle: 'quantity',
        template: 'signature',
        seller: ukSeller,
        buyer: { name: 'Northlane Logistics Ltd' },
        lines: [
          { title: 'Site visits', quantity: 1000, unitPrice: 100_000, tax: FIXTURES.ukVat!.lines[0]!.tax },
        ],
        discounts: [{ label: 'Loyalty', kind: 'percent', ratePpm: 100_000 }],
      }),
    });
    expect(labels(note)).toEqual(['Subtotal', 'Loyalty', 'Total before VAT', 'VAT 20%', 'Total credited']);
  });

  it('prices including VAT: the total before VAT is still printed', () => {
    expect(labels(asCredit({ ...FIXTURES.ukVat!, pricesIncludeTax: true }))).toContain('Total before VAT');
  });

  it('invoices keep their layout: no total before VAT when it equals the subtotal', () => {
    expect(labels(FIXTURES.ukVat!)).not.toContain('Total before VAT');
  });

  it('a seller who is not registered for VAT prints no VAT wording', () => {
    expect(labels(asCredit(FIXTURES.freelancerAmounts!)).join(' ')).not.toMatch(/VAT/);
  });
});

describe('Ghana: Total before taxes', () => {
  it('a credit note names the figure before NHIL, GETFund Levy and VAT', () => {
    const v = buildView(asCredit(FIXTURES.ghana!));
    expect(v.totals[0]!.label).toBe('Total before taxes');
    expect(v.totals.map((t) => t.label)).not.toContain('Total before VAT');
  });

  it('so does an invoice priced including the taxes', () => {
    expect(labels({ ...FIXTURES.ghana!, pricesIncludeTax: true })).toContain('Total before taxes');
  });
});

describe('reverse charge on a UK credit note', () => {
  const note = asCredit(
    snapshot({
      number: 'CN-0009',
      currency: 'GBP',
      lineStyle: 'quantity',
      template: 'signature',
      seller: ukSeller,
      buyer: { name: 'Builder Ltd' },
      lines: [{ title: 'Groundworks', quantity: 1000, unitPrice: 100_000, tax: REVERSE }],
    }),
  );

  it('asks the customer to account for the output tax adjustment, with its amount', () => {
    expect(buildView(note).reverseChargeNote).toBe(
      'Reverse charge: customer to account for the output tax adjustment of £200.00 to HMRC. VAT 20% of £200.00 on £1,000.00.',
    );
  });

  it('the invoice keeps its own sentence', () => {
    expect(buildView({ ...note, kind: 'invoice' }).reverseChargeNote).toMatch(
      /^Reverse charge: customer to pay the VAT to HMRC\./,
    );
  });
});

describe('zero-rated amounts on a credit note', () => {
  const zero = snapshot({
    number: 'CN-0010',
    currency: 'GBP',
    lineStyle: 'quantity',
    template: 'signature',
    seller: ukSeller,
    buyer: { name: 'Exporter Ltd' },
    lines: [
      { title: 'Exported goods', quantity: 1000, unitPrice: 50_000, tax: ZERO },
      { title: 'Advice', quantity: 1000, unitPrice: 10_000, tax: FIXTURES.ukVat!.lines[0]!.tax },
    ],
  });

  it('are a zero-rated reduction', () => {
    expect(row(asCredit(zero), 'Zero-rated reduction')?.value).toBe('£500.00');
    expect(labels(asCredit(zero))).not.toContain('Zero-rated supplies');
  });

  it('on an invoice they stay zero-rated supplies', () => {
    expect(row(zero, 'Zero-rated supplies')?.value).toBe('£500.00');
  });
});
