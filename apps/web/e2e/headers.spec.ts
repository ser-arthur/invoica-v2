import { expect, test } from '@playwright/test';

test('pages carry a content security policy with a fresh nonce, and the other protective headers', async ({
  request,
}) => {
  const first = await request.get('/sign-in');
  const second = await request.get('/sign-in');
  const policy = first.headers()['content-security-policy'] ?? '';
  expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  for (const directive of [
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
  ]) {
    expect(policy).toContain(directive);
  }
  expect(second.headers()['content-security-policy']).not.toBe(policy);
  expect(first.headers()['permissions-policy']).toContain('camera=()');
  expect(first.headers()['x-content-type-options']).toBe('nosniff');
});
