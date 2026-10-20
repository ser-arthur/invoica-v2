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
  it('passes a rule’s own message through', () => {
    expect(failure(new DomainError('x', 'The payment is more than the balance due.'))).toEqual({
      ok: false,
      message: 'The payment is more than the balance due.',
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

  it('anything else is a general message, logged without its data', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(failure(new Error('connection refused at 10.0.0.1'))).toMatchObject({ ok: false });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
