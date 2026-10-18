import { auditLog } from './schema';
import type { Tx } from './client';
import type { Actor } from './tenancy';

/** Appends an audit entry in the same transaction as the change it records. Never holds personal details. */
export async function audit(
  tx: Tx,
  actor: Actor,
  action: string,
  entity: string,
  entityId: string | null,
  data: Record<string, unknown> = {},
): Promise<void> {
  await tx.insert(auditLog).values({
    organisationId: actor.organisationId,
    actorUserId: actor.userId,
    action,
    entity,
    entityId,
    data,
  });
}
