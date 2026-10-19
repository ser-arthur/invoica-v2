import { describe, expect, it } from 'vitest';
import { bearerMatches } from './secret';

describe('bearerMatches', () => {
  it('accepts the secret as a bearer token, and nothing else', () => {
    expect(bearerMatches('Bearer s3cret-value', 's3cret-value')).toBe(true);
    expect(bearerMatches('Bearer s3cret-valuX', 's3cret-value')).toBe(false);
    expect(bearerMatches('s3cret-value', 's3cret-value')).toBe(false);
    expect(bearerMatches(null, 's3cret-value')).toBe(false);
    expect(bearerMatches('Bearer ', '')).toBe(false);
    expect(bearerMatches('Bearer anything', undefined)).toBe(false);
  });

  it('refuses a value of the same length in characters and another length in bytes, without throwing (review 6, R6-L4)', () => {
    expect(bearerMatches(`Bearer ${'é'.repeat(12)}`, 's3cret-value')).toBe(false);
  });
});
