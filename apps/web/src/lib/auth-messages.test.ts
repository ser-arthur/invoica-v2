import { describe, expect, it } from 'vitest';
import { AUTH_WORDS, authAnswer, checkAuthFields } from './auth-messages';
import { UNREACHABLE } from './reach';

// docs/specs/form-errors-and-controls.md, "Sign in, create account and the password pages", criterion 6.

describe('checkAuthFields', () => {
  it('asks for every field of create account when it is sent empty', () => {
    expect(checkAuthFields('sign-up', { name: ' ', email: '', password: '' })).toEqual({
      name: 'Enter your name.',
      email: 'Enter your email address.',
      password: 'Enter your password.',
    });
  });

  it('asks for the whole email address', () => {
    for (const email of ['not-an-email', 'name@', '@place.com', 'name@place', 'two words@place.com']) {
      expect(checkAuthFields('email', { email }).email, email).toBe(
        'Enter the whole email address, with the @ and the part after it.',
      );
    }
    expect(checkAuthFields('email', { email: 'jo.bloggs+work@studio.co.uk' })).toEqual({});
  });

  it('holds a new password to 10 to 128 characters, and only asks for one when signing in', () => {
    expect(checkAuthFields('new-password', { password: 'short' }).password).toBe(
      'Use at least 10 characters.',
    );
    expect(
      checkAuthFields('sign-up', { name: 'Jo', email: 'jo@studio.co.uk', password: 'x'.repeat(129) }),
    ).toEqual({
      password: 'Use 128 characters or fewer.',
    });
    expect(checkAuthFields('new-password', { password: 'x'.repeat(10) })).toEqual({});
    expect(checkAuthFields('sign-in', { email: 'jo@studio.co.uk', password: 'short' })).toEqual({});
    expect(checkAuthFields('sign-in', { email: 'jo@studio.co.uk', password: '' })).toEqual({
      password: 'Enter your password.',
    });
  });
});

describe('authAnswer', () => {
  const words = (error: Parameters<typeof authAnswer>[0]) => authAnswer(error);

  it('says an email and password do not match however the service puts it', () => {
    for (const code of [
      'INVALID_EMAIL_OR_PASSWORD',
      'INVALID_PASSWORD',
      'USER_NOT_FOUND',
      'CREDENTIAL_ACCOUNT_NOT_FOUND',
    ])
      expect(words({ status: 401, code, message: 'Invalid email or password' })).toEqual({
        form: 'That email and password do not match an account.',
      });
    expect(words({ status: 401 })).toEqual({ form: AUTH_WORDS.mismatch });
  });

  it('puts a refused email or password under its field', () => {
    expect(words({ status: 400, code: 'INVALID_EMAIL', message: 'Invalid email' })).toEqual({
      field: 'email',
      message: AUTH_WORDS.emailShape,
    });
    expect(
      words({ status: 400, code: 'VALIDATION_ERROR', message: '[body.email] Invalid email address' }),
    ).toEqual({
      field: 'email',
      message: AUTH_WORDS.emailShape,
    });
    expect(words({ status: 400, code: 'PASSWORD_TOO_SHORT', message: 'Password too short' })).toEqual({
      field: 'password',
      message: 'Use at least 10 characters.',
    });
    expect(words({ status: 400, code: 'PASSWORD_TOO_LONG', message: 'Password too long' })).toEqual({
      field: 'password',
      message: 'Use 128 characters or fewer.',
    });
  });

  it('names an address not confirmed, too many tries and no answer in its own words', () => {
    expect(words({ status: 403, code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' })).toEqual({
      form: 'Confirm your email address first. We have sent you a new link.',
    });
    expect(words({ status: 429, message: 'Too many requests. Please try again later.' })).toEqual({
      form: 'Too many attempts. Wait a minute, then try again.',
    });
    expect(words({ status: 0, code: 'UNREACHABLE', message: UNREACHABLE })).toEqual({ form: UNREACHABLE });
  });

  it('never passes on the service’s own words', () => {
    const answers = [
      { status: 403, code: 'INVALID_ORIGIN', message: 'Invalid origin' },
      { status: 400, code: 'VALIDATION_ERROR', message: '[body.callbackURL] Invalid url' },
      { status: 500, code: 'FAILED_TO_CREATE_USER', message: 'Failed to create user' },
      { status: 500, message: 'Internal Server Error' },
      { status: 400, code: 'SOMETHING_NEW', message: 'A new kind of error' },
      {},
    ];
    for (const answer of answers) {
      expect(words(answer), JSON.stringify(answer)).toEqual({
        form: 'Something went wrong at our end. Try again in a moment.',
      });
    }
  });
});
