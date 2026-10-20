import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { clientInput, itemInput, organisationProfileInput, taxCodeInput } from '@invoica/schemas';
import { createClient } from '../src/clients';
import { getOrganisation, updateOrganisationProfile } from '../src/organisations';
import { createItem } from '../src/items';
import { createDraft, deleteDraft, issueDocument, updateDraft, voidDocument } from '../src/documents';
import { auditLog, client, document, item, taxCode } from '../src/schema';
import { createTaxCode } from '../src/taxes';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, business, draftFor, failure, issued } from './business';

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

describe('R9-L3: a draft saved or issued again once it is issued', () => {
  it('says which number it was issued as', async () => {
    const b = await business(t, 'Issued Twice Office');
    const lines = [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }];
    const id = await b.run((tx) => createDraft(tx, b.actor, draftFor(b, lines)));
    const { number } = await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    expect(await failure(b.run((tx) => updateDraft(tx, b.actor, id, draftFor(b, lines))))).toBe(
      `This invoice has already been issued as ${number}, so it can no longer be changed.`,
    );
  });
});

describe('R10-L7: a form corrected between a lost answer and the second press', () => {
  it('a client, an item and a tax code take the correction, and a true repeat changes nothing', async () => {
    const b = await business(t, 'Correction Office');
    const name = (n: string, email: string | null) =>
      clientInput.parse({ name: n, email: email ?? '', idempotencyKey: 'fix-client-0001' });
    const id = await b.run((tx) => createClient(tx, b.actor, name('Harbour Mil Ltd', null)));
    expect(
      await b.run((tx) => createClient(tx, b.actor, name('Harbour Mill Ltd', 'ap@harbour.example'))),
    ).toBe(id);
    const [kept] = await b.run((tx) => tx.select().from(client).where(eq(client.id, id)));
    expect([kept!.name, kept!.email]).toEqual(['Harbour Mill Ltd', 'ap@harbour.example']);

    const itemId = await b.run((tx) =>
      createItem(tx, b.actor, { ...anItem('Location day', 'fix-item-0001') }),
    );
    await b.run((tx) =>
      createItem(tx, b.actor, { ...anItem('Location day', 'fix-item-0001'), unitPrice: 65_000 }),
    );
    const [keptItem] = await b.run((tx) => tx.select().from(item).where(eq(item.id, itemId)));
    expect(keptItem!.unitPrice).toBe(65_000);

    const codeId = await b.run((tx) => createTaxCode(tx, b.actor, aCode('Reduced rate', 'fix-code-0001')));
    await b.run((tx) =>
      createTaxCode(tx, b.actor, {
        ...aCode('Reduced rate', 'fix-code-0001'),
        components: [{ name: 'VAT', ratePpm: 125_000, compound: false }],
      }),
    );
    const [keptCode] = await b.run((tx) => tx.select().from(taxCode).where(eq(taxCode.id, codeId)));
    expect(keptCode!.components[0]!.ratePpm).toBe(125_000);

    // The same request again records nothing more.
    const before = await b.run((tx) => tx.select().from(auditLog));
    await b.run((tx) => createClient(tx, b.actor, name('Harbour Mill Ltd', 'ap@harbour.example')));
    await b.run((tx) =>
      createItem(tx, b.actor, { ...anItem('Location day', 'fix-item-0001'), unitPrice: 65_000 }),
    );
    expect(await b.run((tx) => tx.select().from(auditLog))).toHaveLength(before.length);
  });
});

describe('the business’s currency changed with saved items', () => {
  const profile = async (b: Awaited<ReturnType<typeof business>>, baseCurrency: string) => {
    const org = await b.run((tx) => getOrganisation(tx, b.actor));
    return organisationProfileInput.parse({ ...org, baseCurrency });
  };
  const prices = (b: Awaited<ReturnType<typeof business>>) =>
    b.run(async (tx) => (await tx.select().from(item).orderBy(item.name)).map((i) => [i.name, i.unitPrice]));

  it('keeps each saved item’s figure in the new currency', async () => {
    const b = await business(t, 'Currency Move Office');
    await b.run((tx) => createItem(tx, b.actor, anItem('Location day')));
    await b.run((tx) => tx.update(item).set({ unitPrice: 50_000 }));
    await b.run(async (tx) => updateOrganisationProfile(tx, b.actor, await profile(b, 'JPY')));
    expect(await prices(b)).toEqual([['Location day', 500]]);
    await b.run(async (tx) => updateOrganisationProfile(tx, b.actor, await profile(b, 'KWD')));
    expect(await prices(b)).toEqual([['Location day', 500_000]]);
    await b.run(async (tx) => updateOrganisationProfile(tx, b.actor, await profile(b, 'GBP')));
    expect(await prices(b)).toEqual([['Location day', 50_000]]);
  });

  it('is refused while a saved item’s price cannot be written in the new currency', async () => {
    const b = await business(t, 'Currency Refused Office');
    await b.run((tx) => createItem(tx, b.actor, anItem('Sticker')));
    await b.run((tx) => tx.update(item).set({ unitPrice: 1234 }));
    expect(
      await failure(b.run(async (tx) => updateOrganisationProfile(tx, b.actor, await profile(b, 'JPY')))),
    ).toBe('The saved item “Sticker” costs £12.34, which cannot be written in JPY. Change its price first.');
    expect(await prices(b)).toEqual([['Sticker', 1234]]);
  });
});
