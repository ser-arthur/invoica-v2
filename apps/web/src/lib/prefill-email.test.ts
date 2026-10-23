import { describe, expect, it } from 'vitest';
import { prefillEmail } from './prefill-email';

describe('prefillEmail', () => {
  it('passes a plausible address through, trimmed', () => {
    expect(prefillEmail('  owner@lindenrowe.example ')).toBe('owner@lindenrowe.example');
    expect(prefillEmail('a.b+invoices@studio.co.uk')).toBe('a.b+invoices@studio.co.uk');
  });

  it('ignores anything that is not one plausible address', () => {
    for (const value of [
      '',
      '   ',
      'not an email',
      'owner@',
      '@lindenrowe.example',
      'owner@lindenrowe',
      'owner@@lindenrowe.example',
      'owner@linden rowe.example',
      'owner@lindenrowe.',
    ]) {
      expect(prefillEmail(value), value).toBe('');
    }
  });

  it('ignores an address longer than 254 characters', () => {
    const long = `${'a'.repeat(250)}@x.co`;
    expect(long.length).toBeGreaterThan(254);
    expect(prefillEmail(long)).toBe('');
    const domain = '@lindenrowe.example';
    const fits = `${'a'.repeat(254 - domain.length)}${domain}`;
    expect(fits.length).toBe(254);
    expect(prefillEmail(fits)).toBe(fits);
  });

  it('ignores a missing value and repeated parameters', () => {
    expect(prefillEmail(undefined)).toBe('');
    expect(prefillEmail(['owner@lindenrowe.example', 'other@lindenrowe.example'])).toBe('');
  });
});
