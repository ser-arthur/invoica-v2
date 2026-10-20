import { describe, expect, it } from 'vitest';
import { signJWT } from 'better-auth/crypto';
import { confirmationAddress, confirmationUrl, legacyConfirmationRedirect } from './confirmation-link';

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

describe('confirmation tokens', () => {
  const secret = 'a test secret that is long enough to sign with';

  it('give the address of a token signed with the secret, in lower case', async () => {
    const token = await signJWT({ email: 'Owner@Example.test' }, secret, 60);
    expect(await confirmationAddress(token, secret)).toBe('owner@example.test');
  });

  it('refuse a token that has expired, was signed with another secret, would change an address, or is no token', async () => {
    const refused = [
      await signJWT({ email: 'owner@example.test' }, secret, -60),
      await signJWT({ email: 'owner@example.test' }, 'another secret that is long enough to sign with', 60),
      await signJWT({ email: 'owner@example.test', updateTo: 'other@example.test' }, secret, 60),
      await signJWT({ email: 'owner@example.test', updateTo: null }, secret, 60),
      await signJWT({ email: 'not an address' }, secret, 60),
      await signJWT({}, secret, 60),
      'not-a-token',
      '',
    ];
    for (const token of refused) expect(await confirmationAddress(token, secret)).toBeNull();
  });
});
