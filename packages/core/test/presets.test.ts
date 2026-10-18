import { describe, expect, it } from 'vitest';
import { TAX_PRESETS, presetFor, roundingDefaultFor } from '../src/presets';
import { computeDocument } from '../src/totals';

describe('tax presets', () => {
  it('has unique keys and valid rates', () => {
    const keys = TAX_PRESETS.flatMap((p) => p.codes.map((c) => c.key));
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of TAX_PRESETS.flatMap((p) => p.codes)) {
      for (const comp of c.components) expect(comp.ratePpm).toBeGreaterThanOrEqual(0);
    }
  });

  it('charges Ghana’s three taxes on the same base: 20% in all', () => {
    const standard = presetFor('GH')!.codes.find((c) => c.key === 'gh_standard')!;
    const t = computeDocument({
      currency: 'GHS',
      pricesIncludeTax: false,
      ...roundingDefaultFor('GH'),
      lines: [{ quantity: 1000, unitPrice: 100_000, tax: standard }],
    });
    expect(t.taxes.map((r) => [r.name, r.amount])).toEqual([
      ['NHIL', 2500],
      ['GETFund Levy', 2500],
      ['VAT', 15_000],
    ]);
    expect(t.total).toBe(120_000);
  });

  it('works UK VAT per line to the nearest penny by default', () => {
    const standard = presetFor('GB')!.codes.find((c) => c.key === 'uk_vat_standard')!;
    const t = computeDocument({
      currency: 'GBP',
      pricesIncludeTax: false,
      ...roundingDefaultFor('GB'),
      lines: [
        { quantity: 1000, unitPrice: 1253, tax: standard },
        { quantity: 1000, unitPrice: 1253, tax: standard },
      ],
    });
    // 250.6p per line rounds to 251p; the total is the sum of the lines.
    expect(t.lines.map((l) => l.tax)).toEqual([251, 251]);
    expect(t.taxTotal).toBe(502);
  });
});
