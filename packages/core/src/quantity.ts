import { DomainError } from './errors';
import { assertMinor, divRound, toSafeNumber, type RoundingMode } from './money';

/** Quantities are stored as whole thousandths: 1.5 hours is 1500. */
export const QUANTITY_SCALE = 1000;

export const MAX_QUANTITY = 1_000_000_000 * QUANTITY_SCALE;
export const MAX_UNIT_PRICE = 1_000_000_000_000;

/** Reads a quantity typed by a person ("1.5", "2", "0.125") into thousandths. Null when invalid. */
export function parseQuantity(input: string): number | null {
  const match = /^(\d{1,3}(?:,\d{3})+|\d+)?(?:\.(\d{0,3}))?$/.exec(input.trim());
  if (!match || (match[1] === undefined && !match[2])) return null;
  const whole = BigInt((match[1] ?? '0').replace(/,/g, ''));
  const fraction = BigInt((match[2] ?? '').padEnd(3, '0'));
  const value = whole * 1000n + fraction;
  if (value > BigInt(MAX_QUANTITY)) return null;
  return Number(value);
}

/** Writes thousandths as a plain decimal with no trailing zeros: 1500 is "1.5". */
export function quantityToString(quantity: number): string {
  assertMinor(quantity, 'quantity');
  const whole = Math.trunc(quantity / QUANTITY_SCALE);
  const fraction = Math.abs(quantity % QUANTITY_SCALE)
    .toString()
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

export function formatQuantity(quantity: number, locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(
    quantityToString(quantity) as unknown as number,
  );
}

export function assertLine(quantity: number, unitPrice: number): void {
  assertMinor(quantity, 'quantity');
  assertMinor(unitPrice, 'unit price');
  if (quantity <= 0) throw new DomainError('quantity_not_positive', 'Quantity must be more than zero.');
  if (quantity > MAX_QUANTITY) throw new DomainError('quantity_too_large', 'Quantity is too large.');
  if (unitPrice < 0) throw new DomainError('unit_price_negative', 'Unit price must not be negative.');
  if (unitPrice > MAX_UNIT_PRICE) throw new DomainError('unit_price_too_large', 'Unit price is too large.');
}

/** A line's amount: quantity times unit price, rounded once to minor units. */
export function lineAmount(quantity: number, unitPrice: number, mode: RoundingMode): number {
  assertLine(quantity, unitPrice);
  return toSafeNumber(
    divRound(BigInt(quantity) * BigInt(unitPrice), BigInt(QUANTITY_SCALE), mode),
    'line amount',
  );
}
