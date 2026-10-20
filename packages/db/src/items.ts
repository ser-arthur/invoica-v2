import { and, asc, eq, ilike, isNull, sql } from 'drizzle-orm';
import { DomainError } from '@invoica/core';
import type { ItemInput } from '@invoica/schemas';
import type { Tx } from './client';
import { item } from './schema';
import { audit } from './audit';
import { CHANGED_ELSEWHERE, itemVersion, saveAgainst } from './versions';
import { fingerprint } from './fingerprint';
import type { Actor } from './tenancy';

export type ItemRow = typeof item.$inferSelect;

export async function listItems(tx: Tx, options: { search?: string } = {}): Promise<ItemRow[]> {
  const conditions = [isNull(item.archivedAt)];
  const term = options.search?.trim();
  if (term) conditions.push(ilike(item.name, `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`));
  return tx
    .select()
    .from(item)
    .where(and(...conditions))
    .orderBy(asc(item.name));
}

/** Makes a saved item. A repeated request key behaves as for clients (`createClient`). */
export async function createItem(tx: Tx, actor: Actor, input: ItemInput): Promise<string> {
  const { idempotencyKey, ...values } = input;
  const key = idempotencyKey ?? null;
  const digest = fingerprint(values);
  const repeat = async () => {
    if (!key) return undefined;
    const [row] = await tx
      .select({
        id: item.id,
        requestFingerprint: item.requestFingerprint,
        changed: sql<boolean>`${item.updatedAt} <> ${item.createdAt}`,
      })
      .from(item)
      .where(eq(item.idempotencyKey, key));
    if (!row) return undefined;
    // A correction is applied only to the record as its first request made it: an edit made since, or a correction
    // already applied, is never replaced by an older request arriving late.
    if (row.requestFingerprint !== digest && !row.changed) {
      await updateItem(tx, actor, row.id, input);
      await tx.update(item).set({ requestFingerprint: digest }).where(eq(item.id, row.id));
    }
    return row.id;
  };
  const earlier = await repeat();
  if (earlier) return earlier;
  const [row] = await tx
    .insert(item)
    .values({
      organisationId: actor.organisationId,
      ...values,
      idempotencyKey: key,
      requestFingerprint: key ? digest : null,
    })
    .onConflictDoNothing({
      target: [item.organisationId, item.idempotencyKey],
      where: sql`${item.idempotencyKey} is not null`,
    })
    .returning({ id: item.id });
  // Saved at the same moment by another request with the same key: that one is the item.
  if (!row) return (await repeat())!;
  await audit(tx, actor, 'item.created', 'item', row!.id);
  return row!.id;
}

/** Changes a saved item from a form that showed version `base` (docs/specs/changes-elsewhere.md). Answers the new version. */
export async function updateItem(
  tx: Tx,
  actor: Actor,
  id: string,
  input: ItemInput,
  base?: string | null,
): Promise<string> {
  const { idempotencyKey: _key, ...values } = input;
  return saveAgainst(
    base,
    () => itemVersion(tx, id),
    async () => {
      const updated = await tx.update(item).set(values).where(eq(item.id, id)).returning({ id: item.id });
      if (updated.length === 0) throw new Error('Item not found.');
      await audit(tx, actor, 'item.updated', 'item', id);
    },
    CHANGED_ELSEWHERE.item,
  );
}

export async function archiveItem(tx: Tx, actor: Actor, id: string): Promise<void> {
  const archived = await tx
    .update(item)
    .set({ archivedAt: new Date() })
    .where(and(eq(item.id, id), isNull(item.archivedAt)))
    .returning({ id: item.id });
  if (archived.length === 0) {
    throw new DomainError('item_not_found', 'This item does not exist, or is already archived.');
  }
  await audit(tx, actor, 'item.archived', 'item', id);
}
