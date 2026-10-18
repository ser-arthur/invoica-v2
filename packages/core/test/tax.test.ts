import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  describeTaxCode,
  formatRate,
  parseRate,
  splitGross,
  taxesOnNet,
  type TaxComponent,
} from '../src/tax';

describe('rates', () => {
  it.each([
    ['20', 200_000],
    ['17.5', 175_000],
    ['2.5%', 25_000],
    ['0', 0],
    ['8.875', 88_750],
    ['100', 1_000_000],
    ['101', null],
    ['-1', null],
    ['abc', null],
  ] as const)('reads %j as %s ppm', (input, expected) => {
    expect(parseRate(input)).toBe(expected);
  });

  it('prints only the decimals a rate needs', () => {
    expect(formatRate(200_000)).toBe('20%');
    expect(formatRate(175_000)).toBe('17.5%');
    expect(formatRate(25_000)).toBe('2.5%');
    expect(formatRate(88_750)).toBe('8.875%');
    expect(formatRate(0)).toBe('0%');
  });

  it('describes a code by its components', () => {
    expect(
      describeTaxCode({
        label: 'Standard',
        treatment: 'standard',
        components: [
          { name: 'VAT', ratePpm: 150_000, compound: false },
          { name: 'NHIL', ratePpm: 25_000, compound: false },
        ],
      }),
    ).toBe('VAT 15% + NHIL 2.5%');
    expect(describeTaxCode({ label: 'Exempt', treatment: 'exempt', components: [] })).toBe('Exempt');
  });
});

const vat20: TaxComponent = { name: 'VAT', ratePpm: 200_000, compound: false };

describe('taxesOnNet', () => {
  it('charges each component on the net', () => {
    const r = taxesOnNet(
      10_000,
      [
        { name: 'A', ratePpm: 25_000, compound: false },
        { name: 'B', ratePpm: 25_000, compound: false },
      ],
      'half-up',
    );
    expect(r.map((t) => t.amount)).toEqual([250, 250]);
  });

  it('charges a compound component on the net plus the taxes before it', () => {
    const r = taxesOnNet(
      10_000,
      [
        { name: 'Levy', ratePpm: 50_000, compound: false },
        { name: 'VAT', ratePpm: 150_000, compound: true },
      ],
      'half-up',
    );
    expect(r.map((t) => [t.base, t.amount])).toEqual([
      [10_000, 500],
      [10_500, 1575],
    ]);
  });
});

describe('splitGross', () => {
  it('splits a tax-inclusive price', () => {
    const r = splitGross(12_000, [vat20], 'half-up');
    expect(r.net).toBe(10_000);
    expect(r.taxes[0]?.amount).toBe(2000);
  });

  it('splits with compound components', () => {
    const r = splitGross(
      11_025,
      [
        { name: 'Levy', ratePpm: 50_000, compound: false },
        { name: 'VAT', ratePpm: 50_000, compound: true },
      ],
      'half-up',
    );
    expect(r.net).toBe(10_000);
    expect(r.taxes.map((t) => t.amount)).toEqual([500, 525]);
  });

  it('always gives back the gross exactly', () => {
    const component = fc.record({
      name: fc.constant('T'),
      ratePpm: fc.integer({ min: 0, max: 300_000 }),
      compound: fc.boolean(),
    });
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e11 }),
        fc.array(component, { maxLength: 4 }),
        fc.constantFrom('half-up', 'half-even', 'down'),
        (gross, components, mode) => {
          const r = splitGross(gross, components, mode);
          expect(r.net + r.taxes.reduce((a, t) => a + t.amount, 0)).toBe(gross);
          r.taxes.forEach((t) => expect(t.amount).toBeGreaterThanOrEqual(0));
        },
      ),
    );
  });
});
