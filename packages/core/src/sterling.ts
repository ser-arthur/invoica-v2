import { currency } from './currency';
import { divRound, sumMinor, toSafeNumber } from './money';
import type { TaxSummaryRow } from './totals';

/**
 * VAT in sterling on documents in another currency (docs/specs/vat-in-sterling.md). A rate is sterling per unit of
 * the document's currency, kept as an integer in millionths.
 */

export const EXCHANGE_RATE_SCALE = 1_000_000;

/** Reads a rate such as "0.8650": a positive number with up to six decimal places. Anything else is null. */
export function parseExchangeRate(input: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,6}))?$/.exec(input.trim());
  if (!m) return null;
  const value = Number(m[1]) * EXCHANGE_RATE_SCALE + Number((m[2] ?? '').padEnd(6, '0'));
  return value > 0 ? value : null;
}

/** Converts an amount in a currency's minor units to pence at a rate in millionths, half up to the penny. */
export function toPence(amount: number, currencyCode: string, rate: number): number {
  const exponent = currency(currencyCode).exponent;
  const shift = 2 - exponent;
  const numerator = BigInt(amount) * BigInt(rate) * (shift >= 0 ? 10n ** BigInt(shift) : 1n);
  const denominator = BigInt(EXCHANGE_RATE_SCALE) * (shift < 0 ? 10n ** BigInt(-shift) : 1n);
  return toSafeNumber(divRound(numerator, denominator, 'half-up'), 'sterling');
}

/** The document's VAT in sterling: what it charges, and reverse-charge VAT it shows, each converted once. */
export function sterlingVat(
  doc: { currency: string; taxes: readonly TaxSummaryRow[] },
  rate: number,
): { charged: number; reverseCharge: number } {
  const total = (charged: boolean) =>
    sumMinor(doc.taxes.filter((t) => t.charged === charged).map((t) => t.amount));
  return {
    charged: toPence(total(true), doc.currency, rate),
    reverseCharge: toPence(total(false), doc.currency, rate),
  };
}

/** Whether a document must show its VAT in sterling: a UK VAT-registered seller, another currency, VAT above zero. */
export function needsSterlingVat(
  seller: { taxRegistered: boolean; countryCode: string | null },
  doc: { currency: string; taxes: readonly TaxSummaryRow[] },
): boolean {
  return (
    seller.taxRegistered &&
    seller.countryCode === 'GB' &&
    doc.currency !== 'GBP' &&
    doc.taxes.some((t) => t.ratePpm > 0)
  );
}
