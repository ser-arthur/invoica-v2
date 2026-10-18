import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { draftInput, type DraftInput } from '@invoica/schemas';
import type { DocumentSnapshot } from '@invoica/core';
import { createClient } from '../src/clients';
import {
  createCreditNote,
  createDraft,
  creditableLines,
  documentForKey,
  getDocument,
  issueDocument,
  listDocuments,
  recordPayment,
  voidDocument,
} from '../src/documents';
import { getDashboard } from '../src/dashboard';
import { recordFile } from '../src/files';
import { updateOrganisationProfile, getOrganisation } from '../src/organisations';
import { createTaxCode, updateTaxCode } from '../src/taxes';
import { enqueue } from '../src/outbox';
import { document, documentLine, organisation, outbox, storedFile } from '../src/schema';
import { withOrganisation, withUser, type Actor } from '../src/tenancy';
import { createTestDatabase, createUserWithOrganisation, type TestDatabase } from './helpers';

/**
 * Tests for the findings of the first independent review (docs/reviews/review-1.md). Each names its finding.
 */

const NOW = new Date('2026-10-18T10:00:00Z');
const TODAY = '2026-10-18';

let t: TestDatabase;

async function failure(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const e = error as Error & { cause?: Error };
    return e.cause?.message ?? e.message;
  }
  return 'did not fail';
}

interface Business {
  actor: Actor;
  clientId: string;
  codes: Record<'vat20' | 'zero' | 'none', string>;
  run: <T>(fn: Parameters<typeof withOrganisation<T>>[2]) => Promise<T>;
}

async function business(name: string, registered = true): Promise<Business> {
  const actor = await createUserWithOrganisation(t, name);
  const run = <T>(fn: Parameters<typeof withOrganisation<T>>[2]) => withOrganisation(t.db, actor, fn);
  return run(async (tx) => {
    await tx
      .update(organisation)
      .set({ taxRegistered: registered, taxNumber: registered ? 'GB000000000' : null })
      .where(eq(organisation.id, actor.organisationId));
    const clientId = await createClient(tx, actor, {
      name: 'Northlane Ltd',
      contactName: null,
      email: 'accounts@northlane.example',
      phone: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      region: null,
      postcode: null,
      countryCode: 'GB',
      taxNumber: null,
      currency: 'GBP',
      paymentTermsDays: 14,
      notes: null,
      fields: [],
    });
    const vat20 = await createTaxCode(tx, actor, {
      label: 'Standard rate',
      treatment: 'standard',
      components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
      isDefault: true,
    });
    const zero = await createTaxCode(tx, actor, {
      label: 'Zero-rated',
      treatment: 'zero',
      components: [{ name: 'VAT', ratePpm: 0, compound: false }],
      isDefault: false,
    });
    const none = await createTaxCode(tx, actor, {
      label: 'No VAT',
      treatment: 'outside_scope',
      components: [],
      isDefault: false,
    });
    return { actor, clientId, codes: { vat20, zero, none }, run };
  });
}

function draftFor(
  b: Business,
  lines: { quantity: number; unitPrice: number; code: string | null }[],
  over: Partial<DraftInput> = {},
) {
  return draftInput.parse({
    clientId: b.clientId,
    currency: 'GBP',
    lineStyle: 'quantity',
    pricesIncludeTax: false,
    template: 'signature',
    lines: lines.map((l, i) => ({
      title: `Line ${i + 1}`,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxCodeId: l.code,
    })),
    ...over,
  });
}

async function issued(b: Business, lines: { quantity: number; unitPrice: number; code: string | null }[]) {
  const id = await b.run((tx) => createDraft(tx, b.actor, draftFor(b, lines)));
  await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
  return id;
}

async function lineIds(b: Business, documentId: string) {
  const rows = await b.run((tx) =>
    tx
      .select({ id: documentLine.id })
      .from(documentLine)
      .where(eq(documentLine.documentId, documentId))
      .orderBy(documentLine.position),
  );
  return rows.map((r) => r.id);
}

const pay = (documentId: string, amount: number, idempotencyKey: string) => ({
  documentId,
  amount,
  paidOn: TODAY,
  method: 'bank_transfer' as const,
  reference: null,
  note: null,
  idempotencyKey,
});

let a: Business;

beforeAll(async () => {
  t = await createTestDatabase();
  a = await business('Review Office');
});

afterAll(async () => {
  await t?.close();
});

describe('H1: partial credit notes come from the invoice lines and their stored tax', () => {
  it('an amount credited on a zero-rated invoice carries no VAT', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.zero }]);
    const cn = await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        { mode: 'amount', invoiceId: id, amount: 5000, reason: 'Goodwill', idempotencyKey: 'h1-zero-0001' },
        NOW,
      ),
    );
    const d = await a.run((tx) => getDocument(tx, cn.id, TODAY));
    expect([d!.document.total, d!.document.taxTotal]).toEqual([5000, 0]);
  });

  it('a tax code edited after issue does not change the rate credited', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    await a.run((tx) =>
      updateTaxCode(tx, a.actor, a.codes.vat20, {
        label: 'Standard rate',
        treatment: 'standard',
        components: [{ name: 'VAT', ratePpm: 50_000, compound: false }],
        isDefault: true,
      }),
    );
    const [lineId] = await lineIds(a, id);
    const cn = await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        {
          mode: 'lines',
          invoiceId: id,
          lines: [{ lineId: lineId!, quantity: 500 }],
          reason: 'Half returned',
          idempotencyKey: 'h1-rate-0001',
        },
        NOW,
      ),
    );
    const d = await a.run((tx) => getDocument(tx, cn.id, TODAY));
    expect([d!.document.total, d!.document.taxTotal]).toEqual([6000, 1000]);
    expect(d!.lines[0]!.tax?.components[0]?.ratePpm).toBe(200_000);
    expect(d!.lines[0]!.creditedLineId).toBe(lineId);
    await a.run((tx) =>
      updateTaxCode(tx, a.actor, a.codes.vat20, {
        label: 'Standard rate',
        treatment: 'standard',
        components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
        isDefault: true,
      }),
    );
  });

  it('refuses to credit more of a line than was invoiced', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const [lineId] = await lineIds(a, id);
    expect(
      await failure(
        a.run((tx) =>
          createCreditNote(
            tx,
            a.actor,
            {
              mode: 'lines',
              invoiceId: id,
              lines: [{ lineId: lineId!, quantity: 50_000 }],
              reason: 'x',
              idempotencyKey: 'h1-qty-00001',
            },
            NOW,
          ),
        ),
      ),
    ).toMatch(/more than is left to credit/);
  });

  it('refuses a line from another invoice', async () => {
    const one = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const two = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const [otherLine] = await lineIds(a, two);
    expect(
      await failure(
        a.run((tx) =>
          createCreditNote(
            tx,
            a.actor,
            {
              mode: 'lines',
              invoiceId: one,
              lines: [{ lineId: otherLine!, quantity: 1000 }],
              reason: 'x',
              idempotencyKey: 'h1-other-001',
            },
            NOW,
          ),
        ),
      ),
    ).toMatch(/not on this invoice/);
  });

  it('credits taken a unit at a time clear the invoice to the penny', async () => {
    const id = await issued(a, [{ quantity: 3000, unitPrice: 101, code: a.codes.vat20 }]);
    const [lineId] = await lineIds(a, id);
    for (const n of [1, 2, 3]) {
      await a.run((tx) =>
        createCreditNote(
          tx,
          a.actor,
          {
            mode: 'lines',
            invoiceId: id,
            lines: [{ lineId: lineId!, quantity: 1000 }],
            reason: 'Returned',
            idempotencyKey: `h1-unit-000${n}`,
          },
          NOW,
        ),
      );
    }
    const d = await a.run((tx) => getDocument(tx, id, TODAY));
    expect([d!.document.total, d!.applied.credited, d!.balance, d!.state]).toEqual([364, 364, 0, 'credited']);
    const lines = await a.run((tx) => creditableLines(tx, id));
    expect(lines.map((l) => [l.quantity, l.credited])).toEqual([[3000, 3000]]);
  });
});

describe('H3: an amount is credited across the tax rates the invoice charged', () => {
  it('£300 off an invoice with standard and zero-rated lines credits VAT in proportion', async () => {
    const id = await issued(a, [
      { quantity: 1000, unitPrice: 50_000, code: a.codes.vat20 },
      { quantity: 1000, unitPrice: 10_000, code: a.codes.zero },
    ]);
    const cn = await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        { mode: 'amount', invoiceId: id, amount: 30_000, reason: 'Goodwill', idempotencyKey: 'h3-mixed-001' },
        NOW,
      ),
    );
    const d = await a.run((tx) => getDocument(tx, cn.id, TODAY));
    const snap = d!.document.snapshot as unknown as DocumentSnapshot;
    expect([d!.document.total, d!.document.taxTotal]).toEqual([30_000, 4286]);
    expect(snap.pricesIncludeTax).toBe(true);
    expect(snap.lines.map((l) => l.tax?.label)).toEqual(['Standard rate', 'Zero-rated']);
  });

  it('refuses a whole credit once something is paid', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    await a.run((tx) => recordPayment(tx, a.actor, pay(id, 100, 'h3-paid-0001')));
    expect(
      await failure(
        a.run((tx) =>
          createCreditNote(
            tx,
            a.actor,
            { mode: 'whole', invoiceId: id, reason: 'x', idempotencyKey: 'h3-whole-001' },
            NOW,
          ),
        ),
      ),
    ).toMatch(/payments or credits/);
  });
});

describe('H2: a repeated request is recognised by what it asks for', () => {
  it('a reused payment key with a different amount or invoice is refused, and the same request is a repeat', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const other = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const first = await a.run((tx) => recordPayment(tx, a.actor, pay(id, 4000, 'h2-key-00001')));
    const again = await a.run((tx) => recordPayment(tx, a.actor, pay(id, 4000, 'h2-key-00001')));
    expect(again).toEqual({ id: first.id, duplicate: true });
    expect(await failure(a.run((tx) => recordPayment(tx, a.actor, pay(id, 6000, 'h2-key-00001'))))).toMatch(
      /already used/,
    );
    expect(
      await failure(a.run((tx) => recordPayment(tx, a.actor, pay(other, 4000, 'h2-key-00001')))),
    ).toMatch(/already used/);
    const d = await a.run((tx) => getDocument(tx, id, TODAY));
    expect(d!.applied.paid).toBe(4000);
  });

  it('a reused credit note key with a different request is refused', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const input = {
      mode: 'amount' as const,
      invoiceId: id,
      amount: 1200,
      reason: 'Late',
      idempotencyKey: 'h2-credit-01',
    };
    const first = await a.run((tx) => createCreditNote(tx, a.actor, input, NOW));
    expect(await a.run((tx) => createCreditNote(tx, a.actor, input, NOW))).toEqual({
      ...first,
      duplicate: true,
    });
    expect(
      await failure(a.run((tx) => createCreditNote(tx, a.actor, { ...input, amount: 2400 }, NOW))),
    ).toMatch(/already used/);
  });
});

describe('M1 and M2: the database guards issued documents', () => {
  it('refuses moving a line out of an issued invoice', async () => {
    const id = await issued(a, [
      { quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 },
      { quantity: 1000, unitPrice: 5000, code: a.codes.vat20 },
    ]);
    const draft = await a.run((tx) =>
      createDraft(tx, a.actor, draftFor(a, [{ quantity: 1000, unitPrice: 100, code: null }])),
    );
    const [, second] = await lineIds(a, id);
    expect(
      await failure(
        a.run((tx) => tx.update(documentLine).set({ documentId: draft }).where(eq(documentLine.id, second!))),
      ),
    ).toMatch(/cannot move/);
  });

  it('refuses inserting a document that is already issued', async () => {
    expect(
      await failure(
        a.run((tx) =>
          tx.insert(document).values({
            organisationId: a.actor.organisationId,
            kind: 'invoice',
            clientId: a.clientId,
            currency: 'GBP',
            lifecycle: 'issued',
            sequence: 900,
            number: 'INV-0900',
            total: 100,
            createdBy: a.actor.userId,
          }),
        ),
      ),
    ).toMatch(/created as drafts/);
  });

  it('refuses issuing a credit note above the invoice balance, even directly', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const [cn] = await a.run((tx) =>
      tx
        .insert(document)
        .values({
          organisationId: a.actor.organisationId,
          kind: 'credit_note',
          clientId: a.clientId,
          creditedDocumentId: id,
          currency: 'GBP',
          createdBy: a.actor.userId,
        })
        .returning({ id: document.id }),
    );
    expect(
      await failure(
        a.run((tx) =>
          tx
            .update(document)
            .set({ lifecycle: 'issued', sequence: 901, number: 'CN-0901', total: 50_000 })
            .where(eq(document.id, cn!.id)),
        ),
      ),
    ).toMatch(/more than the balance still owed/);
  });

  it('refuses voiding an invoice with a credit note, in the app and in the database', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        { mode: 'amount', invoiceId: id, amount: 1200, reason: 'Late', idempotencyKey: 'm2-void-0001' },
        NOW,
      ),
    );
    expect(await failure(a.run((tx) => voidDocument(tx, a.actor, id, 'Mistake', NOW)))).toMatch(
      /credit notes/,
    );
    expect(
      await failure(a.run((tx) => tx.update(document).set({ lifecycle: 'void' }).where(eq(document.id, id)))),
    ).toMatch(/credit notes cannot be voided/);
  });
});

describe('M5: a business that is not registered cannot charge tax', () => {
  it('refuses to issue an invoice with VAT, and issues one without', async () => {
    const b = await business('Sole Trader', false);
    const withVat = await b.run((tx) =>
      createDraft(tx, b.actor, draftFor(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }])),
    );
    expect(await failure(b.run((tx) => issueDocument(tx, b.actor, withVat, NOW)))).toMatch(/not registered/);
    const zeroRated = await b.run((tx) =>
      createDraft(tx, b.actor, draftFor(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.zero }])),
    );
    expect(await failure(b.run((tx) => issueDocument(tx, b.actor, zeroRated, NOW)))).toMatch(
      /not registered/,
    );
    const plain = await b.run((tx) =>
      createDraft(tx, b.actor, draftFor(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.none }])),
    );
    await b.run((tx) => issueDocument(tx, b.actor, plain, NOW));
  });
});

describe('M6: credit notes are not counted as paid', () => {
  it('an invoice closed by a credit note is credited, not paid, and top clients count payments only', async () => {
    const b = await business('Credit Office');
    const id = await issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);
    const part = await issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);
    await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        { mode: 'whole', invoiceId: id, reason: 'Cancelled', idempotencyKey: 'm6-whole-001' },
        NOW,
      ),
    );
    await b.run((tx) => recordPayment(tx, b.actor, pay(part, 2000, 'm6-pay-00001')));
    await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        {
          mode: 'amount',
          invoiceId: part,
          amount: 10_000,
          reason: 'Discount agreed',
          idempotencyKey: 'm6-rest-0001',
        },
        NOW,
      ),
    );
    const d = await b.run((tx) => getDocument(tx, id, TODAY));
    expect(d!.state).toBe('credited');
    const p = await b.run((tx) => getDocument(tx, part, TODAY));
    expect([p!.state, p!.balance]).toEqual(['settled', 0]);
    const paid = await b.run((tx) => listDocuments(tx, { today: TODAY, filter: 'paid' }));
    expect(paid.map((x) => x.id)).toEqual([part]);
    const dash = await b.run((tx) => getDashboard(tx, TODAY, 'GBP'));
    expect(dash.topClients.map((c) => c.paid)).toEqual([2000]);
  });
});

describe('L1: credit notes cannot be voided', () => {
  it('refuses voiding a credit note in the app and in the database', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const cn = await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        { mode: 'whole', invoiceId: id, reason: 'Cancelled', idempotencyKey: 'l1-void-0001' },
        NOW,
      ),
    );
    expect(await failure(a.run((tx) => voidDocument(tx, a.actor, cn.id, 'Oops', NOW)))).toMatch(
      /credit note cannot be voided/,
    );
    expect(
      await failure(
        a.run((tx) => tx.update(document).set({ lifecycle: 'void' }).where(eq(document.id, cn.id))),
      ),
    ).toMatch(/credit note cannot be voided/);
  });
});

describe('L2: stored files of record do not change', () => {
  it('refuses changing a stored file, or deleting one in use', async () => {
    const fileId = await a.run((tx) =>
      recordFile(tx, a.actor, {
        purpose: 'logo',
        contentType: 'image/png',
        byteSize: 10,
        sha256: 'a'.repeat(64),
        storageKey: 'logos/one.png',
      }),
    );
    expect(
      await failure(
        a.run((tx) =>
          tx.update(storedFile).set({ storageKey: 'logos/two.png' }).where(eq(storedFile.id, fileId)),
        ),
      ),
    ).toMatch(/cannot be changed/);
    await a.run((tx) =>
      tx.update(organisation).set({ logoFileId: fileId }).where(eq(organisation.id, a.actor.organisationId)),
    );
    expect(await failure(a.run((tx) => tx.delete(storedFile).where(eq(storedFile.id, fileId))))).toMatch(
      /in use/,
    );
    await a.run((tx) =>
      tx.update(organisation).set({ logoFileId: null }).where(eq(organisation.id, a.actor.organisationId)),
    );
    await a.run((tx) => tx.delete(storedFile).where(eq(storedFile.id, fileId)));
  });
});

describe('L3: the security-definer functions check what they are given', () => {
  it('finishing a job that is not running changes nothing', async () => {
    await a.run((tx) => enqueue(tx, a.actor, 'test.topic', { n: 1 }, 'l3-job-0001'));
    const [job] = await a.run((tx) =>
      tx.select().from(outbox).where(eq(outbox.idempotencyKey, 'l3-job-0001')),
    );
    await a.run((tx) => tx.execute(sql`select app.finish_outbox(${job!.id}::uuid, true, null)`));
    const [after] = await a.run((tx) => tx.select().from(outbox).where(eq(outbox.id, job!.id)));
    expect(after!.status).toBe('pending');
  });

  it('refuses a long trial, a bad currency code or an unknown time zone', async () => {
    const userId = a.actor.userId;
    const attempt = (trial: number, currency: string, zone: string) =>
      failure(
        withUser(t.db, userId, (tx) =>
          tx.execute(sql`select app.create_organisation('Extra', 'GB', ${currency}, ${zone}, ${trial})`),
        ),
      );
    expect(await attempt(365, 'GBP', 'Europe/London')).toMatch(/at most 30 days/);
    expect(await attempt(14, 'gbp', 'Europe/London')).toMatch(/not valid/);
    expect(await attempt(14, 'GBP', 'Mars/Olympus')).toMatch(/time zone/);
  });
});

describe('L4: rounding choices follow the country', () => {
  it('refuses per-line rounding down for a UK business', async () => {
    const org = await a.run((tx) => getOrganisation(tx, a.actor));
    const profile = {
      name: org.name,
      legalName: org.legalName,
      businessType: org.businessType,
      companyNumber: org.companyNumber,
      email: org.email,
      phone: org.phone,
      website: org.website,
      addressLine1: org.addressLine1,
      addressLine2: org.addressLine2,
      city: org.city,
      region: org.region,
      postcode: org.postcode,
      countryCode: org.countryCode,
      baseCurrency: org.baseCurrency,
      timeZone: org.timeZone,
      taxRegistered: org.taxRegistered,
      taxNumber: org.taxNumber,
      pricesIncludeTax: org.pricesIncludeTax,
      taxLevel: 'line' as const,
      rounding: 'down' as const,
      defaultPaymentTermsDays: org.defaultPaymentTermsDays,
      invoicePrefix: org.invoicePrefix,
      creditNotePrefix: org.creditNotePrefix,
      numberPadding: org.numberPadding,
      brandColour: org.brandColour,
      defaultTemplate: org.defaultTemplate,
      paymentDetails: org.paymentDetails as never,
      defaultNotes: org.defaultNotes,
      defaultTerms: org.defaultTerms,
    };
    expect(await failure(a.run((tx) => updateOrganisationProfile(tx, a.actor, profile)))).toMatch(/rounding/);
    await a.run((tx) =>
      updateOrganisationProfile(tx, a.actor, { ...profile, taxLevel: 'document', rounding: 'down' }),
    );
    await a.run((tx) =>
      updateOrganisationProfile(tx, a.actor, { ...profile, taxLevel: 'line', rounding: 'half-up' }),
    );
  });
});

describe('L8: saving a new invoice twice with the same key gives one invoice', () => {
  it('stores the key on the draft and finds it again', async () => {
    const input = draftFor(a, [{ quantity: 1000, unitPrice: 100, code: null }], {
      idempotencyKey: 'l8-save-0001',
    });
    const id = await a.run((tx) => createDraft(tx, a.actor, input));
    expect(await a.run((tx) => documentForKey(tx, 'l8-save-0001'))).toMatchObject({ id, lifecycle: 'draft' });
    expect(await failure(a.run((tx) => createDraft(tx, a.actor, input)))).toMatch(/already used|duplicate/i);
  });
});
