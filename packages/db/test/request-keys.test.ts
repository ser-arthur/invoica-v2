import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { itemInput, taxCodeInput } from '@invoica/schemas';
import { createItem } from '../src/items';
import { createDraft, deleteDraft, voidDocument } from '../src/documents';
import { auditLog, document, item, taxCode } from '../src/schema';
import { createTaxCode } from '../src/taxes';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, business, draftFor, issued } from './business';

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

describe('asked again after a lost answer', () => {
  it('voiding an invoice already void, or deleting a draft already deleted, is done already', async () => {
    const b = await business(t, 'Again Office');
    const id = await issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);
    await b.run((tx) => voidDocument(tx, b.actor, id, 'Raised in error', NOW));
    await b.run((tx) => voidDocument(tx, b.actor, id, 'Raised in error', NOW));
    const [doc] = await b.run((tx) => tx.select().from(document).where(eq(document.id, id)));
    expect(doc!.lifecycle).toBe('void');
    const voided = await b.run((tx) =>
      tx
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.action, 'document.voided'), eq(auditLog.entityId, id))),
    );
    expect(voided).toHaveLength(1);

    const draft = await b.run((tx) =>
      createDraft(tx, b.actor, draftFor(b, [{ quantity: 1000, unitPrice: 5000, code: b.codes.vat20 }])),
    );
    await b.run((tx) => deleteDraft(tx, b.actor, draft));
    await b.run((tx) => deleteDraft(tx, b.actor, draft));
    expect(await b.run((tx) => tx.select().from(document).where(eq(document.id, draft)))).toHaveLength(0);
  });
});
