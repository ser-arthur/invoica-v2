/** Plans and what each allows (decision 0005, docs/specs/plans.md). */

export type Plan = 'trial' | 'free' | 'pro' | 'studio';
export type Subscription = 'pro' | 'studio';

/** Invoica's own emerald, used on documents of the free plan. */
export const INVOICA_COLOUR = '#17795a';

export interface Entitlements {
  /** How many clients may be active at once; null for no limit. */
  activeClients: number | null;
  /** Whether documents may use a template other than Signature. */
  ownTemplate: boolean;
  /** Whether documents carry the organisation's own logo and colour. */
  ownBrand: boolean;
  /** Whether documents show "Made with Invoica". */
  mark: boolean;
}

/** The plan an organisation is on: its subscription, else the trial until it ends, else free. */
export function currentPlan(args: {
  trialEndsAt: Date | null;
  subscription: Subscription | null;
  now: Date;
}): Plan {
  if (args.subscription) return args.subscription;
  if (args.trialEndsAt && args.now.getTime() < args.trialEndsAt.getTime()) return 'trial';
  return 'free';
}

export function entitlementsFor(plan: Plan): Entitlements {
  if (plan === 'free') return { activeClients: 3, ownTemplate: false, ownBrand: false, mark: true };
  return { activeClients: null, ownTemplate: true, ownBrand: true, mark: false };
}

/** Every plan's allowances: what an organisation has when plans are not enforced. */
export const UNLIMITED: Entitlements = entitlementsFor('pro');

/** A document as the plan allows it to look. */
export function applyEntitlements<
  T extends { template: string; seller: { brandColour: string; logoFileId: string | null } },
>(doc: T, e: Entitlements): T & { madeWithInvoica: boolean } {
  return {
    ...doc,
    template: e.ownTemplate ? doc.template : 'signature',
    seller: e.ownBrand ? doc.seller : { ...doc.seller, brandColour: INVOICA_COLOUR, logoFileId: null },
    madeWithInvoica: e.mark,
  };
}
