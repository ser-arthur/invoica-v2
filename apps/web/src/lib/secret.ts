import { timingSafeEqual } from 'node:crypto';

/**
 * Whether an Authorization header carries `secret` as its bearer token. Compares bytes in constant time, and refuses
 * a missing secret, a missing header and a token of another length in bytes without throwing.
 */
export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
