import { describe, expect, it } from 'vitest';
import {
  clientInput,
  draftInput,
  fieldErrors,
  onboardingInput,
  organisationProfileInput,
} from '../src/index';

describe('schemas', () => {
  it('trims text and turns empty optional fields into null', () => {
    const r = clientInput.parse({ name: '  Acme Ltd ', email: '', countryCode: 'gb', currency: '' });
    expect(r).toMatchObject({ name: 'Acme Ltd', email: null, countryCode: 'GB', currency: null, fields: [] });
  });

  it('refuses unsupported currencies, bad emails and fractional amounts', () => {
    const r = clientInput.safeParse({ name: 'A', email: 'not-an-email', currency: 'XYZ' });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(['currency', 'email']);
  });

  it('checks dates and their order on a draft', () => {
    const base = {
      clientId: '7f0c2c63-5b5e-4c4a-9d4e-111111111111',
      currency: 'GBP',
      lineStyle: 'amount',
      pricesIncludeTax: false,
      template: 'receipt',
      lines: [{ title: 'Design', quantity: 1000, unitPrice: 50000 }],
    };
    expect(draftInput.safeParse({ ...base, issueDate: '2026-10-18', dueDate: '2026-11-17' }).success).toBe(
      true,
    );
    const bad = draftInput.safeParse({ ...base, issueDate: '2026-10-18', dueDate: '2026-10-01' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(fieldErrors(bad.error).dueDate).toMatch(/before the issue date/);
    expect(draftInput.safeParse({ ...base, issueDate: '2026-02-30' }).success).toBe(false);
    expect(
      draftInput.safeParse({ ...base, lines: [{ title: 'x', quantity: 1.5, unitPrice: 1 }] }).success,
    ).toBe(false);
  });

  it('validates onboarding and the profile', () => {
    expect(
      onboardingInput.safeParse({
        name: 'Field Office',
        businessType: 'sole_trader',
        countryCode: 'GB',
        baseCurrency: 'GBP',
        timeZone: 'Europe/London',
        taxRegistered: false,
      }).success,
    ).toBe(true);
    const r = organisationProfileInput.safeParse({ invoicePrefix: 'INV <x>' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).invoicePrefix).toMatch(/letters, digits/);
  });
});
