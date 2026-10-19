import { describe, expect, it } from 'vitest';
import { formatExchangeRate, needsSterlingVat, parseExchangeRate, sterlingVat } from '../src/sterling';
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
  // Rates are units of the document's currency to £1, as HMRC publishes them.
  it('converts the total once and rounds half up to the penny', () => {
    // €200.00 at €1.15 to £1 is £173.913..., so £173.91.
    expect(sterlingVat({ currency: 'EUR', taxes: [row(20_000)] }, 1_150_000)).toEqual({
      charged: 17_391,
      reverseCharge: 0,
    });
    // 2,000 CFA francs (no minor unit) at 762.195122 to £1 is £2.624..., so £2.62.
    expect(sterlingVat({ currency: 'XOF', taxes: [row(2000)] }, 762_195_122)).toEqual({
      charged: 262,
      reverseCharge: 0,
    });
    // €0.03 at €2 to £1 is 1.5p, which rounds up to 2p.
    expect(sterlingVat({ currency: 'EUR', taxes: [row(3)] }, 2_000_000).charged).toBe(2);
    // 1.000 Kuwaiti dinar (three decimal places) at 0.38 to £1 is £2.6315..., so £2.63.
    expect(sterlingVat({ currency: 'KWD', taxes: [row(1000)] }, 380_000).charged).toBe(263);
  });

  it('adds rows before converting, and keeps reverse-charge VAT apart', () => {
    // 3c + 3c at €2 to £1 is 3p; converting each row first would give 2p + 2p.
    expect(sterlingVat({ currency: 'EUR', taxes: [row(3), row(3, true, 50_000)] }, 2_000_000).charged).toBe(
      3,
    );
    expect(sterlingVat({ currency: 'EUR', taxes: [row(1000), row(4000, false)] }, 1_000_000)).toEqual({
      charged: 1000,
      reverseCharge: 4000,
    });
  });
});

describe('the rate as printed', () => {
  it('shows at least four decimal places and no more than were entered', () => {
    expect(formatExchangeRate(1_150_000)).toBe('1.1500');
    expect(formatExchangeRate(762_195_122)).toBe('762.195122');
    expect(formatExchangeRate(1_156_070)).toBe('1.15607');
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
