import { and, asc, eq, ilike, isNull } from 'drizzle-orm';
import { DomainError } from '@invoica/core';
import type { ItemInput } from '@invoica/schemas';
import type { Tx } from './client';
import { item } from './schema';
import { audit } from './audit';
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

export async function createItem(tx: Tx, actor: Actor, input: ItemInput): Promise<string> {
  const [row] = await tx
    .insert(item)
    .values({ organisationId: actor.organisationId, ...input })
    .returning({ id: item.id });
  await audit(tx, actor, 'item.created', 'item', row!.id);
  return row!.id;
}

export async function updateItem(tx: Tx, actor: Actor, id: string, input: ItemInput): Promise<void> {
  const updated = await tx.update(item).set(input).where(eq(item.id, id)).returning({ id: item.id });
  if (updated.length === 0) throw new Error('Item not found.');
  await audit(tx, actor, 'item.updated', 'item', id);
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
