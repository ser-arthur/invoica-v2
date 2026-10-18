import { DomainError } from './errors';

/** A calendar date with no time, written YYYY-MM-DD, in the organisation's time zone. */
export type BusinessDate = string;

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isBusinessDate(value: string): boolean {
  const m = PATTERN.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function assertBusinessDate(value: string, label = 'date'): BusinessDate {
  if (!isBusinessDate(value))
    throw new DomainError('date_invalid', `${label} must be a real date as YYYY-MM-DD.`);
  return value;
}

function toUtc(date: BusinessDate): Date {
  const m = PATTERN.exec(assertBusinessDate(date));
  return new Date(Date.UTC(Number(m![1]), Number(m![2]) - 1, Number(m![3])));
}

function fromUtc(d: Date): BusinessDate {
  return d.toISOString().slice(0, 10);
}

/** Today's date in a time zone, for example "Europe/London". */
export function todayIn(timeZone: string, now: Date = new Date()): BusinessDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: BusinessDate, days: number): BusinessDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Adds calendar months; the day is clamped to the end of a shorter month (31 January plus one month is 28 or 29 February). */
export function addMonths(date: BusinessDate, months: number): BusinessDate {
  const d = toUtc(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromUtc(target);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: BusinessDate, to: BusinessDate): number {
  return (toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000;
}

export function compareDates(a: BusinessDate, b: BusinessDate): -1 | 0 | 1 {
  assertBusinessDate(a);
  assertBusinessDate(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function monthKey(date: BusinessDate): string {
  return assertBusinessDate(date).slice(0, 7);
}

export type DateStyle = 'short' | 'medium' | 'long';

/** Formats a business date for people. The date is never shifted by a time zone. */
export function formatBusinessDate(
  date: BusinessDate,
  style: DateStyle = 'medium',
  locale = 'en-GB',
): string {
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : style === 'medium'
        ? { day: 'numeric', month: 'short', year: 'numeric' }
        : { day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(toUtc(date));
}
