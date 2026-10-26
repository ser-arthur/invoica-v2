import { describe, expect, it } from 'vitest';
import {
  applyEntitlements,
  currentPlan,
  entitlementsFor,
  INVOICA_COLOUR,
  isSignature,
  SIGNATURE_STYLES,
} from '../src/plans';
import { secondColour } from '../src/colours';

/** Acceptance criteria: docs/specs/plans.md. */

const now = new Date('2026-10-19T09:00:00Z');

describe('criterion 1: which plan', () => {
  it('is the trial until it ends, then free, unless subscribed', () => {
    expect(currentPlan({ trialEndsAt: new Date('2026-10-20T00:00:00Z'), subscription: null, now })).toBe(
      'trial',
    );
    expect(currentPlan({ trialEndsAt: new Date('2026-10-19T09:00:00Z'), subscription: null, now })).toBe(
      'free',
    );
    expect(currentPlan({ trialEndsAt: null, subscription: null, now })).toBe('free');
    expect(currentPlan({ trialEndsAt: null, subscription: 'pro', now })).toBe('pro');
    expect(currentPlan({ trialEndsAt: new Date('2026-11-01T00:00:00Z'), subscription: 'studio', now })).toBe(
      'studio',
    );
  });
});

describe('what each plan allows', () => {
  it('limits the free plan to three active clients, the Signature template and the mark, without reminders', () => {
    expect(entitlementsFor('free')).toEqual({
      activeClients: 3,
      ownTemplate: false,
      ownBrand: false,
      mark: true,
      reminders: false,
    });
    for (const plan of ['trial', 'pro', 'studio'] as const) {
      expect(entitlementsFor(plan)).toEqual({
        activeClients: null,
        ownTemplate: true,
        ownBrand: true,
        mark: false,
        reminders: true,
      });
    }
  });
});

describe('criteria 4 and 5: what a document shows', () => {
  const doc = {
    template: 'poster',
    seller: { brandColour: '#4338ca', logoFileId: 'logo-1', name: 'Field Office' },
  };

  it('on the free plan: Signature, Invoica colour and its second colour, no logo, and the mark', () => {
    expect(applyEntitlements(doc, entitlementsFor('free'))).toEqual({
      template: 'signature',
      seller: {
        brandColour: INVOICA_COLOUR,
        accentColour: secondColour(INVOICA_COLOUR),
        logoFileId: null,
        name: 'Field Office',
      },
      madeWithInvoica: true,
    });
  });

  it('on the free plan, a business’s own second colour gives way to Invoica’s (invoice templates, criterion 10)', () => {
    const own = { ...doc, seller: { ...doc.seller, accentColour: '#2b0b3f' } };
    expect(applyEntitlements(own, entitlementsFor('free')).seller.accentColour).toBe(
      secondColour(INVOICA_COLOUR),
    );
    expect(applyEntitlements(own, entitlementsFor('pro')).seller.accentColour).toBe('#2b0b3f');
  });

  it('on the free plan, a Signature style is kept and anything else becomes the Night head (invoice templates, criterion 20)', () => {
    for (const style of SIGNATURE_STYLES)
      expect(applyEntitlements({ ...doc, template: style }, entitlementsFor('free')).template).toBe(style);
    expect(SIGNATURE_STYLES).toEqual([
      'signature',
      'signature-light',
      'signature-route',
      'signature-route-dark',
    ]);
    expect(applyEntitlements({ ...doc, template: 'monochrome' }, entitlementsFor('free')).template).toBe(
      'signature',
    );
    expect(applyEntitlements({ ...doc, template: 'signature-x' }, entitlementsFor('free')).template).toBe(
      'signature',
    );
  });

  it('knows Signature by its styles only', () => {
    expect(SIGNATURE_STYLES.every(isSignature)).toBe(true);
    for (const other of ['monochrome', 'signatures', 'signature-x', 'studio', ''])
      expect(isSignature(other)).toBe(false);
  });

  it('on the trial: unchanged, without the mark', () => {
    expect(applyEntitlements(doc, entitlementsFor('trial'))).toEqual({ ...doc, madeWithInvoica: false });
  });
});
