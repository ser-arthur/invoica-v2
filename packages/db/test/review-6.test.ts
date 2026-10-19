import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { archiveItem, createItem } from '../src/items';
import { archiveTaxCode } from '../src/taxes';
import { auditLog } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { business, failure, type Business } from './business';

/** Tests for the findings of the sixth independent review (docs/reviews/review-6.md) that sit in the database layer. */

let t: TestDatabase;
let a: Business;
let b: Business;

beforeAll(async () => {
  t = await createTestDatabase();
  a = await business(t, 'Alice Office');
  b = await business(t, 'Bob Office');
});

afterAll(async () => {
  await t?.close();
});

const auditNaming = (who: Business, id: string) =>
  who.run((tx) => tx.select().from(auditLog).where(eq(auditLog.entityId, id)));

describe('R6-L1: archiving an item or tax code that is not yours', () => {
  it('refuses another business’s item and writes no audit entry for it', async () => {
    const item = await a.run((tx) =>
      createItem(tx, a.actor, {
        name: 'Survey',
        description: null,
        unitPrice: 1000,
        unit: null,
        taxCodeId: null,
      }),
    );
    expect(await failure(b.run((tx) => archiveItem(tx, b.actor, item)))).toMatch(/does not exist/);
    expect(await auditNaming(b, item)).toEqual([]);
  });

  it('refuses another business’s tax code and writes no audit entry for it', async () => {
    expect(await failure(b.run((tx) => archiveTaxCode(tx, b.actor, a.codes.vat20)))).toMatch(
      /does not exist/,
    );
    expect(await auditNaming(b, a.codes.vat20)).toEqual([]);
  });

  it('archives your own, once', async () => {
    const item = await b.run((tx) =>
      createItem(tx, b.actor, {
        name: 'Report',
        description: null,
        unitPrice: 500,
        unit: null,
        taxCodeId: null,
      }),
    );
    await b.run((tx) => archiveItem(tx, b.actor, item));
    expect(await failure(b.run((tx) => archiveItem(tx, b.actor, item)))).toMatch(/already archived/);
  });
});
