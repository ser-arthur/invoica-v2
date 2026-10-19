import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { DocumentSnapshot } from '@invoica/core';
import { createCreditNote, createDraft, getDocument, issueDocument } from '../src/documents';
import { organisation } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, draftFor, failure, type Business } from './business';

/** docs/specs/vat-in-sterling.md, acceptance criteria 5 to 7, with rates as units of the currency to £1. */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

/** €100.00 plus VAT at 20%, from a UK VAT-registered business. */
const euroDraft = (b: Business, sterlingRate?: string) =>
  b.run((tx) =>
    createDraft(
      tx,
      b.actor,
      draftFor(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }], {
        currency: 'EUR',
        supplyDate: '2026-10-16',
        ...(sterlingRate === undefined ? {} : { sterlingRate }),
      }),
    ),
  );

const snapshotOf = async (b: Business, id: string) =>
  (await b.run((tx) => getDocument(tx, id, TODAY)))!.document.snapshot as unknown as DocumentSnapshot;

describe('criterion 5: a rate is needed', () => {
  it('issuing a UK VAT invoice in euros without a rate is refused', async () => {
    const b = await business(t, 'Euro Office');
    const id = await euroDraft(b);
    expect(await failure(b.run((tx) => issueDocument(tx, b.actor, id, NOW)))).toMatch(/exchange rate/);
  });

  it('a rate written wrongly is refused when the draft is saved', async () => {
    const b = await business(t, 'Typo Office');
    expect(await failure(euroDraft(b, '1,15'))).toMatch(/rate/);
  });

  it('a sterling invoice, or one with no VAT, needs no rate', async () => {
    const b = await business(t, 'Pound Office');
    const pounds = await b.run((tx) =>
      createDraft(tx, b.actor, draftFor(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }])),
    );
    await b.run((tx) => issueDocument(tx, b.actor, pounds, NOW));
    expect((await snapshotOf(b, pounds)).sterlingVat).toBeUndefined();
    const outside = await b.run((tx) =>
      createDraft(
        tx,
        b.actor,
        draftFor(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.none }], { currency: 'EUR' }),
      ),
    );
    await b.run((tx) => issueDocument(tx, b.actor, outside, NOW));
  });
});

describe('criterion 6: the invoice keeps the rate, its method and date, and the VAT in sterling', () => {
  it('with HMRC’s period rate, the month of the tax point', async () => {
    const b = await business(t, 'Period Office');
    const id = await euroDraft(b, '1.1500');
    await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    // €20.00 at €1.15 to £1 is £17.391..., so £17.39.
    expect((await snapshotOf(b, id)).sterlingVat).toEqual({
      rate: 1_150_000,
      method: 'hmrc_period',
      rateDate: '2026-10-01',
      charged: 1739,
      reverseCharge: 0,
    });
  });

  it('with the UK market selling rate, the tax point itself', async () => {
    const b = await business(t, 'Market Office');
    await b.run((tx) =>
      tx
        .update(organisation)
        .set({ sterlingRateMethod: 'market' })
        .where(eq(organisation.id, b.actor.organisationId)),
    );
    const id = await euroDraft(b, '1.1612');
    await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    const kept = (await snapshotOf(b, id)).sterlingVat!;
    expect([kept.method, kept.rateDate, kept.charged]).toEqual(['market', '2026-10-16', 1722]);
  });
});

describe('criterion 7: a credit note uses the invoice’s rate', () => {
  it('and keeps the VAT it credits in sterling', async () => {
    const b = await business(t, 'Credit Euro Office');
    const id = await euroDraft(b, '1.1500');
    await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    await b.run((tx) =>
      tx
        .update(organisation)
        .set({ sterlingRateMethod: 'market' })
        .where(eq(organisation.id, b.actor.organisationId)),
    );
    const cn = await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        {
          mode: 'amount',
          invoiceId: id,
          amount: 5000,
          reason: 'Half returned',
          idempotencyKey: 'eur-credit-01',
        },
        NOW,
      ),
    );
    // €10.00 of VAT at the invoice's €1.15 to £1 is £8.70.
    expect((await snapshotOf(b, cn.id)).sterlingVat).toEqual({
      rate: 1_150_000,
      method: 'hmrc_period',
      rateDate: '2026-10-01',
      charged: 870,
      reverseCharge: 0,
    });
  });
});
