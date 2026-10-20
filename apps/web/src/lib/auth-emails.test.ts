import { describe, expect, it } from 'vitest';
import {
  existingAccountEmail,
  passwordChangedEmail,
  resetPasswordEmail,
  verificationEmail,
} from './auth-emails';

const BANNED = [new RegExp(String.fromCharCode(0x2014)), /\brather than\b/i, /\bnot just\b/i];

describe('sign-in emails', () => {
  const emails = [
    verificationEmail({ url: 'https://app.example/api/auth/verify-email?token=abc' }),
    resetPasswordEmail({ name: 'Ama Owusu', url: 'https://app.example/api/auth/reset-password/xyz' }),
    existingAccountEmail({ name: 'Ama Owusu', appUrl: 'https://app.example' }),
    passwordChangedEmail({ name: 'Ama Owusu', appUrl: 'https://app.example' }),
  ];

  it('greet the person by name and follow the copy rules', () => {
    for (const email of emails.slice(1)) expect(email.text).toMatch(/^Hello Ama Owusu,/);
    for (const email of emails) {
      for (const rule of BANNED) expect(`${email.subject}\n${email.text}`).not.toMatch(rule);
    }
  });

  it('the confirmation email carries no name: whoever signed up chose it, and the address is not yet confirmed', () => {
    expect(emails[0]!.text).toMatch(/^Hello,\n/);
  });

  it('the confirmation email carries its link and says how long it works', () => {
    const [verify] = emails;
    expect(verify!.subject).toBe('Confirm your email for Invoica');
    expect(verify!.text).toContain('https://app.example/api/auth/verify-email?token=abc');
    expect(verify!.text).toContain('24 hours');
  });

  it('the reset email carries its link, says it works once for an hour, and what to do if unasked', () => {
    const reset = emails[1]!;
    expect(reset.subject).toBe('Reset your Invoica password');
    expect(reset.text).toContain('https://app.example/api/auth/reset-password/xyz');
    expect(reset.text).toMatch(/one hour/);
    expect(reset.text).toMatch(/once/);
    expect(reset.text).toMatch(/did not ask/);
  });

  it('the existing-account email links to sign in and to reset the password', () => {
    const existing = emails[2]!;
    expect(existing.subject).toBe('You already have an Invoica account');
    expect(existing.text).toContain('https://app.example/sign-in');
    expect(existing.text).toContain('https://app.example/forgot-password');
  });

  it('the password-changed email says what to do if it was not them', () => {
    const changed = emails[3]!;
    expect(changed.subject).toBe('Your Invoica password was changed');
    expect(changed.text).toContain('https://app.example/forgot-password');
  });

  it('a name that is only an email address is not repeated as a greeting', () => {
    expect(resetPasswordEmail({ name: 'ama@example.com', url: 'https://x' }).text).toMatch(/^Hello,/);
  });
});
