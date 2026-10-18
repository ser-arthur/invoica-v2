import { sql } from 'drizzle-orm';
import type { Database, Tx } from './client';

/** Who is acting and for which organisation. The user id comes from a verified session, never from input. */
export interface Actor {
  userId: string;
  organisationId: string;
}

export class NotAMemberError extends Error {
  constructor() {
    super('You do not have access to this organisation.');
    this.name = 'NotAMemberError';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs `fn` in a transaction scoped to one organisation. Row-level security in the database limits every
 * query in it to that organisation, and only if the user is one of its members.
 */
export async function withOrganisation<T>(
  db: Database,
  actor: Actor,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!UUID.test(actor.organisationId)) throw new NotAMemberError();
  return db.transaction(async (tx) => {
    const result = await tx.execute<{ org: string | null }>(
      sql`select set_config('app.user_id', ${actor.userId}, true), set_config('app.organisation_id', ${actor.organisationId}, true), app.current_organisation_id() as org`,
    );
    if (!result.rows[0]?.org) throw new NotAMemberError();
    return fn(tx);
  });
}

/** Runs `fn` in a transaction where only the user is known: listing and creating their organisations. */
export async function withUser<T>(db: Database, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
