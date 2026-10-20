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
  'refund',
  'reminder_pause',
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
      // The outbox is read across organisations by the worker's security-definer functions only.
      const forced = r.relname !== 'outbox';
      expect([r.relname, r.relrowsecurity, r.relforcerowsecurity]).toEqual([r.relname, true, forced]);
    }
  });

  it('every table holding an organisation’s records is in this suite', async () => {
    const owner = new pg.Client({ connectionString: t.ownerUrl });
    await owner.connect();
    const rows = (
      await owner.query<{ table_name: string }>(
        `select table_name from information_schema.columns
         where table_schema = 'public' and column_name = 'organisation_id'`,
      )
    ).rows;
    await owner.end();
    // Memberships are read through their own policy and written only by security-definer functions.
    expect(rows.map((r) => r.table_name).sort()).toEqual([...TENANT_TABLES, 'membership'].sort());
  });

  it('the policies are exactly these: any new one needs a review', async () => {
    const owner = new pg.Client({ connectionString: t.ownerUrl });
    await owner.connect();
    const rows = (
      await owner.query<{ line: string }>(
        `select tablename || ' ' || policyname || ' ' || array_to_string(roles, ',') || ' ' || cmd as line
         from pg_policies where schemaname = 'public' order by 1`,
      )
    ).rows;
    await owner.end();
    const tenant = TENANT_TABLES.filter((t) => t !== 'audit_log').map((t) => `${t} tenant public ALL`);
    // The reminder scan reads these as the owner role, inside app.reminder_candidates and app.due_reminders only.
    const scan = ['client', 'document', 'payment', 'refund', 'reminder_pause'].map(
      (t) => `${t} reminder_scan invoica_owner SELECT`,
    );
    expect(rows.map((r) => r.line).sort()).toEqual(
      [
        ...tenant,
        ...scan,
        'audit_log audit_read public SELECT',
        'audit_log audit_write public INSERT',
        'membership membership_visible public SELECT',
        'organisation organisation_member public SELECT',
        'organisation organisation_update public UPDATE',
      ].sort(),
    );
  });

  it('the app and worker roles may run and touch exactly these: any change needs a review', async () => {
    const owner = new pg.Client({ connectionString: t.ownerUrl });
    await owner.connect();
    // Functions that run with their owner's rights, which is where reading across organisations could happen.
    const definers = (
      await owner.query<{ line: string }>(
        `select r.role || ' ' || p.proname as line
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         cross join (values ('invoica_app'), ('invoica_worker')) as r(role)
         where n.nspname = 'app' and p.prosecdef and has_function_privilege(r.role, p.oid, 'execute')`,
      )
    ).rows.map((r) => r.line);
    const tables = (
      await owner.query<{ line: string }>(
        `select grantee || ' ' || table_name || ' ' || string_agg(privilege_type, ',' order by privilege_type) as line
         from information_schema.role_table_grants
         where grantee in ('invoica_app', 'invoica_worker') group by grantee, table_name`,
      )
    ).rows.map((r) => r.line);
    await owner.end();
    expect(definers.sort()).toEqual(
      [
        'invoica_app create_organisation',
        'invoica_app current_organisation_id',
        'invoica_app my_organisations',
        'invoica_worker claim_outbox',
        'invoica_worker due_reminders',
        'invoica_worker finish_outbox',
        'invoica_worker reminder_candidates',
      ].sort(),
    );
    const all = 'DELETE,INSERT,SELECT,UPDATE';
    expect(tables.sort()).toEqual(
      [
        'invoica_app audit_log INSERT,SELECT',
        `invoica_app auth_account ${all}`,
        `invoica_app auth_session ${all}`,
        `invoica_app auth_user ${all}`,
        `invoica_app auth_verification ${all}`,
        `invoica_app client ${all}`,
        `invoica_app client_field ${all}`,
        `invoica_app document ${all}`,
        `invoica_app document_line ${all}`,
        `invoica_app item ${all}`,
        'invoica_app membership SELECT',
        'invoica_app number_counter INSERT,SELECT,UPDATE',
        'invoica_app organisation SELECT,UPDATE',
        `invoica_app outbox ${all}`,
        'invoica_app payment INSERT,SELECT,UPDATE',
        'invoica_app refund INSERT,SELECT',
        'invoica_app reminder_pause DELETE,INSERT,SELECT',
        `invoica_app stored_file ${all}`,
        `invoica_app tax_code ${all}`,
      ].sort(),
    );
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
