/**
 * Calendar dates (`YYYY-MM-DD`) as people type and read them in a date field, and the calendar's month
 * (docs/specs/form-errors-and-controls.md, "Dates"). Dates only: no times and no time zones, so a day is never moved.
 */

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export const isoOf = (y: number, m: number, d: number) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;

export function partsOf(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y!, m!, d!];
}

export const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function real(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2999 || m < 1 || m > 12 || d < 1 || d > daysIn(y, m)) return null;
  return isoOf(y, m, d);
}

function monthNumber(word: string): number | null {
  const w = word.toLowerCase().replace(/\.$/, '');
  if (w.length < 3) return null;
  const at = MONTH_NAMES.findIndex((name) => name.toLowerCase().startsWith(w));
  return at === -1 ? null : at + 1;
}

const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

/** Reads a typed date, day first as in the UK, or as `YYYY-MM-DD`; null when it is not a real date. */
export function readTypedDate(typed: string): string | null {
  const text = typed.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (m) return real(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2}) ?[/.-] ?(\d{1,2}) ?[/.-] ?(\d{4}|\d{2})$/.exec(text);
  if (m) return real(fullYear(m[3]!), Number(m[2]), Number(m[1]));
  // "31 Dec 2026", "31st December 2026", "Thursday 31 December 2026"
  m = /^(?:[a-z]+,? )?(\d{1,2})(?:st|nd|rd|th)? ([a-z]+\.?),? (\d{4})$/i.exec(text);
  if (m) {
    const month = monthNumber(m[2]!);
    return month ? real(Number(m[3]), month, Number(m[1])) : null;
  }
  return null;
}

/** A calendar date as the field shows it: "31 Dec 2026". */
export function showDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = partsOf(iso);
  return `${d} ${SHORT[m - 1]} ${y}`;
}

/** A calendar date in full, for screen readers: "Thursday 31 December 2026". */
export function sayDate(iso: string): string {
  const [y, m, d] = partsOf(iso);
  return `${DAY_NAMES[weekday(iso)]} ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** 0 for Monday to 6 for Sunday. */
export function weekday(iso: string): number {
  const [y, m, d] = partsOf(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = partsOf(iso);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** The same day of another month, or that month's last day when it is shorter. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = partsOf(iso);
  const index = y * 12 + (m - 1) + months;
  const ny = Math.floor(index / 12);
  const nm = index - ny * 12 + 1;
  return isoOf(ny, nm, Math.min(d, daysIn(ny, nm)));
}

/** A month's weeks, Monday first, filled out with the days of the months either side. */
export function monthGrid(year: number, month: number): string[][] {
  const first = isoOf(year, month, 1);
  let day = addDays(first, -weekday(first));
  const last = isoOf(year, month, daysIn(year, month));
  const weeks: string[][] = [];
  while (weeks.length === 0 || day <= last) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}
