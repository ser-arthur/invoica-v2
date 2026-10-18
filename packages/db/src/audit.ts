import { and, asc, eq, or, sql } from 'drizzle-orm';
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

/** What happened to a document, oldest first: drafted, issued, sent, payments, credits, voided. */
export async function documentActivity(tx: Tx, documentId: string) {
  return tx
    .select({ action: auditLog.action, at: auditLog.at, data: auditLog.data })
    .from(auditLog)
    .where(
      or(
        and(eq(auditLog.entity, 'document'), eq(auditLog.entityId, documentId)),
        and(eq(auditLog.entity, 'payment'), sql`${auditLog.data}->>'documentId' = ${documentId}`),
        and(eq(auditLog.entity, 'document'), sql`${auditLog.data}->>'invoiceId' = ${documentId}`),
      ),
    )
    .orderBy(asc(auditLog.at), asc(auditLog.id));
}
