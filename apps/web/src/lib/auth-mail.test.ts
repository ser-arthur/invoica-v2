import { describe, expect, it, vi } from 'vitest';

/** Sign-in emails go out after the answer, so how long a request takes says nothing about the account. */

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({
  after: () => {
    throw new Error('outside a request');
  },
}));
let finish: () => void = () => {};
const send = vi.fn(() => new Promise<void>((done) => (finish = done)));
vi.mock('./email', () => ({
  EMAIL_FROM: () => 'Invoica <hello@invoica.example>',
  getEmailAdapter: () => ({ send }),
}));

describe('sendLater', () => {
  it('returns before the provider has answered, and the email still goes', async () => {
    const { sendLater } = await import('./auth-mail');
    const result = sendLater('ama@example.com', {
      subject: 'Confirm your email for Invoica',
      text: 'Hello,',
    });
    expect(result).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
    finish();
  });
});
