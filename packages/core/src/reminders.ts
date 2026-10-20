import { addDays, daysBetween, formatBusinessDate, type BusinessDate } from './dates';
import { formatMoney } from './money';

/**
 * Reminders about unpaid invoices (docs/specs/reminders.md). An offset is a number of days from the due date:
 * negative before it, zero on the day, positive after.
 */

export const REMINDER_OFFSETS = [-3, 0, 7, 14, 30] as const;
export const DEFAULT_REMINDER_OFFSETS: readonly number[] = REMINDER_OFFSETS;

/** A missed reminder is still sent for this many days; older ones are skipped, so nothing goes out in a backlog. */
export const REMINDER_CATCH_UP_DAYS = 7;

export type ReminderKind = 'before' | 'due' | 'late';

/** Which wording a reminder sent on `today` uses: by the day it is sent, so one caught up late reads as late. */
export function reminderKind(dueDate: BusinessDate, today: BusinessDate): ReminderKind {
  return today < dueDate ? 'before' : today === dueDate ? 'due' : 'late';
}

/**
 * The scheduled reminder due on `today`: the latest chosen offset whose date is today or in the week before, and
 * not before the day the invoice was issued. A reminder is sent once per offset, so repeating the question on a
 * later day finds the one already sent.
 */
export function dueReminder(
  dueDate: BusinessDate,
  offsets: readonly number[],
  today: BusinessDate,
  issuedOn: BusinessDate = '0000-01-01',
): number | null {
  const due = offsets
    .filter((o) => {
      const date = addDays(dueDate, o);
      return date <= today && date >= issuedOn && daysBetween(date, today) < REMINDER_CATCH_UP_DAYS;
    })
    .sort((a, b) => b - a);
  return due[0] ?? null;
}

/** The next reminder to go: the first chosen offset from today on that has not been sent. */
export function nextReminder(
  dueDate: BusinessDate,
  offsets: readonly number[],
  today: BusinessDate,
  sent: readonly number[],
): { offset: number; date: BusinessDate } | null {
  const next = [...offsets]
    .sort((a, b) => a - b)
    .find((o) => addDays(dueDate, o) >= today && !sent.includes(o));
  return next === undefined ? null : { offset: next, date: addDays(dueDate, next) };
}

export interface ReminderWording {
  subject: string;
  body: string;
}

/** What Invoica fills in, in the owner's wording as in the default (docs/specs/reminders.md, rule 13). */
export const REMINDER_PLACEHOLDERS = [
  'client',
  'number',
  'amount',
  'due_date',
  'days_late',
  'business',
] as const;

/** Each placeholder in `text`, written once, that Invoica cannot fill in: anything in braces that is not one of them. */
export function unknownPlaceholders(text: string): string[] {
  const known = new Set<string>(REMINDER_PLACEHOLDERS);
  const found = [...text.matchAll(/\{([^{}]*)\}/g)].filter((m) => !known.has(m[1]!)).map((m) => m[0]);
  return [...new Set(found)];
}

/** The default wording of each kind. The owner can replace it; the same placeholders are filled in. */
export const DEFAULT_REMINDER_WORDING: Record<ReminderKind, ReminderWording> = {
  before: {
    subject: 'Reminder: invoice {number} is due on {due_date}',
    body: [
      'Hello {client},',
      '',
      'A reminder that invoice {number} for {amount} is due on {due_date}. The invoice is attached.',
      '',
      'If you have already paid, thank you, and please ignore this email.',
      '',
      '{business}',
    ].join('\n'),
  },
  due: {
    subject: 'Invoice {number} is due today',
    body: [
      'Hello {client},',
      '',
      'Invoice {number} for {amount} is due today. The invoice is attached.',
      '',
      'If you have already paid, thank you, and please ignore this email.',
      '',
      '{business}',
    ].join('\n'),
  },
  late: {
    subject: 'Invoice {number} is {days_late} overdue',
    body: [
      'Hello {client},',
      '',
      'Invoice {number} was due on {due_date}, and {amount} is still owed, {days_late} later. The invoice is attached.',
      '',
      'Please let us know when to expect payment, or reply if something on the invoice needs looking at.',
      '',
      '{business}',
    ].join('\n'),
  },
};

/** The reminder email for an invoice: its wording with the business, client, number, amount owed and dates. */
export function reminderEmail(args: {
  kind: ReminderKind;
  wording?: ReminderWording | null;
  business: string;
  client: string;
  number: string;
  /** What is owed when the email is sent. */
  balance: number;
  currency: string;
  locale: string;
  dueDate: BusinessDate;
  today: BusinessDate;
}): { subject: string; text: string } {
  const wording = args.wording ?? DEFAULT_REMINDER_WORDING[args.kind];
  const late = Math.max(daysBetween(args.dueDate, args.today), 0);
  const values: Record<string, string> = {
    business: args.business,
    client: args.client,
    number: args.number,
    amount: formatMoney(args.balance, args.currency, { locale: args.locale }),
    due_date: formatBusinessDate(args.dueDate, 'long', args.locale),
    days_late: `${late} ${late === 1 ? 'day' : 'days'}`,
  };
  const fill = (text: string) => text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
  return { subject: fill(wording.subject), text: fill(wording.body) };
}
