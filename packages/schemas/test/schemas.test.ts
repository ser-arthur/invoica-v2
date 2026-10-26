import { describe, expect, it } from 'vitest';
import {
  clientInput,
  draftInput,
  fieldErrors,
  onboardingInput,
  organisationProfileInput,
  reminderSettingsInput,
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

  it('takes both dates of a service period, or neither', () => {
    const base = {
      clientId: '7f0c2c63-5b5e-4c4a-9d4e-111111111111',
      currency: 'EUR',
      lineStyle: 'amount',
      pricesIncludeTax: false,
      template: 'receipt',
      lines: [{ title: 'Retainer', quantity: 1000, unitPrice: 50000 }],
    };
    const endOnly = draftInput.safeParse({ ...base, servicePeriodEnd: '2026-10-31' });
    expect(endOnly.success).toBe(false);
    if (!endOnly.success)
      expect(fieldErrors(endOnly.error).servicePeriodStart).toBe(
        'Enter both dates of the period, or neither.',
      );
    const startOnly = draftInput.safeParse({
      ...base,
      servicePeriodStart: '2026-10-01',
      servicePeriodEnd: '',
    });
    expect(startOnly.success).toBe(false);
    if (!startOnly.success)
      expect(fieldErrors(startOnly.error).servicePeriodEnd).toBe(
        'Enter both dates of the period, or neither.',
      );
    expect(
      draftInput.safeParse({ ...base, servicePeriodStart: '2026-10-01', servicePeriodEnd: '2026-10-31' })
        .success,
    ).toBe(true);
    expect(draftInput.safeParse({ ...base, servicePeriodStart: '', servicePeriodEnd: null }).success).toBe(
      true,
    );
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

  it('refuses reminder wording with a placeholder Invoica cannot fill in, naming it and the ones it can', () => {
    const r = reminderSettingsInput.safeParse({
      remindersEnabled: true,
      reminderOffsets: [7],
      reminderWording: {
        late: { subject: 'Invoice {number} is late', body: 'Hello {client}, {amout} is owed.' },
      },
    });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(fieldErrors(r.error)).toEqual({
        'reminderWording.late.body':
          'Invoica cannot fill in {amout}. Use {client}, {number}, {amount}, {due_date}, {days_late} or {business}.',
      });
  });

  it('takes a second colour or none, and one of four grounds for the logo (invoice templates, criterion 9)', () => {
    const ok = organisationProfileInput.shape.accentColour;
    expect(ok.parse('#2B0B3F')).toBe('#2b0b3f');
    expect(ok.parse(null)).toBeNull();
    expect(ok.parse('')).toBeNull();
    expect(ok.safeParse('navy').success).toBe(false);
    const ground = organisationProfileInput.shape.logoGround;
    expect(ground.parse('cream')).toBe('cream');
    expect(ground.parse(undefined)).toBe('white');
    expect(ground.safeParse('pink').success).toBe(false);
  });
});
