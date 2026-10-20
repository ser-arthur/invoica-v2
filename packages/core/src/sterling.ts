import { currency } from './currency';
import { formatBusinessDate, type BusinessDate } from './dates';
import { DomainError } from './errors';
import { divRound, sumMinor, toSafeNumber } from './money';
import type { TaxSummaryRow } from './totals';

/**
 * VAT in sterling on documents in another currency (docs/specs/vat-in-sterling.md). A rate is units of the document's
 * currency to £1, as HMRC publishes its period rates and as rates are quoted in the UK, kept as an integer in
 * millionths.
 */

export const EXCHANGE_RATE_SCALE = 1_000_000;

/** Reads a rate such as "0.8650": a positive number with up to six decimal places. Anything else is null. */
export function parseExchangeRate(input: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,6}))?$/.exec(input.trim());
  if (!m) return null;
  const value = Number(m[1]) * EXCHANGE_RATE_SCALE + Number((m[2] ?? '').padEnd(6, '0'));
  return value > 0 ? value : null;
}

/**
 * Converts an amount in a currency's minor units to pence at a rate of units to £1 (in millionths), half up to the
 * penny.
 */
export function toPence(amount: number, currencyCode: string, rate: number): number {
  const exponent = currency(currencyCode).exponent;
  const shift = 2 - exponent;
  const numerator = BigInt(amount) * BigInt(EXCHANGE_RATE_SCALE) * (shift >= 0 ? 10n ** BigInt(shift) : 1n);
  const denominator = BigInt(rate) * (shift < 0 ? 10n ** BigInt(-shift) : 1n);
  return toSafeNumber(divRound(numerator, denominator, 'half-up'), 'sterling');
}

/** A rate as printed: at least four decimal places, and every place that was entered ("1.1500", "762.195122"). */
export function formatExchangeRate(rate: number): string {
  const whole = Math.trunc(rate / EXCHANGE_RATE_SCALE);
  const fraction = String(rate % EXCHANGE_RATE_SCALE)
    .padStart(6, '0')
    .replace(/0+$/, '')
    .padEnd(4, '0');
  return `${whole}.${fraction}`;
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

/** HMRC's period rate for the month of the tax point, or the UK market selling rate at the tax point. */
export type SterlingRateMethod = 'hmrc_period' | 'market';

/** What a document keeps of its VAT in sterling. */
export interface SterlingVat {
  /** Units of the document's currency to £1, in millionths. */
  rate: number;
  method: SterlingRateMethod;
  /** The first day of the period's month for HMRC's period rate; the tax point for a market rate. */
  rateDate: BusinessDate;
  charged: number;
  reverseCharge: number;
}

/** The dates on a document that decide its tax point. */
export interface SupplyDates {
  supplyDate: BusinessDate | null;
  servicePeriodStart: BusinessDate | null;
  servicePeriodEnd: BusinessDate | null;
  issueDate: BusinessDate;
}

/** The date of supply an invoice prints: the one given, or the issue date when no service period is given. */
export function supplyDateOf(d: SupplyDates): BusinessDate | null {
  if (d.supplyDate) return d.supplyDate;
  return d.servicePeriodStart || d.servicePeriodEnd ? null : d.issueDate;
}

/**
 * The tax point, worked out the same way in the editor, on save and on issue: the date of supply, else the end of
 * the service period, else the issue date.
 */
export function taxPointOf(d: SupplyDates): BusinessDate {
  return supplyDateOf(d) ?? d.servicePeriodEnd ?? d.issueDate;
}

/** The date a rate applies to: HMRC's period rate is for the month of the tax point, a market rate for the day. */
export function sterlingRateDate(method: SterlingRateMethod, taxPoint: BusinessDate): BusinessDate {
  return method === 'hmrc_period' ? `${taxPoint.slice(0, 7)}-01` : taxPoint;
}

/**
 * The VAT in sterling a document keeps when it needs one: null when it does not, and refused when it needs one and has
 * no rate.
 */
export function sterlingVatFor(args: {
  seller: { taxRegistered: boolean; countryCode: string | null };
  currency: string;
  taxes: readonly TaxSummaryRow[];
  rate: { rate: number; method: SterlingRateMethod; rateDate: BusinessDate } | null;
}): SterlingVat | null {
  const doc = { currency: args.currency, taxes: args.taxes };
  if (!needsSterlingVat(args.seller, doc)) return null;
  if (!args.rate) {
    throw new DomainError(
      'sterling_rate_needed',
      'Enter the exchange rate to pounds: a UK VAT invoice in another currency shows its VAT in sterling.',
    );
  }
  return { ...args.rate, ...sterlingVat(doc, args.rate.rate) };
}

/**
 * A credit note's VAT in sterling, at the invoice's rate, kept as a ledger against the invoice's sterling figures:
 * the notes together never credit more sterling than the invoice charged, and the note that credits the last of
 * the invoice's VAT credits the last of its sterling. Each note on its own is converted as usual, so credit notes in
 * pieces add up to the invoice exactly. Charged and reverse-charge VAT are kept apart.
 */
export function creditNoteSterlingVat(args: {
  invoice: SterlingVat;
  invoiceTaxes: readonly TaxSummaryRow[];
  earlier: readonly {
    taxes: readonly TaxSummaryRow[];
    sterling: { charged: number; reverseCharge: number };
  }[];
  currency: string;
  taxes: readonly TaxSummaryRow[];
}): SterlingVat {
  const vat = (taxes: readonly TaxSummaryRow[], charged: boolean) =>
    sumMinor(taxes.filter((t) => t.charged === charged).map((t) => t.amount));
  const kept = (charged: boolean) => {
    const invoiced = vat(args.invoiceTaxes, charged);
    const before = sumMinor(args.earlier.map((n) => vat(n.taxes, charged)));
    const now = vat(args.taxes, charged);
    const sterlingInvoiced = charged ? args.invoice.charged : args.invoice.reverseCharge;
    const sterlingBefore = sumMinor(
      args.earlier.map((n) => (charged ? n.sterling.charged : n.sterling.reverseCharge)),
    );
    const left = Math.max(0, sterlingInvoiced - sterlingBefore);
    if (now === 0) return 0;
    if (sumMinor([before, now]) >= invoiced) return left;
    return Math.min(toPence(now, args.currency, args.invoice.rate), left);
  };
  return {
    rate: args.invoice.rate,
    method: args.invoice.method,
    rateDate: args.invoice.rateDate,
    charged: kept(true),
    reverseCharge: kept(false),
  };
}

/**
 * What a rate was entered for: the currency, the method, and the month of the tax point for HMRC's period rate or
 * the day for a market rate. A draft keeps it with its rate, so a rate that no longer fits is asked for again.
 */
export function sterlingRateFor(
  method: SterlingRateMethod,
  currency: string,
  taxPoint: BusinessDate,
): string {
  return `${currency}|${method}|${method === 'hmrc_period' ? taxPoint.slice(0, 7) : taxPoint}`;
}

/** Why a rate entered for `entered` does not fit a document that now needs one for `needed`. */
export function staleRateMessage(entered: string, needed: string): string {
  const [fromCurrency, fromMethod, fromWhen] = entered.split('|');
  const [toCurrency, toMethod, toWhen] = needed.split('|');
  if (fromCurrency !== toCurrency) {
    return `The exchange rate was entered for ${fromCurrency}. Enter the rate for ${toCurrency}.`;
  }
  if (fromMethod !== toMethod) {
    return 'The exchange rate was entered before the way rates are chosen changed. Enter it again.';
  }
  if (toMethod === 'hmrc_period') {
    const month = (m: string) => formatBusinessDate(`${m}-01`, 'long').replace(/^1 /, '');
    return `The exchange rate was entered for ${month(fromWhen!)}. Enter HMRC’s rate for ${month(toWhen!)}.`;
  }
  return `The exchange rate was entered for ${formatBusinessDate(fromWhen!, 'long')}. Enter the market rate for ${formatBusinessDate(toWhen!, 'long')}.`;
}
