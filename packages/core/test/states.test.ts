import { describe, expect, it } from 'vitest';
import {
  checkPayment,
  deriveState,
  isOverdue,
  transition,
  type DocumentEvent,
  type Lifecycle,
} from '../src/states';

describe('lifecycle transitions', () => {
  const allowed: [Lifecycle, DocumentEvent, Lifecycle][] = [
    ['draft', 'issue', 'issued'],
    ['issued', 'mark_sent', 'sent'],
    ['sent', 'mark_sent', 'sent'],
    ['issued', 'void', 'void'],
    ['sent', 'void', 'void'],
  ];
  it.each(allowed)('%s + %s is %s', (from, event, to) => {
    expect(transition(from, event, { paid: 0 })).toBe(to);
  });

  const refused: [Lifecycle, DocumentEvent][] = [
    ['draft', 'mark_sent'],
    ['draft', 'void'],
    ['issued', 'issue'],
    ['sent', 'issue'],
    ['void', 'issue'],
    ['void', 'mark_sent'],
    ['void', 'void'],
  ];
  it.each(refused)('%s + %s is refused', (from, event) => {
    expect(() => transition(from, event, { paid: 0 })).toThrow();
  });

  it('refuses to void a document with payments', () => {
    expect(() => transition('issued', 'void', { paid: 100 })).toThrow(/payments recorded/);
  });
});

describe('derived state', () => {
  it('derives part paid and paid from payments', () => {
    expect(deriveState({ lifecycle: 'sent', total: 1000, paid: 0 })).toBe('sent');
    expect(deriveState({ lifecycle: 'sent', total: 1000, paid: 400 })).toBe('part_paid');
    expect(deriveState({ lifecycle: 'issued', total: 1000, paid: 1000 })).toBe('paid');
    expect(deriveState({ lifecycle: 'draft', total: 1000, paid: 0 })).toBe('draft');
    expect(deriveState({ lifecycle: 'void', total: 1000, paid: 0 })).toBe('void');
  });
});

describe('payments', () => {
  it('accepts a payment up to the balance on an issued document', () => {
    expect(() => checkPayment('sent', 1000, 1000)).not.toThrow();
    expect(() => checkPayment('sent', 1000, 1001)).toThrow(/more than the balance/);
    expect(() => checkPayment('draft', 1000, 10)).toThrow();
    expect(() => checkPayment('void', 1000, 10)).toThrow();
    expect(() => checkPayment('sent', 1000, 0)).toThrow();
  });
});

describe('overdue', () => {
  const base = { lifecycle: 'sent' as Lifecycle, balance: 100, dueDate: '2026-10-17', today: '2026-10-18' };
  it('is overdue the day after the due date', () => expect(isOverdue(base)).toBe(true));
  it('is not overdue on the due date', () =>
    expect(isOverdue({ ...base, dueDate: '2026-10-18' })).toBe(false));
  it('is not overdue once paid', () => expect(isOverdue({ ...base, balance: 0 })).toBe(false));
  it('is not overdue when void or draft', () => {
    expect(isOverdue({ ...base, lifecycle: 'void' })).toBe(false);
    expect(isOverdue({ ...base, lifecycle: 'draft' })).toBe(false);
  });
  it('counts issued documents, unlike the old app which only counted sent ones', () =>
    expect(isOverdue({ ...base, lifecycle: 'issued' })).toBe(true));
});
