import { describe, expect, it } from 'vitest';
import { isUuid } from './ids';
import { COUNTRIES, countryName } from './countries';
import { isSupportedCurrency, isValidTimeZone } from '@invoica/core';

describe('route ids', () => {
  it('accepts only UUIDs, so a bad link is a 404 and never a database error', () => {
    expect(isUuid('7f0c2c63-5b5e-4c4a-9d4e-111111111111')).toBe(true);
    expect(isUuid('1')).toBe(false);
    expect(isUuid("1' or '1'='1")).toBe(false);
  });
});

describe('countries offered at sign-up', () => {
  it('each starts with a supported currency and a real time zone', () => {
    for (const c of COUNTRIES) {
      expect(isSupportedCurrency(c.currency), c.code).toBe(true);
      expect(isValidTimeZone(c.timeZone), c.code).toBe(true);
    }
    expect(countryName('GH')).toBe('Ghana');
  });
});
