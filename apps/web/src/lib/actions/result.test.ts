import { describe, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import { DomainError } from '@invoica/core';
import { failure } from './result';

/** What a person reads when an action cannot do what was asked. */

const thrown = (fn: () => void) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected a throw.');
};

describe('failure', () => {
  it('passes a rule’s own message through, with its code for the page', () => {
    expect(
      failure(new DomainError('payment_exceeds_balance', 'The payment is more than the balance due.')),
    ).toEqual({
      ok: false,
      message: 'The payment is more than the balance due.',
      code: 'payment_exceeds_balance',
    });
  });

  it('says so when the person was signed out, and that nothing was saved', () => {
    const r = failure(thrown(() => redirect('/sign-in')));
    // Marked, so the page that asked keeps what was typed and does not reload itself into the sign-in page.
    expect(r).toEqual({
      ok: false,
      signedOut: true,
      message:
        'You have been signed out, so this was not saved. Sign in again in another tab, then come back here and try again.',
    });
  });

  // docs/specs/form-errors-and-controls.md, "In the app", criterion 6.
  const guard = (message: string) =>
    Object.assign(new Error('Failed query'), { cause: { code: 'P0001', message } });

  it('passes on a database guard written for people, as a sentence', () => {
    expect(failure(guard('The payment is more than the balance due'))).toEqual({
      ok: false,
      message: 'The payment is more than the balance due.',
    });
    expect(failure(guard('A payment cannot be dated after today.'))).toEqual({
      ok: false,
      message: 'A payment cannot be dated after today.',
    });
    expect(failure(guard('An issued document cannot be changed'))).toEqual({
      ok: false,
      message: 'This has been issued, so it can no longer be changed.',
    });
  });

  it('turns a database guard written for developers into the general message, and logs it', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const message of [
      'Cannot move a document from issued to draft',
      'payment is append-only',
      'Payments, refunds and documents are recorded only in read committed transactions',
      'A number counter moves one at a time',
    ]) {
      expect(failure(guard(message)), message).toEqual({
        ok: false,
        message: 'Something went wrong and nothing was saved. Try again.',
      });
    }
    expect(log).toHaveBeenCalledTimes(4);
    log.mockRestore();
  });

  it('anything else is a general message, logged without its data', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(failure(new Error('connection refused at 10.0.0.1'))).toMatchObject({ ok: false });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
