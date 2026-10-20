import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { itemInput, taxCodeInput } from '@invoica/schemas';
import { createItem } from '../src/items';
import { item, taxCode } from '../src/schema';
import { createTaxCode } from '../src/taxes';
import { createTestDatabase, type TestDatabase } from './helpers';
import { business } from './business';

/** A new saved item or tax code saved again after a lost answer, or twice at once, is made once. */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

const anItem = (name: string, idempotencyKey?: string) =>
  itemInput.parse({ name, unitPrice: 4500, ...(idempotencyKey ? { idempotencyKey } : {}) });

const aCode = (label: string, idempotencyKey?: string) =>
  taxCodeInput.parse({
    label,
    treatment: 'standard',
    components: [{ name: 'VAT', ratePpm: 175_000, compound: false }],
    isDefault: false,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });

describe('request keys', () => {
  it('a saved item with the same key is made once, also at the same moment', async () => {
    const b = await business(t, 'Item Key Office');
    const first = await b.run((tx) => createItem(tx, b.actor, anItem('Site visit', 'item-key-0001')));
    expect(await b.run((tx) => createItem(tx, b.actor, anItem('Site visit', 'item-key-0001')))).toBe(first);
    const both = await Promise.allSettled([
      b.run((tx) => createItem(tx, b.actor, anItem('Report', 'item-key-0002'))),
      b.run((tx) => createItem(tx, b.actor, anItem('Report', 'item-key-0002'))),
    ]);
    const ids = both
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<string>).value);
    expect(new Set(ids).size).toBe(1);
    await b.run((tx) => createItem(tx, b.actor, anItem('Site visit')));
    const names = (await b.run((tx) => tx.select().from(item))).map((r) => r.name).sort();
    expect(names).toEqual(['Report', 'Site visit', 'Site visit']);
  });

  it('a tax code with the same key is made once, also at the same moment', async () => {
    const b = await business(t, 'Code Key Office');
    const first = await b.run((tx) => createTaxCode(tx, b.actor, aCode('Old VAT', 'code-key-0001')));
    expect(await b.run((tx) => createTaxCode(tx, b.actor, aCode('Old VAT', 'code-key-0001')))).toBe(first);
    const both = await Promise.allSettled([
      b.run((tx) => createTaxCode(tx, b.actor, aCode('Levy', 'code-key-0002'))),
      b.run((tx) => createTaxCode(tx, b.actor, aCode('Levy', 'code-key-0002'))),
    ]);
    const ids = both
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<string>).value);
    expect(new Set(ids).size).toBe(1);
    const labels = (await b.run((tx) => tx.select().from(taxCode))).map((r) => r.label);
    expect(labels.filter((l) => l === 'Old VAT')).toHaveLength(1);
    expect(labels.filter((l) => l === 'Levy')).toHaveLength(1);
  });
});
