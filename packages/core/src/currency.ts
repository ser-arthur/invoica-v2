import { DomainError } from './errors';

export interface CurrencyInfo {
  /** ISO 4217 alphabetic code. */
  code: string;
  /** Number of minor-unit digits, from ISO 4217. */
  exponent: number;
  name: string;
}

/** Currencies Invoica supports, with their ISO 4217 minor-unit exponent. */
const TABLE: Record<string, readonly [number, string]> = {
  GBP: [2, 'Pound sterling'],
  EUR: [2, 'Euro'],
  USD: [2, 'US dollar'],
  GHS: [2, 'Ghana cedi'],
  NGN: [2, 'Nigerian naira'],
  KES: [2, 'Kenyan shilling'],
  ZAR: [2, 'South African rand'],
  EGP: [2, 'Egyptian pound'],
  MAD: [2, 'Moroccan dirham'],
  TZS: [2, 'Tanzanian shilling'],
  XOF: [0, 'West African CFA franc'],
  XAF: [0, 'Central African CFA franc'],
  UGX: [0, 'Ugandan shilling'],
  RWF: [0, 'Rwandan franc'],
  CAD: [2, 'Canadian dollar'],
  AUD: [2, 'Australian dollar'],
  NZD: [2, 'New Zealand dollar'],
  CHF: [2, 'Swiss franc'],
  SEK: [2, 'Swedish krona'],
  NOK: [2, 'Norwegian krone'],
  DKK: [2, 'Danish krone'],
  PLN: [2, 'Polish zloty'],
  CZK: [2, 'Czech koruna'],
  AED: [2, 'UAE dirham'],
  SAR: [2, 'Saudi riyal'],
  INR: [2, 'Indian rupee'],
  SGD: [2, 'Singapore dollar'],
  HKD: [2, 'Hong Kong dollar'],
  CNY: [2, 'Chinese yuan'],
  JPY: [0, 'Japanese yen'],
  KRW: [0, 'South Korean won'],
  BRL: [2, 'Brazilian real'],
  MXN: [2, 'Mexican peso'],
  KWD: [3, 'Kuwaiti dinar'],
  BHD: [3, 'Bahraini dinar'],
  OMR: [3, 'Omani rial'],
  JOD: [3, 'Jordanian dinar'],
};

export const SUPPORTED_CURRENCIES: readonly CurrencyInfo[] = Object.entries(TABLE)
  .map(([code, [exponent, name]]) => ({ code, exponent, name }))
  .sort((a, b) => a.code.localeCompare(b.code));

export function isSupportedCurrency(code: string): boolean {
  return Object.hasOwn(TABLE, code);
}

export function currency(code: string): CurrencyInfo {
  const row = TABLE[code];
  if (!row) throw new DomainError('currency_unsupported', `Currency ${code} is not supported.`);
  return { code, exponent: row[0], name: row[1] };
}
