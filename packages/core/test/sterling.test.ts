import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  creditNoteSterlingVat,
  formatExchangeRate,
  needsSterlingVat,
  parseExchangeRate,
  staleRateMessage,
  sterlingRateFor,
  sterlingVat,
  type SterlingVat,
} from '../src/sterling';
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

describe('credit notes keep the invoice’s VAT in sterling exactly', () => {
  const invoiceVat = (amount: number, rate: number): SterlingVat => ({
    rate,
    method: 'hmrc_period',
    rateDate: '2026-10-01',
    ...sterlingVat({ currency: 'EUR', taxes: [row(amount)] }, rate),
  });

  it('ten notes of a tenth each credit exactly the sterling the invoice charged', () => {
    // €20.00 of VAT at 1.1500 is £17.39; each €2.00 alone would be £1.74, ten of them £17.40.
    const invoice = invoiceVat(2000, 1_150_000);
    expect(invoice.charged).toBe(1739);
    const earlier: { taxes: TaxSummaryRow[]; sterling: { charged: number; reverseCharge: number } }[] = [];
    for (let i = 0; i < 10; i++) {
      const note = creditNoteSterlingVat({
        invoice,
        invoiceTaxes: [row(2000)],
        earlier,
        currency: 'EUR',
        taxes: [row(200)],
      });
      earlier.push({ taxes: [row(200)], sterling: note });
    }
    expect(earlier.reduce((a, n) => a + n.sterling.charged, 0)).toBe(1739);
    expect(earlier.slice(0, 9).every((n) => n.sterling.charged === 174)).toBe(true);
    expect(earlier[9]!.sterling.charged).toBe(173);
  });

  it('for any split, the notes never credit more than the invoice charged, and all of them credit exactly that', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 1_000, max: 500_000_000 }),
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 12 }),
        (vat, rate, weights) => {
          const invoice = invoiceVat(vat, rate);
          // Split the VAT into notes in proportion to the weights, the last taking what is left.
          const total = weights.reduce((a, w) => a + w, 0);
          const parts: number[] = [];
          let left = vat;
          weights.forEach((w, i) => {
            const part = i === weights.length - 1 ? left : Math.min(left, Math.floor((vat * w) / total));
            parts.push(part);
            left -= part;
          });
          const earlier: { taxes: TaxSummaryRow[]; sterling: { charged: number; reverseCharge: number } }[] =
            [];
          for (const part of parts.filter((p) => p > 0)) {
            const note = creditNoteSterlingVat({
              invoice,
              invoiceTaxes: [row(vat)],
              earlier,
              currency: 'EUR',
              taxes: [row(part)],
            });
            earlier.push({ taxes: [row(part)], sterling: note });
            const soFar = earlier.reduce((a, n) => a + n.sterling.charged, 0);
            expect(soFar).toBeLessThanOrEqual(invoice.charged);
            expect(note.rate).toBe(invoice.rate);
          }
          expect(earlier.reduce((a, n) => a + n.sterling.charged, 0)).toBe(invoice.charged);
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('reverse-charge VAT is kept the same way, on its own', () => {
    const invoice: SterlingVat = {
      rate: 1_150_000,
      method: 'market',
      rateDate: '2026-10-18',
      ...sterlingVat({ currency: 'EUR', taxes: [row(2000, false)] }, 1_150_000),
    };
    const first = creditNoteSterlingVat({
      invoice,
      invoiceTaxes: [row(2000, false)],
      earlier: [],
      currency: 'EUR',
      taxes: [row(1000, false)],
    });
    const second = creditNoteSterlingVat({
      invoice,
      invoiceTaxes: [row(2000, false)],
      earlier: [{ taxes: [row(1000, false)], sterling: first }],
      currency: 'EUR',
      taxes: [row(1000, false)],
    });
    expect([first.charged, first.reverseCharge, second.reverseCharge]).toEqual([0, 870, 869]);
  });
});

describe('what a rate was entered for', () => {
  it('is the currency, the method, and for HMRC’s period rate the month of the tax point', () => {
    expect(sterlingRateFor('hmrc_period', 'EUR', '2026-10-16')).toBe('EUR|hmrc_period|2026-10');
    expect(sterlingRateFor('market', 'EUR', '2026-10-16')).toBe('EUR|market|2026-10-16');
  });

  it('says what changed when a rate no longer fits', () => {
    expect(staleRateMessage('EUR|hmrc_period|2026-10', 'JPY|hmrc_period|2026-10')).toBe(
      'The exchange rate was entered for EUR. Enter the rate for JPY.',
    );
    expect(staleRateMessage('EUR|hmrc_period|2026-10', 'EUR|hmrc_period|2026-11')).toBe(
      'The exchange rate was entered for October 2026. Enter HMRC’s rate for November 2026.',
    );
    expect(staleRateMessage('EUR|market|2026-10-16', 'EUR|market|2026-10-17')).toBe(
      'The exchange rate was entered for 16 October 2026. Enter the market rate for 17 October 2026.',
    );
    expect(staleRateMessage('EUR|market|2026-10-16', 'EUR|hmrc_period|2026-10')).toBe(
      'The exchange rate was entered before the way rates are chosen changed. Enter it again.',
    );
  });
});
