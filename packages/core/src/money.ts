import { currency } from './currency';
import { DomainError } from './errors';

/**
 * How an exact result becomes a whole number of minor units.
 * - `half-up`: to the nearest unit, halves away from zero (0.5p becomes 1p, -0.5p becomes -1p).
 * - `half-even`: to the nearest unit, halves to the even neighbour.
 * - `down`: towards zero.
 */
export type RoundingMode = 'half-up' | 'half-even' | 'down';

export const ROUNDING_MODES: readonly RoundingMode[] = ['half-up', 'half-even', 'down'];

/** Throws unless `value` is a safe integer. Every amount in minor units passes through this. */
export function assertMinor(value: number, label = 'amount'): number {
  if (!Number.isSafeInteger(value)) {
    throw new DomainError(
      'amount_not_integer',
      `${label} must be a whole number of minor units, got ${value}.`,
    );
  }
  return value;
}

/** Converts a bigint to a number, throwing if it is outside the safe integer range. */
export function toSafeNumber(value: bigint, label = 'amount'): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new DomainError('amount_too_large', `${label} is too large.`);
  }
  return Number(value);
}

/** Divides `numerator` by a positive `denominator` and rounds the result with `mode`. Exact. */
export function divRound(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
  if (denominator <= 0n) throw new DomainError('division_invalid', 'Denominator must be positive.');
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) return quotient;
  const away = numerator < 0n ? quotient - 1n : quotient + 1n;
  const twice = (remainder < 0n ? -remainder : remainder) * 2n;
  switch (mode) {
    case 'down':
      return quotient;
    case 'half-up':
      return twice >= denominator ? away : quotient;
    case 'half-even':
      if (twice > denominator) return away;
      if (twice < denominator) return quotient;
      return quotient % 2n === 0n ? quotient : away;
  }
}

/** Sums amounts in minor units, checking each and the result. */
export function sumMinor(values: readonly number[]): number {
  let total = 0n;
  for (const v of values) total += BigInt(assertMinor(v));
  return toSafeNumber(total, 'sum');
}

/**
 * Splits `total` into parts proportional to `weights`, so the parts always add up to `total` exactly.
 * Uses the largest-remainder method; ties go to the earlier part. When every weight is zero the total
 * is split as evenly as possible.
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  assertMinor(total, 'total');
  if (weights.length === 0) {
    if (total !== 0)
      throw new DomainError('allocate_no_parts', 'Cannot allocate a non-zero total to no parts.');
    return [];
  }
  for (const w of weights) {
    assertMinor(w, 'weight');
    if (w < 0) throw new DomainError('allocate_negative_weight', 'Weights must not be negative.');
  }
  const sign = total < 0 ? -1n : 1n;
  const magnitude = BigInt(total) * sign;
  const weightSum = weights.reduce((acc, w) => acc + BigInt(w), 0n);
  const n = BigInt(weights.length);
  const effective = weightSum === 0n ? weights.map(() => 1n) : weights.map((w) => BigInt(w));
  const denominator = weightSum === 0n ? n : weightSum;

  const shares = effective.map((w) => (magnitude * w) / denominator);
  const remainders = effective.map((w, i) => ({ i, r: (magnitude * w) % denominator }));
  let leftover = magnitude - shares.reduce((a, b) => a + b, 0n);
  remainders.sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  for (const { i } of remainders) {
    if (leftover === 0n) break;
    shares[i] = (shares[i] ?? 0n) + 1n;
    leftover -= 1n;
  }
  return shares.map((s) => toSafeNumber(s * sign));
}

/** Writes minor units as a plain decimal string with the currency's exponent, for example 1250 GBP as "12.50". */
export function toDecimalString(amount: number, currencyCode: string): string {
  assertMinor(amount);
  const { exponent } = currency(currencyCode);
  const negative = amount < 0;
  const digits = BigInt(Math.abs(amount))
    .toString()
    .padStart(exponent + 1, '0');
  const whole = exponent === 0 ? digits : digits.slice(0, -exponent);
  const fraction = exponent === 0 ? '' : `.${digits.slice(-exponent)}`;
  return `${negative ? '-' : ''}${whole}${fraction}`;
}

export interface FormatMoneyOptions {
  locale?: string;
  /** `symbol` (default) prints £12.50; `code` prints GBP 12.50; `none` prints 12.50. */
  display?: 'symbol' | 'code' | 'none';
}

/** Formats minor units for people to read. Exact: no floating point is involved. */
export function formatMoney(amount: number, currencyCode: string, options: FormatMoneyOptions = {}): string {
  const { exponent } = currency(currencyCode);
  const locale = options.locale ?? 'en-GB';
  const decimal = toDecimalString(amount, currencyCode);
  const display = options.display ?? 'symbol';
  const format = new Intl.NumberFormat(locale, {
    ...(display === 'none' ? { style: 'decimal' } : { style: 'currency', currency: currencyCode }),
    currencyDisplay: display === 'code' ? 'code' : 'narrowSymbol',
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
  // Intl formats numeric strings exactly (ECMA-402 NumberFormat v3).
  return format.format(decimal as unknown as number);
}

/**
 * Reads an amount typed by a person, such as "1,250.5" or "-3", into minor units.
 * Returns null when the text is not a number or has more decimals than the currency allows.
 */
export function parseMoney(input: string, currencyCode: string): number | null {
  const { exponent } = currency(currencyCode);
  const text = input.trim().replace(/[\s\u00a0]/g, '');
  const match = /^(-)?(\d{1,3}(?:,\d{3})+|\d+)?(?:\.(\d*))?$/.exec(text);
  if (!match || (match[2] === undefined && !match[3])) return null;
  const [, minus, wholeRaw = '0', fractionRaw = ''] = match;
  // Zeros past the currency's places change nothing ("100.00" in yen is 100); any other digit there is refused.
  if (/[^0]/.test(fractionRaw.slice(exponent))) return null;
  const fraction = fractionRaw.slice(0, exponent);
  const whole = wholeRaw.replace(/,/g, '');
  const minor = BigInt(whole) * 10n ** BigInt(exponent) + BigInt(fraction.padEnd(exponent, '0') || '0');
  try {
    return toSafeNumber(minus ? -minor : minor);
  } catch {
    return null;
  }
}
