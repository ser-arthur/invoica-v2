import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import pg from 'pg';
import { getTheme, saveTheme, type Theme } from '../src/preferences';
import { authUser, userPreference } from '../src/schema';
import { withUser } from '../src/tenancy';
import { createTestDatabase, createUserWithOrganisation, type TestDatabase } from './helpers';

/** docs/specs/theme-on-the-account.md, acceptance criteria 1 to 4. */

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
beforeAll(async () => {
  t = await createTestDatabase();
});
afterAll(async () => {
  await t?.close();
});

const person = async (name: string) => (await createUserWithOrganisation(t, name)).userId;
const read = (userId: string, of = userId) => withUser(t.db, userId, (tx) => getTheme(tx, of));
const save = (userId: string, theme: Theme) => withUser(t.db, userId, (tx) => saveTheme(tx, userId, theme));

describe('the theme saved on the account', () => {
  it('reads back, a new person has none, and saving again replaces it (criterion 1)', async () => {
    const me = await person('Theme Studio');
    expect(await read(me)).toBeNull();
    await save(me, 'dark');
    expect(await read(me)).toBe('dark');
    await save(me, 'system');
    expect(await read(me)).toBe('system');
    const rows = await withUser(t.db, me, (tx) => tx.select().from(userPreference));
    expect(rows).toHaveLength(1);
  });

  it('is the same in every business the person belongs to', async () => {
    const me = await person('First Office');
    await withUser(t.db, me, (tx) =>
      tx.execute(sql`select app.create_organisation('Second Office', 'GB', 'GBP', 'Europe/London', 30)`),
    );
    await save(me, 'dark');
    expect(await read(me)).toBe('dark');
  });

  it('another person can neither read it nor change it, and no one writes a row for someone else (criterion 2)', async () => {
    const me = await person('Private Studio');
    const other = await person('Nosy Works');
    await save(me, 'dark');

    expect(await read(other, me)).toBeNull();
    const seen = await withUser(t.db, other, (tx) => tx.select().from(userPreference));
    expect(seen).toEqual([]);

    const changed = await withUser(t.db, other, (tx) =>
      tx.update(userPreference).set({ theme: 'light' }).where(eq(userPreference.userId, me)).returning(),
    );
    expect(changed).toEqual([]);
    expect(await read(me)).toBe('dark');

    expect(await failure(withUser(t.db, other, (tx) => saveTheme(tx, me, 'light')))).toMatch(
      /row-level security/,
    );
    expect(await read(me)).toBe('dark');

    // Without a person set, nothing is seen and nothing can be written.
    const anonymous = await t.db.transaction((tx) => tx.select().from(userPreference));
    expect(anonymous).toEqual([]);
    expect(
      await failure(
        t.db.transaction((tx) => tx.insert(userPreference).values({ userId: me, theme: 'light' })),
      ),
    ).toMatch(/row-level security/);
  });

  it('the database refuses a theme other than light, dark and system (criterion 3)', async () => {
    const me = await person('Colourful Office');
    expect(await failure(save(me, 'blue' as Theme))).toMatch(/check constraint|violates/);
    expect(await read(me)).toBeNull();
  });

  it('removing the person removes their theme (criterion 4)', async () => {
    const me = await person('Leaving Studio');
    await save(me, 'dark');
    await t.db.delete(authUser).where(eq(authUser.id, me));
    const owner = new pg.Client({ connectionString: t.ownerUrl });
    await owner.connect();
    const left = await owner.query('select 1 from user_preference where user_id = $1', [me]);
    const table = await owner.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `select relrowsecurity, relforcerowsecurity from pg_class where relname = 'user_preference' and relkind = 'r'`,
    );
    await owner.end();
    expect(left.rowCount).toBe(0);
    expect(table.rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
  });
});
