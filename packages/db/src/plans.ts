import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  DomainError,
  UNLIMITED,
  currentPlan,
  entitlementsFor,
  type Entitlements,
  type Plan,
} from '@invoica/core';
import type { Tx } from './client';
import { client, organisation } from './schema';
import type { Organisation } from './organisations';

/** Plans are enforced only when the deployment says so (docs/specs/plans.md). */
export function plansEnforced(): boolean {
  return process.env.INVOICA_PLANS === 'enforced';
}

/** The plan an organisation is on now. Billing is not built, so no organisation has a subscription. */
export function organisationPlan(org: Pick<Organisation, 'trialEndsAt'>, now: Date): Plan {
  return currentPlan({ trialEndsAt: org.trialEndsAt, subscription: null, now });
}

/** What the organisation's plan allows; everything while plans are not enforced. */
export function organisationEntitlements(org: Pick<Organisation, 'trialEndsAt'>, now: Date): Entitlements {
  return plansEnforced() ? entitlementsFor(organisationPlan(org, now)) : UNLIMITED;
}

/**
 * Refuses one more active client when the plan's limit is reached. The organisation row is locked, so two clients
 * added at the same moment cannot both take the last place.
 */
export async function assertRoomForClient(tx: Tx, organisationId: string, now: Date): Promise<void> {
  const [org] = await tx.select().from(organisation).where(eq(organisation.id, organisationId)).for('update');
  if (!org) throw new Error('Organisation not found.');
  const limit = organisationEntitlements(org, now).activeClients;
  if (limit === null) return;
  const [row] = await tx
    .select({ n: sql<string>`count(*)` })
    .from(client)
    .where(and(eq(client.organisationId, organisationId), isNull(client.archivedAt)));
  if (Number(row!.n) >= limit) {
    throw new DomainError(
      'plan_client_limit',
      'On the free plan you can have three active clients. Archive one to make room for another.',
    );
  }
}
