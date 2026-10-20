import { and, asc, eq, ilike, isNull, isNotNull, or, sql } from 'drizzle-orm';
import type { ClientInput } from '@invoica/schemas';
import type { Tx } from './client';
import { client, clientField } from './schema';
import { audit } from './audit';
import { fingerprint } from './fingerprint';
import type { Actor } from './tenancy';
import { assertRoomForClient } from './plans';

export type ClientRow = typeof client.$inferSelect;
export type ClientFieldRow = typeof clientField.$inferSelect;

export async function listClients(
  tx: Tx,
  options: { search?: string; archived?: boolean } = {},
): Promise<ClientRow[]> {
  const conditions = [options.archived ? isNotNull(client.archivedAt) : isNull(client.archivedAt)];
  const term = options.search?.trim();
  if (term) {
    const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      or(ilike(client.name, like), ilike(client.email, like), ilike(client.contactName, like))!,
    );
  }
  return tx
    .select()
    .from(client)
    .where(and(...conditions))
    .orderBy(asc(client.name));
}

export async function getClient(
  tx: Tx,
  id: string,
): Promise<{ client: ClientRow; fields: ClientFieldRow[] } | null> {
  const [row] = await tx.select().from(client).where(eq(client.id, id));
  if (!row) return null;
  const fields = await tx
    .select()
    .from(clientField)
    .where(eq(clientField.clientId, id))
    .orderBy(asc(clientField.sort));
  return { client: row, fields };
}

function columns(input: ClientInput) {
  const { fields: _fields, remindersEnabled, idempotencyKey: _key, ...rest } = input;
  return remindersEnabled === undefined ? rest : { ...rest, remindersEnabled };
}

async function replaceFields(tx: Tx, actor: Actor, clientId: string, input: ClientInput) {
  await tx.delete(clientField).where(eq(clientField.clientId, clientId));
  const fields = input.fields.filter((f) => f.label.trim() && f.value.trim());
  if (fields.length) {
    await tx
      .insert(clientField)
      .values(fields.map((f, i) => ({ organisationId: actor.organisationId, clientId, ...f, sort: i })));
  }
}

/**
 * Makes a client. A request key from the form makes a repeat find the client the first request made: the same
 * request again changes nothing, and one corrected between a lost answer and the second press is saved as corrected.
 */
export async function createClient(tx: Tx, actor: Actor, input: ClientInput): Promise<string> {
  const key = input.idempotencyKey ?? null;
  const { idempotencyKey: _key, ...request } = input;
  const digest = fingerprint(request);
  const repeat = async () => {
    if (!key) return undefined;
    const [row] = await tx
      .select({
        id: client.id,
        requestFingerprint: client.requestFingerprint,
        changed: sql<boolean>`${client.updatedAt} <> ${client.createdAt}`,
      })
      .from(client)
      .where(eq(client.idempotencyKey, key));
    if (!row) return undefined;
    // A correction is applied only to the record as its first request made it: an edit made since, or a correction
    // already applied, is never replaced by an older request arriving late.
    if (row.requestFingerprint !== digest && !row.changed) {
      await updateClient(tx, actor, row.id, input);
      await tx.update(client).set({ requestFingerprint: digest }).where(eq(client.id, row.id));
    }
    return row.id;
  };
  const earlier = await repeat();
  if (earlier) return earlier;
  await assertRoomForClient(tx, actor.organisationId, new Date());
  const [row] = await tx
    .insert(client)
    .values({
      organisationId: actor.organisationId,
      ...columns(input),
      idempotencyKey: key,
      requestFingerprint: key ? digest : null,
    })
    .onConflictDoNothing({
      target: [client.organisationId, client.idempotencyKey],
      where: sql`${client.idempotencyKey} is not null`,
    })
    .returning({ id: client.id });
  // Saved at the same moment by another request with the same key: that one is the client.
  if (!row) return (await repeat())!;
  await replaceFields(tx, actor, row!.id, input);
  await audit(tx, actor, 'client.created', 'client', row!.id);
  return row!.id;
}

export async function updateClient(tx: Tx, actor: Actor, id: string, input: ClientInput): Promise<void> {
  const updated = await tx
    .update(client)
    .set(columns(input))
    .where(eq(client.id, id))
    .returning({ id: client.id });
  if (updated.length === 0) throw new Error('Client not found.');
  await replaceFields(tx, actor, id, input);
  await audit(tx, actor, 'client.updated', 'client', id);
}

export async function setClientArchived(tx: Tx, actor: Actor, id: string, archived: boolean): Promise<void> {
  if (!archived) await assertRoomForClient(tx, actor.organisationId, new Date());
  const updated = await tx
    .update(client)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(client.id, id))
    .returning({ id: client.id });
  if (updated.length === 0) throw new Error('Client not found.');
  await audit(tx, actor, archived ? 'client.archived' : 'client.restored', 'client', id);
}
