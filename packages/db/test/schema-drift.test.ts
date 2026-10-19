import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import pg from 'pg';
import * as schema from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';

let t: TestDatabase;
beforeAll(async () => {
  t = await createTestDatabase();
});
afterAll(async () => {
  await t?.close();
});

const TYPE_MAP: Record<string, string> = {
  PgText: 'text',
  PgUUID: 'uuid',
  PgBoolean: 'boolean',
  PgInteger: 'integer',
  PgBigInt53: 'bigint',
  PgBigSerial53: 'bigint',
  PgChar: 'character',
  PgDateString: 'date',
  PgTimestamp: 'timestamp with time zone',
  PgJsonb: 'jsonb',
  PgArray: 'ARRAY',
};

describe('the Drizzle schema matches the migrated database', () => {
  it('every column exists with the same type and nullability', async () => {
    const owner = new pg.Client({ connectionString: t.ownerUrl });
    await owner.connect();
    const rows = (
      await owner.query<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(
        `select table_name, column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public'`,
      )
    ).rows;
    await owner.end();
    const actual = new Map(rows.map((r) => [`${r.table_name}.${r.column_name}`, r]));
    const tables = (Object.values(schema) as unknown[]).filter((v): v is PgTable => is(v, PgTable));
    let examined = 0;
    const problems: string[] = [];
    for (const table of tables) {
      const config = getTableConfig(table);
      const dbColumns = rows.filter((r) => r.table_name === config.name).map((r) => r.column_name);
      const declared = config.columns.map((c) => c.name);
      for (const missing of dbColumns.filter((c) => !declared.includes(c)))
        problems.push(`${config.name}.${missing} not in schema.ts`);
      for (const column of config.columns) {
        examined += 1;
        const row = actual.get(`${config.name}.${column.name}`);
        if (!row) {
          problems.push(`${config.name}.${column.name} missing in database`);
          continue;
        }
        const expectedType = TYPE_MAP[column.columnType];
        if (expectedType !== row.data_type)
          problems.push(`${config.name}.${column.name}: ${column.columnType} vs ${row.data_type}`);
        const nullable = row.is_nullable === 'YES';
        if (nullable === column.notNull && !column.primary)
          problems.push(`${config.name}.${column.name}: nullability differs`);
      }
    }
    expect(tables.length).toBe(19);
    expect(examined).toBeGreaterThan(150);
    expect(problems).toEqual([]);
  });
});
