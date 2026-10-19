import { describe, expect, it } from 'vitest';
import { applyEntitlements, currentPlan, entitlementsFor, INVOICA_COLOUR } from '../src/plans';

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
  it('limits the free plan to three active clients, the Signature template and the mark', () => {
    expect(entitlementsFor('free')).toEqual({
      activeClients: 3,
      ownTemplate: false,
      ownBrand: false,
      mark: true,
    });
    for (const plan of ['trial', 'pro', 'studio'] as const) {
      expect(entitlementsFor(plan)).toEqual({
        activeClients: null,
        ownTemplate: true,
        ownBrand: true,
        mark: false,
      });
    }
  });
});

describe('criteria 4 and 5: what a document shows', () => {
  const doc = {
    template: 'poster',
    seller: { brandColour: '#4338ca', logoFileId: 'logo-1', name: 'Field Office' },
  };

  it('on the free plan: Signature, Invoica colour, no logo, and the mark', () => {
    expect(applyEntitlements(doc, entitlementsFor('free'))).toEqual({
      template: 'signature',
      seller: { brandColour: INVOICA_COLOUR, logoFileId: null, name: 'Field Office' },
      madeWithInvoica: true,
    });
  });

  it('on the trial: unchanged, without the mark', () => {
    expect(applyEntitlements(doc, entitlementsFor('trial'))).toEqual({ ...doc, madeWithInvoica: false });
  });
});
