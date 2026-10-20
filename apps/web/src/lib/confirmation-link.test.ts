import { describe, expect, it } from 'vitest';
import { confirmationUrl, legacyConfirmationRedirect } from './confirmation-link';

/** docs/specs/sign-in-by-email.md, rule 1: every confirmation link opens the page that asks for the password. */
describe('confirmation links', () => {
  it('point at the page that asks for the password, with the token kept intact', () => {
    expect(confirmationUrl('https://app.example', 'a.b-c_d')).toBe(
      'https://app.example/confirm-email?token=a.b-c_d',
    );
    expect(confirmationUrl('https://app.example/', 'x+y/z=')).toBe(
      'https://app.example/confirm-email?token=x%2By%2Fz%3D',
    );
  });

  it('a link in the form sent before goes to the same page, so opening it confirms nothing', () => {
    expect(
      legacyConfirmationRedirect(
        new URL('https://app.example/api/auth/verify-email?token=abc.def&callbackURL=%2Fconfirm-email'),
      ),
    ).toBe('/confirm-email?token=abc.def');
    expect(legacyConfirmationRedirect(new URL('https://app.example/api/auth/verify-email'))).toBe(
      '/confirm-email',
    );
    expect(legacyConfirmationRedirect(new URL('https://app.example/api/auth/verify-email/'))).toBe(
      '/confirm-email',
    );
  });

  it('leaves every other sign-in request alone', () => {
    for (const path of ['/api/auth/get-session', '/api/auth/reset-password/xyz', '/api/auth/verify-emails'])
      expect(legacyConfirmationRedirect(new URL(`https://app.example${path}`))).toBeNull();
  });
});
