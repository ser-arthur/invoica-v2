import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeDocument, type DocumentInput, type LineInput } from '../src/totals';
import type { TaxCode } from '../src/tax';

const vat = (ratePpm: number): TaxCode => ({
  label: `VAT ${ratePpm / 10_000}%`,
  treatment: ratePpm === 0 ? 'zero' : 'standard',
  components: [{ name: 'VAT', ratePpm, compound: false }],
});
const exempt: TaxCode = { label: 'Exempt', treatment: 'exempt', components: [] };

const doc = (lines: LineInput[], extra: Partial<DocumentInput> = {}): DocumentInput => ({
  currency: 'GBP',
  pricesIncludeTax: false,
  taxLevel: 'document',
  rounding: 'half-up',
  lines,
  ...extra,
});
const line = (quantity: number, unitPrice: number, tax: TaxCode | null = null): LineInput => ({
  quantity,
  unitPrice,
  tax,
});

/**
 * The audit's worked examples (docs/audit.md, section 3.1), as the new core computes them.
 * Each states what changed from the old app on purpose.
 */
describe('audit worked examples', () => {
  it('W1: two lines at 20% give one total, stored in pence (old app stored 131.988)', () => {
    const t = computeDocument(doc([line(3000, 3333, vat(200_000)), line(1000, 1000, vat(200_000))]));
    expect([t.subtotal, t.taxTotal, t.total]).toEqual([10_999, 2200, 13_199]);
  });

  it('W2: a tie at 5% gives the same figure everywhere (old app showed £13.13 and printed £13.12)', () => {
    const t = computeDocument(doc([line(1000, 1250, vat(50_000))]));
    expect([t.subtotal, t.taxTotal, t.total]).toEqual([1250, 63, 1313]);
  });

  it('W3: 17.5% on £13.00 adds up as printed (old app printed £13.00 + £2.27 = £15.28)', () => {
    const t = computeDocument(doc([line(1000, 1300, vat(175_000))]));
    expect([t.subtotal, t.taxTotal, t.total]).toEqual([1300, 228, 1528]);
    expect(t.net + t.taxTotal).toBe(t.total);
    expect(t.taxes[0]?.ratePpm).toBe(175_000);
  });

  it('W4: a discount larger than the subtotal is refused (old app saved a total of 0 or showed -£50.00)', () => {
    expect(() =>
      computeDocument(
        doc([line(1000, 10_000, vat(200_000))], {
          discounts: [{ label: 'Offer', kind: 'amount', amount: 15_000 }],
        }),
      ),
    ).toThrow(/Discounts cannot be more than the subtotal/);
  });

  it('W5: shipping is an ordinary taxed line and the discount comes off before tax (unchanged)', () => {
    const t = computeDocument(
      doc([line(2000, 5000, vat(200_000)), line(1000, 1000, vat(200_000))], {
        discounts: [{ label: 'Discount', kind: 'amount', amount: 2000 }],
      }),
    );
    expect([t.net, t.taxTotal, t.total]).toEqual([9000, 1800, 10_800]);
  });

  it('W6: fractional quantities are kept exactly (old app rounded 1.5 to 2 and 0.4 to 0 on Postgres)', () => {
    const t = computeDocument(doc([line(1500, 4000), line(400, 10_000)]));
    expect(t.lines.map((l) => l.amount)).toEqual([6000, 4000]);
    expect(t.total).toBe(10_000);
  });

  it('W7: a rate has one unit, parts per million, so a round trip never changes it (old app divided by 100 on each edit)', () => {
    const input = doc([line(3000, 3333, vat(200_000)), line(1000, 1000, vat(200_000))]);
    const again = JSON.parse(JSON.stringify(input)) as DocumentInput;
    expect(computeDocument(again)).toEqual(computeDocument(input));
  });
});

describe('rounding level and mode', () => {
  const lines = [line(1000, 1250, vat(50_000)), line(1000, 1250, vat(50_000))];

  it('document level rounds once per tax on the sum of its lines', () => {
    const t = computeDocument(doc(lines));
    expect(t.taxTotal).toBe(125);
  });

  it('line level rounds each line, then adds', () => {
    const t = computeDocument(doc(lines, { taxLevel: 'line' }));
    expect(t.taxTotal).toBe(126);
    expect(t.lines.map((l) => l.tax)).toEqual([63, 63]);
  });

  it('rounding down at document level gives £21.99 on W1', () => {
    const t = computeDocument(
      doc([line(3000, 3333, vat(200_000)), line(1000, 1000, vat(200_000))], { rounding: 'down' }),
    );
    expect(t.taxTotal).toBe(2199);
  });
});

describe('several rates on one document', () => {
  it('summarises each rate separately, including untaxed supplies', () => {
    const t = computeDocument(
      doc([
        line(1000, 10_000, vat(200_000)),
        line(1000, 5000, vat(50_000)),
        line(1000, 2000, exempt),
        line(1000, 700),
      ]),
    );
    expect(t.taxes.map((r) => [r.name, r.ratePpm, r.base, r.amount])).toEqual([
      ['VAT', 200_000, 10_000, 2000],
      ['VAT', 50_000, 5000, 250],
      ['Exempt', 0, 2000, 0],
    ]);
    expect(t.total).toBe(10_000 + 5000 + 2000 + 700 + 2250);
  });

  it('allocates a document discount across lines before tax', () => {
    const t = computeDocument(
      doc([line(1000, 10_000, vat(200_000)), line(1000, 10_000, vat(0))], {
        discounts: [{ label: 'Friends and family', kind: 'percent', ratePpm: 100_000 }],
      }),
    );
    expect(t.discounts).toEqual([{ label: 'Friends and family', amount: 2000 }]);
    expect(t.lines.map((l) => l.discount)).toEqual([1000, 1000]);
    expect(t.taxTotal).toBe(1800);
    expect(t.total).toBe(18_000 + 1800);
  });

  it('charges compound taxes on top of earlier components', () => {
    const code: TaxCode = {
      label: 'Standard',
      treatment: 'standard',
      components: [
        { name: 'Levy', ratePpm: 50_000, compound: false },
        { name: 'VAT', ratePpm: 150_000, compound: true },
      ],
    };
    const t = computeDocument(doc([line(1000, 100_000, code)]));
    expect(t.taxes.map((r) => [r.name, r.base, r.amount])).toEqual([
      ['Levy', 100_000, 5000],
      ['VAT', 105_000, 15_750],
    ]);
    expect(t.total).toBe(120_750);
  });
});

describe('prices that include tax', () => {
  it('works the tax out of the price and keeps the total as entered', () => {
    const t = computeDocument(
      doc([line(1000, 12_000, vat(200_000)), line(1000, 600, vat(200_000))], { pricesIncludeTax: true }),
    );
    expect([t.subtotal, t.total, t.net, t.taxTotal]).toEqual([12_600, 12_600, 10_500, 2100]);
  });
});

describe('balance', () => {
  it('takes payments and credits off the total', () => {
    const t = computeDocument(doc([line(1000, 10_000, vat(200_000))], { paid: 5000 }));
    expect([t.total, t.paid, t.balance]).toEqual([12_000, 5000, 7000]);
  });
});

describe('every document adds up as printed', () => {
  const component = fc.record({
    name: fc.constantFrom('VAT', 'NHIL', 'Levy'),
    ratePpm: fc.integer({ min: 0, max: 250_000 }),
    compound: fc.boolean(),
  });
  const code = fc.option(
    fc.record({
      label: fc.constant('Code'),
      treatment: fc.constantFrom('standard', 'zero', 'exempt', 'custom') as fc.Arbitrary<
        TaxCode['treatment']
      >,
      components: fc.array(component, { maxLength: 3 }),
    }),
    { nil: null },
  );
  const lineArb = fc.record({
    quantity: fc.integer({ min: 1, max: 100_000_000 }),
    unitPrice: fc.integer({ min: 0, max: 10_000_000 }),
    tax: code,
  });
  const input = fc.record({
    lines: fc.array(lineArb, { maxLength: 25 }),
    pricesIncludeTax: fc.boolean(),
    taxLevel: fc.constantFrom('document', 'line') as fc.Arbitrary<'document' | 'line'>,
    rounding: fc.constantFrom('half-up', 'half-even', 'down') as fc.Arbitrary<
      'half-up' | 'half-even' | 'down'
    >,
    discountPpm: fc.integer({ min: 0, max: 1_000_000 }),
  });

  it('holds every invariant', () => {
    fc.assert(
      fc.property(input, (i) => {
        const t = computeDocument({
          currency: 'GBP',
          pricesIncludeTax: i.pricesIncludeTax,
          taxLevel: i.taxLevel,
          rounding: i.rounding,
          lines: i.lines,
          discounts: [{ label: 'D', kind: 'percent', ratePpm: i.discountPpm }],
        });
        const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
        expect(sum(t.lines.map((l) => l.amount))).toBe(t.subtotal);
        expect(sum(t.lines.map((l) => l.discount))).toBe(t.discountTotal);
        expect(sum(t.lines.map((l) => l.tax))).toBe(t.taxTotal);
        expect(sum(t.lines.map((l) => l.net))).toBe(t.net);
        expect(sum(t.taxes.map((r) => r.amount))).toBe(t.taxTotal);
        expect(t.net + t.taxTotal).toBe(t.total);
        if (i.pricesIncludeTax) expect(t.total).toBe(t.subtotal - t.discountTotal);
        else expect(t.net).toBe(t.subtotal - t.discountTotal);
        expect(t.total).toBeGreaterThanOrEqual(0);
        t.lines.forEach((l) => expect(Number.isSafeInteger(l.net) && Number.isSafeInteger(l.tax)).toBe(true));
      }),
      { numRuns: 500 },
    );
  });
});
