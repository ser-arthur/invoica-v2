import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeDocument, type LineInput } from '../src/totals';
import { splitGross, type TaxCode, type TaxComponent } from '../src/tax';
import { deriveState } from '../src/states';
import { parseQuantity } from '../src/quantity';
import { allowedRounding } from '../src/presets';

const code = (ratePpm: number, label = `VAT ${ratePpm}`): TaxCode => ({
  label,
  treatment: 'standard',
  components: [{ name: 'VAT', ratePpm, compound: false }],
});
const line = (unitPrice: number, tax: TaxCode | null, quantity = 1000): LineInput => ({
  quantity,
  unitPrice,
  tax,
});

describe('review 1, M3: "on the invoice total, rounded down" rounds the VAT total down once', () => {
  it('53p at 20% and 53p at 5%: exact 13.25p, so 13p', () => {
    const t = computeDocument({
      currency: 'GBP',
      pricesIncludeTax: false,
      taxLevel: 'document',
      rounding: 'down',
      lines: [line(53, code(200_000)), line(53, code(50_000))],
    });
    expect(t.taxTotal).toBe(13);
    expect(t.taxes.reduce((a, r) => a + r.amount, 0)).toBe(13);
  });

  it('two codes at the same rate, 53p each: exact 21.2p, so 21p', () => {
    const t = computeDocument({
      currency: 'GBP',
      pricesIncludeTax: false,
      taxLevel: 'document',
      rounding: 'down',
      lines: [line(53, code(200_000, 'Standard')), line(53, code(200_000, 'Custom'))],
    });
    expect(t.taxTotal).toBe(21);
  });

  it('with prices including VAT, the VAT is rounded down and the net takes the rest: £10.01 gross gives 166p', () => {
    const t = computeDocument({
      currency: 'GBP',
      pricesIncludeTax: true,
      taxLevel: 'document',
      rounding: 'down',
      lines: [line(1001, code(200_000))],
    });
    expect([t.taxTotal, t.net, t.total]).toEqual([166, 835, 1001]);
  });

  it('line amounts and percentage discounts are always rounded half up, whatever the VAT setting', () => {
    const t = computeDocument({
      currency: 'GBP',
      pricesIncludeTax: false,
      taxLevel: 'document',
      rounding: 'down',
      lines: [line(3333, null, 1500)],
      discounts: [{ label: 'Ten', kind: 'percent', ratePpm: 125_000 }],
    });
    // 1.5 x £33.33 = £49.995, billed as £50.00; 12.5% of 5000 = 625.
    expect([t.lines[0]!.amount, t.discountTotal]).toEqual([5000, 625]);
  });

  it('never takes more than the fractions of a penny off the exact VAT total', () => {
    const arb = fc.array(
      fc.record({
        price: fc.integer({ min: 1, max: 1_000_000 }),
        rate: fc.constantFrom(0, 50_000, 200_000, 175_000),
      }),
      { minLength: 1, maxLength: 12 },
    );
    fc.assert(
      fc.property(arb, (rows) => {
        const t = computeDocument({
          currency: 'GBP',
          pricesIncludeTax: false,
          taxLevel: 'document',
          rounding: 'down',
          lines: rows.map((r) => line(r.price, code(r.rate))),
        });
        const exactTimesScale = rows.reduce((a, r) => a + BigInt(r.price) * BigInt(r.rate), 0n);
        expect(BigInt(t.taxTotal)).toBe(exactTimesScale / 1_000_000n);
      }),
    );
  });
});

describe('review 1, M4: a tax-inclusive split keeps every tax on its rate', () => {
  const ghana: TaxComponent[] = [
    { name: 'NHIL', ratePpm: 25_000, compound: false },
    { name: 'GETFund Levy', ratePpm: 25_000, compound: false },
    { name: 'VAT', ratePpm: 150_000, compound: false },
  ];

  it('GHS 100.00 including tax: NHIL 2.08, GETFund 2.08, VAT 12.50, net 83.34', () => {
    const r = splitGross(10_000, ghana, 'half-up');
    expect([r.net, ...r.taxes.map((t) => t.amount)]).toEqual([8334, 208, 208, 1250]);
  });

  it('no component is ever negative or more than one unit from its exact share', () => {
    const comp = fc.record({
      name: fc.constant('T'),
      ratePpm: fc.integer({ min: 0, max: 250_000 }),
      compound: fc.constant(false),
    });
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5_000_000 }),
        fc.array(comp, { maxLength: 4 }),
        fc.constantFrom('half-up', 'half-even', 'down'),
        (gross, components, mode) => {
          const r = splitGross(gross, components, mode);
          const sum = components.reduce((a, c) => a + c.ratePpm, 0);
          for (const [i, t] of r.taxes.entries()) {
            expect(t.amount).toBeGreaterThanOrEqual(0);
            // exact share of component i = gross * rate_i / (1e6 + sum of rates)
            const exact = (gross * components[i]!.ratePpm) / (1_000_000 + sum);
            expect(Math.abs(t.amount - exact)).toBeLessThan(1);
          }
          expect(r.net + r.taxes.reduce((a, t) => a + t.amount, 0)).toBe(gross);
        },
      ),
    );
  });
});

describe('review 1, M6: credit notes are not payments', () => {
  it('an invoice closed by a credit note alone is credited, not paid', () => {
    expect(deriveState({ lifecycle: 'sent', total: 1000, paid: 0, credited: 1000 })).toBe('credited');
    expect(deriveState({ lifecycle: 'sent', total: 1000, paid: 400, credited: 600 })).toBe('settled');
    expect(deriveState({ lifecycle: 'sent', total: 1000, paid: 1000, credited: 0 })).toBe('paid');
    expect(deriveState({ lifecycle: 'sent', total: 1000, paid: 200, credited: 300 })).toBe('part_paid');
    // A credit note alone reduces what is owed; nothing has been paid, so the invoice keeps its own state.
    expect(deriveState({ lifecycle: 'sent', total: 1000, paid: 0, credited: 300 })).toBe('sent');
  });
});

describe('review 1, L5: quantities accept commas only as thousands separators', () => {
  it.each([
    ['1,5', null],
    ['1,000', 1_000_000],
    ['12,345.5', 12_345_500],
    ['1,00', null],
  ] as const)('%j', (input, expected) => expect(parseQuantity(input)).toBe(expected));
});

describe('review 1, L4: rounding choices follow the country rules', () => {
  it('offers UK businesses only what HMRC describes', () => {
    expect(allowedRounding('GB')).toEqual([
      { taxLevel: 'line', rounding: 'half-up' },
      { taxLevel: 'document', rounding: 'down' },
    ]);
    expect(allowedRounding('GH')).toContainEqual({ taxLevel: 'document', rounding: 'half-up' });
    expect(allowedRounding('US').length).toBeGreaterThan(2);
  });
});
