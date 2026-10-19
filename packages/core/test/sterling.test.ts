import { describe, expect, it } from 'vitest';
import { needsSterlingVat, parseExchangeRate, sterlingVat } from '../src/sterling';
import type { TaxSummaryRow } from '../src/totals';

/** Acceptance criteria 1 to 4: docs/specs/vat-in-sterling.md. */

const row = (amount: number, charged = true, ratePpm = 200_000): TaxSummaryRow => ({
  key: `VAT ${ratePpm} ${charged}`,
  name: 'VAT',
  ratePpm,
  compound: false,
  treatment: charged ? 'standard' : 'reverse_charge',
  base: amount * 5,
  amount,
  charged,
});

describe('criterion 1: reading a rate', () => {
  it('reads up to six decimal places as millionths', () => {
    expect(parseExchangeRate('0.865')).toBe(865_000);
    expect(parseExchangeRate(' 1.17 ')).toBe(1_170_000);
    expect(parseExchangeRate('0.001312')).toBe(1312);
    expect(parseExchangeRate('12')).toBe(12_000_000);
  });

  it('refuses zero, negatives, too many places and anything else', () => {
    for (const bad of ['0', '0.000000', '-1', '0.8650001', 'abc', '', '1,2', '1e3', '.5.']) {
      expect(parseExchangeRate(bad), bad).toBeNull();
    }
  });
});

describe('criteria 2 and 3: converting the VAT', () => {
  it('converts the total once and rounds half up to the penny', () => {
    expect(sterlingVat({ currency: 'EUR', taxes: [row(20_000)] }, 865_000)).toEqual({
      charged: 17_300,
      reverseCharge: 0,
    });
    expect(sterlingVat({ currency: 'XOF', taxes: [row(2000)] }, 1312)).toEqual({
      charged: 262,
      reverseCharge: 0,
    });
    // €0.10 at 0.865 is 8.65p, which rounds up to 9p.
    expect(sterlingVat({ currency: 'EUR', taxes: [row(10)] }, 865_000).charged).toBe(9);
  });

  it('adds rows before converting, and keeps reverse-charge VAT apart', () => {
    // 3p + 3p at 0.5 is 3p; converting each row first would give 2p + 2p.
    expect(sterlingVat({ currency: 'EUR', taxes: [row(3), row(3, true, 50_000)] }, 500_000).charged).toBe(3);
    expect(sterlingVat({ currency: 'EUR', taxes: [row(1000), row(4000, false)] }, 1_000_000)).toEqual({
      charged: 1000,
      reverseCharge: 4000,
    });
  });
});

describe('criterion 4: when it is needed', () => {
  const vat = { currency: 'EUR', taxes: [row(1000)] };
  const seller = { taxRegistered: true, countryCode: 'GB' };

  it('for a UK VAT-registered seller invoicing VAT in another currency', () => {
    expect(needsSterlingVat(seller, vat)).toBe(true);
    expect(needsSterlingVat(seller, { currency: 'EUR', taxes: [row(1000, false)] })).toBe(true);
  });

  it('never in sterling, for an unregistered or non-UK seller, or with no VAT above zero', () => {
    expect(needsSterlingVat(seller, { ...vat, currency: 'GBP' })).toBe(false);
    expect(needsSterlingVat({ ...seller, taxRegistered: false }, vat)).toBe(false);
    expect(needsSterlingVat({ ...seller, countryCode: 'GH' }, vat)).toBe(false);
    expect(needsSterlingVat(seller, { currency: 'EUR', taxes: [row(0, true, 0)] })).toBe(false);
  });
});
