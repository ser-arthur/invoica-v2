import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMINDER_OFFSETS,
  DEFAULT_REMINDER_WORDING,
  dueReminder,
  nextReminder,
  reminderEmail,
  reminderKind,
  unknownPlaceholders,
} from '../src/reminders';
import { entitlementsFor } from '../src/plans';

/** docs/specs/reminders.md: when reminders fall due, and what they say. */

const DUE = '2026-10-10';

describe('the schedule', () => {
  it('reminds three days before, on the day, and 7, 14 and 30 days after', () => {
    const sent: [string, number][] = [];
    for (let day = 1; day <= 50; day++) {
      const today = new Date(Date.UTC(2026, 9, day)).toISOString().slice(0, 10);
      const offset = dueReminder(DUE, DEFAULT_REMINDER_OFFSETS, today);
      if (offset !== null && !sent.some(([, o]) => o === offset)) sent.push([today, offset]);
    }
    expect(sent).toEqual([
      ['2026-10-07', -3],
      ['2026-10-10', 0],
      ['2026-10-17', 7],
      ['2026-10-24', 14],
      ['2026-11-09', 30],
    ]);
  });

  it('after missed days, only the latest reminder that fell due is sent', () => {
    // Nothing ran from 9 to 17 October: on the 18th only the seven-day reminder is due.
    expect(dueReminder(DUE, DEFAULT_REMINDER_OFFSETS, '2026-10-18')).toBe(7);
  });

  it('never catches up more than a week, so turning reminders on does not send old ones', () => {
    // The 30-day reminder falls on 9 November and is still sent up to six days later.
    expect(dueReminder(DUE, DEFAULT_REMINDER_OFFSETS, '2026-11-15')).toBe(30);
    expect(dueReminder(DUE, DEFAULT_REMINDER_OFFSETS, '2026-11-16')).toBeNull();
    expect(dueReminder(DUE, [7], '2026-10-01')).toBeNull();
  });

  it('only the offsets chosen are used', () => {
    expect(dueReminder(DUE, [14], '2026-10-17')).toBeNull();
    expect(dueReminder(DUE, [14], '2026-10-24')).toBe(14);
  });

  it('the next reminder is the first chosen offset from today not yet sent', () => {
    expect(nextReminder(DUE, DEFAULT_REMINDER_OFFSETS, '2026-10-08', [-3])).toEqual({
      offset: 0,
      date: '2026-10-10',
    });
    expect(nextReminder(DUE, DEFAULT_REMINDER_OFFSETS, '2026-10-10', [-3])).toEqual({
      offset: 0,
      date: '2026-10-10',
    });
    expect(nextReminder(DUE, DEFAULT_REMINDER_OFFSETS, '2026-11-10', [-3, 0, 7, 14, 30])).toBeNull();
  });

  it('the wording follows the day it is sent: a reminder caught up after its day reads as late', () => {
    expect(['2026-10-07', '2026-10-10', '2026-10-13'].map((d) => reminderKind(DUE, d))).toEqual([
      'before',
      'due',
      'late',
    ]);
  });

  it('a reminder whose day came before the invoice was issued is never due', () => {
    // Two days to pay: the "three days before" day had passed when it was issued.
    expect(dueReminder('2026-10-20', [-3, 0], '2026-10-18', '2026-10-18')).toBeNull();
    expect(dueReminder('2026-10-20', [-3, 0], '2026-10-20', '2026-10-18')).toBe(0);
    // Issued three days after its due date: the due-date reminder never goes, the 7-day one does.
    expect(dueReminder('2026-10-15', [0, 7], '2026-10-18', '2026-10-18')).toBeNull();
    expect(dueReminder('2026-10-15', [0, 7], '2026-10-22', '2026-10-18')).toBe(7);
    // On the day it is issued, a reminder for that same day still goes.
    expect(dueReminder('2026-10-18', [0], '2026-10-18', '2026-10-18')).toBe(0);
  });
});

describe('the email', () => {
  const base = {
    business: 'Harrow & Vale',
    client: 'Accounts payable',
    number: 'INV-0042',
    balance: 123_456,
    currency: 'GBP',
    locale: 'en-GB',
    dueDate: DUE,
    today: '2026-10-17',
  };

  it('before the due date, a gentle note with the amount owed now and the due date', () => {
    const e = reminderEmail({ ...base, kind: 'before', today: '2026-10-07' });
    expect(e.subject).toBe('Reminder: invoice INV-0042 is due on 10 October 2026');
    expect(e.text).toMatch(/^Hello Accounts payable,/);
    expect(e.text).toContain('£1,234.56');
    expect(e.text).toContain('Harrow & Vale');
  });

  it('on the day', () => {
    expect(reminderEmail({ ...base, kind: 'due', today: DUE }).subject).toBe('Invoice INV-0042 is due today');
  });

  it('late, it says how many days late, in words that read right for one day', () => {
    expect(reminderEmail({ ...base, kind: 'late' }).subject).toBe('Invoice INV-0042 is 7 days overdue');
    expect(reminderEmail({ ...base, kind: 'late', today: '2026-10-11' }).subject).toBe(
      'Invoice INV-0042 is 1 day overdue',
    );
  });

  it('the owner’s own wording fills in the same details', () => {
    const e = reminderEmail({
      ...base,
      kind: 'late',
      wording: { subject: '{number}: {amount} owed', body: 'Dear {client}, {days_late} late. {business}' },
    });
    expect(e).toEqual({
      subject: 'INV-0042: £1,234.56 owed',
      text: 'Dear Accounts payable, 7 days late. Harrow & Vale',
    });
  });

  it('follows the copy rules', () => {
    for (const kind of ['before', 'due', 'late'] as const) {
      const e = reminderEmail({ ...base, kind });
      expect(`${e.subject}\n${e.text}`).not.toMatch(new RegExp(String.fromCharCode(0x2014)));
    }
  });
});

describe('plans', () => {
  it('reminders are part of the paid plans and the trial, not the free plan', () => {
    expect(entitlementsFor('free').reminders).toBe(false);
    expect(entitlementsFor('trial').reminders).toBe(true);
    expect(entitlementsFor('pro').reminders).toBe(true);
  });
});

describe('rule 13: placeholders in the owner’s wording', () => {
  it('names each one Invoica cannot fill in, so a typo never reaches a client', () => {
    expect(unknownPlaceholders('Hello {client}, {amount} is owed on {number}.')).toEqual([]);
    expect(unknownPlaceholders('Invoice {number}: {amout} owed by {Client}, { amount }, {}')).toEqual([
      '{amout}',
      '{Client}',
      '{ amount }',
      '{}',
    ]);
    expect(unknownPlaceholders('{amout} and {amout} again')).toEqual(['{amout}']);
    for (const kind of ['before', 'due', 'late'] as const) {
      expect(unknownPlaceholders(DEFAULT_REMINDER_WORDING[kind].subject)).toEqual([]);
      expect(unknownPlaceholders(DEFAULT_REMINDER_WORDING[kind].body)).toEqual([]);
    }
  });
});
