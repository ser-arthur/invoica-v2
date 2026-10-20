import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { DocumentSnapshot } from '@invoica/core';
import { createCreditNote, createDraft, getDocument, issueDocument, updateDraft } from '../src/documents';
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

describe('credit notes in pieces', () => {
  it('ten notes of a tenth credit exactly the sterling the invoice charged', async () => {
    const b = await business(t, 'Pieces Office');
    const id = await euroDraft(b, '1.1500');
    await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    expect((await snapshotOf(b, id)).sterlingVat?.charged).toBe(1739);
    const notes: number[] = [];
    for (let i = 0; i < 10; i++) {
      const cn = await b.run((tx) =>
        createCreditNote(
          tx,
          b.actor,
          {
            mode: 'amount',
            invoiceId: id,
            amount: 1000,
            reason: 'Part returned',
            idempotencyKey: `pieces-${i}-cn`,
          },
          NOW,
        ),
      );
      notes.push((await snapshotOf(b, cn.id)).sterlingVat!.charged);
    }
    expect(notes.reduce((a, n) => a + n, 0)).toBe(1739);
    expect(notes.at(-1)).toBe(173);
  });
});

describe('a rate belongs to the currency and month it was entered for', () => {
  const lines = (b: Business) => [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }];

  it('a rate kept when the currency changes is refused, and the right one is accepted', async () => {
    const b = await business(t, 'Currency Change Office');
    const id = await euroDraft(b, '1.1500');
    const yen = draftFor(b, lines(b), { currency: 'JPY', supplyDate: '2026-10-16', sterlingRate: '1.1500' });
    expect(await failure(b.run((tx) => updateDraft(tx, b.actor, id, yen)))).toMatch(
      /The exchange rate was entered for EUR\. Enter the rate for JPY\./,
    );
    await b.run((tx) =>
      updateDraft(
        tx,
        b.actor,
        id,
        draftFor(b, lines(b), { currency: 'JPY', supplyDate: '2026-10-16', sterlingRate: '190.25' }),
      ),
    );
    await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    expect((await snapshotOf(b, id)).sterlingVat?.rate).toBe(190_250_000);
  });

  it('with HMRC’s period rate, a rate kept when the tax point moves to another month is refused', async () => {
    const b = await business(t, 'Month Change Office');
    const id = await euroDraft(b, '1.1500');
    const november = draftFor(b, lines(b), {
      currency: 'EUR',
      supplyDate: '2026-11-02',
      sterlingRate: '1.1500',
    });
    expect(await failure(b.run((tx) => updateDraft(tx, b.actor, id, november)))).toMatch(
      /The exchange rate was entered for October 2026\. Enter HMRC’s rate for November 2026\./,
    );
  });

  it('a draft with no dates, saved in October and issued in November, asks for November’s rate', async () => {
    const b = await business(t, 'Late Issue Office');
    const id = await b.run((tx) =>
      createDraft(
        tx,
        b.actor,
        draftFor(b, lines(b), { currency: 'EUR', sterlingRate: '1.1500' }),
        new Date('2026-10-30T12:00:00Z'),
      ),
    );
    expect(
      await failure(b.run((tx) => issueDocument(tx, b.actor, id, new Date('2026-11-02T10:00:00Z')))),
    ).toMatch(/The exchange rate was entered for October 2026\. Enter HMRC’s rate for November 2026\./);
    await b.run((tx) =>
      updateDraft(
        tx,
        b.actor,
        id,
        draftFor(b, lines(b), { currency: 'EUR', sterlingRate: '1.1520' }),
        new Date('2026-11-02T10:00:00Z'),
      ),
    );
    await b.run((tx) => issueDocument(tx, b.actor, id, new Date('2026-11-02T10:00:00Z')));
    const kept = (await snapshotOf(b, id)).sterlingVat!;
    expect([kept.rate, kept.rateDate]).toEqual([1_152_000, '2026-11-01']);
  });

  it('a draft moved to pounds keeps working: it needs no rate', async () => {
    const b = await business(t, 'To Pounds Office');
    const id = await euroDraft(b, '1.1500');
    await b.run((tx) =>
      updateDraft(
        tx,
        b.actor,
        id,
        draftFor(b, lines(b), { currency: 'GBP', supplyDate: '2026-10-16', sterlingRate: '1.1500' }),
      ),
    );
    await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    expect((await snapshotOf(b, id)).sterlingVat).toBeUndefined();
  });
});
