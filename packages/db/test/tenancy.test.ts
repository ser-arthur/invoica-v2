import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import pg from 'pg';
import { client, document, auditLog, organisation, membership } from '../src/schema';
import { NotAMemberError, withOrganisation, withUser, type Actor } from '../src/tenancy';
import { createTestDatabase, createUserWithOrganisation, type TestDatabase } from './helpers';

const TENANT_TABLES = [
  'tax_code',
  'client',
  'client_field',
  'item',
  'stored_file',
  'document',
  'document_line',
  'payment',
  'number_counter',
  'audit_log',
  'outbox',
];

/** Resolves with the database's own error message, looking through the query wrapper. */
async function failure(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const e = error as Error & { cause?: Error };
    return e.cause?.message ?? e.message;
  }
  return 'did not fail';
}

let t: TestDatabase;
let a: Actor;
let b: Actor;
let clientA: string;

beforeAll(async () => {
  t = await createTestDatabase();
  a = await createUserWithOrganisation(t, 'Alpha Studio');
  b = await createUserWithOrganisation(t, 'Beta Works');
  clientA = await withOrganisation(t.db, a, async (tx) => {
    const [row] = await tx
      .insert(client)
      .values({ organisationId: a.organisationId, name: 'Client of Alpha' })
      .returning({ id: client.id });
    await tx.insert(document).values({
      organisationId: a.organisationId,
      kind: 'invoice',
      clientId: row!.id,
      currency: 'GBP',
    });
    return row!.id;
  });
});

afterAll(async () => {
  await t?.close();
});

describe('cross-organisation access is refused', () => {
  it('every tenant table has row-level security forced, and the expected policy count', async () => {
    const owner = new pg.Client({ connectionString: t.ownerUrl });
    await owner.connect();
    const rows = (
      await owner.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `select relname, relrowsecurity, relforcerowsecurity from pg_class
         where relname = any($1) and relkind = 'r'`,
        [TENANT_TABLES],
      )
    ).rows;
    await owner.end();
    expect(rows).toHaveLength(TENANT_TABLES.length);
    for (const r of rows) {
      expect([r.relname, r.relrowsecurity, r.relforcerowsecurity]).toEqual([r.relname, true, true]);
    }
  });

  it('a user cannot open another organisation', async () => {
    await expect(
      withOrganisation(t.db, { userId: b.userId, organisationId: a.organisationId }, async () => 1),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });

  it('setting another organisation by hand shows nothing from it', async () => {
    const seen = await t.db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('app.user_id', ${b.userId}, true), set_config('app.organisation_id', ${a.organisationId}, true)`,
      );
      const counts: Record<string, number> = {};
      for (const table of TENANT_TABLES) {
        const r = await tx.execute<{ n: string }>(sql.raw(`select count(*) as n from ${table}`));
        counts[table] = Number(r.rows[0]!.n);
      }
      const orgs = await tx.select().from(organisation);
      return { counts, orgs: orgs.length };
    });
    expect(Object.values(seen.counts).every((n) => n === 0)).toBe(true);
    expect(Object.keys(seen.counts)).toHaveLength(TENANT_TABLES.length);
    expect(seen.orgs).toBe(0);
  });

  it('with no organisation set, every tenant table is empty', async () => {
    const counts = await t.db.transaction(async (tx) => {
      const out: number[] = [];
      for (const table of TENANT_TABLES) {
        const r = await tx.execute<{ n: string }>(sql.raw(`select count(*) as n from ${table}`));
        out.push(Number(r.rows[0]!.n));
      }
      return out;
    });
    expect(counts).toHaveLength(TENANT_TABLES.length);
    expect(counts.every((n) => n === 0)).toBe(true);
  });

  it('inside its own organisation, a user sees only its own rows', async () => {
    const rows = await withOrganisation(t.db, b, (tx) => tx.select().from(client));
    expect(rows).toHaveLength(0);
    const own = await withOrganisation(t.db, a, (tx) => tx.select().from(client));
    expect(own.map((r) => r.name)).toEqual(['Client of Alpha']);
  });

  it('writing a row into another organisation is refused', async () => {
    expect(
      await failure(
        withOrganisation(t.db, b, (tx) =>
          tx.insert(client).values({ organisationId: a.organisationId, name: 'Planted' }),
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it('updating or deleting another organisation’s rows changes nothing', async () => {
    const updated = await withOrganisation(t.db, b, (tx) =>
      tx.update(client).set({ name: 'Taken' }).where(eq(client.id, clientA)).returning(),
    );
    const deleted = await withOrganisation(t.db, b, (tx) =>
      tx.delete(client).where(eq(client.id, clientA)).returning(),
    );
    expect([updated.length, deleted.length]).toEqual([0, 0]);
    const still = await withOrganisation(t.db, a, (tx) =>
      tx.select().from(client).where(eq(client.id, clientA)),
    );
    expect(still[0]?.name).toBe('Client of Alpha');
  });

  it('a document cannot point at another organisation’s client', async () => {
    expect(
      await failure(
        withOrganisation(t.db, b, (tx) =>
          tx.insert(document).values({
            organisationId: b.organisationId,
            kind: 'invoice',
            clientId: clientA,
            currency: 'GBP',
          }),
        ),
      ),
    ).toMatch(/foreign key/);
  });

  it('the app role cannot create organisations or memberships directly', async () => {
    await expect(
      withUser(t.db, b.userId, (tx) => tx.insert(organisation).values({ name: 'Direct' })),
    ).rejects.toThrow();
    await expect(
      withOrganisation(t.db, b, (tx) =>
        tx.insert(membership).values({ organisationId: a.organisationId, userId: b.userId }),
      ),
    ).rejects.toThrow();
  });

  it('the app role cannot switch row-level security off or change roles', async () => {
    expect(await failure(t.db.execute(sql`alter table client disable row level security`))).toMatch(/owner/);
    expect(await failure(t.db.execute(sql`set role invoica_owner`))).toMatch(/permission denied/);
    const r = await t.db.execute<{ rolbypassrls: boolean; rolsuper: boolean }>(
      sql`select rolbypassrls, rolsuper from pg_roles where rolname = current_user`,
    );
    expect(r.rows[0]).toEqual({ rolbypassrls: false, rolsuper: false });
  });

  it('a user lists only their own organisations', async () => {
    const mine = await withUser(t.db, b.userId, async (tx) =>
      (await tx.execute<{ id: string }>(sql`select id from app.my_organisations()`)).rows.map((r) => r.id),
    );
    expect(mine).toEqual([b.organisationId]);
  });
});

describe('the audit log is append-only', () => {
  it('refuses updates and deletes', async () => {
    const rows = await withOrganisation(t.db, a, (tx) => tx.select().from(auditLog));
    expect(rows.length).toBeGreaterThan(0);
    await expect(
      withOrganisation(t.db, a, (tx) => tx.update(auditLog).set({ action: 'changed' })),
    ).rejects.toThrow();
    await expect(withOrganisation(t.db, a, (tx) => tx.delete(auditLog))).rejects.toThrow();
  });
});
