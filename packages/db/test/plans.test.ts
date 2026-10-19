import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { DocumentSnapshot } from '@invoica/core';
import { createClient, setClientArchived } from '../src/clients';
import { getDocument } from '../src/documents';
import { organisation } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { TODAY, business, failure, issued, type Business } from './business';

/** Acceptance criteria: docs/specs/plans.md. Plans are enforced for this file only. */

let t: TestDatabase;
const before = process.env.INVOICA_PLANS;

beforeAll(async () => {
  process.env.INVOICA_PLANS = 'enforced';
  t = await createTestDatabase();
});

afterAll(async () => {
  process.env.INVOICA_PLANS = before;
  await t?.close();
});

const client = (name: string) => ({
  name,
  contactName: null,
  email: null,
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

async function brand(b: Business) {
  await b.run((tx) =>
    tx
      .update(organisation)
      .set({ brandColour: '#4338ca', defaultTemplate: 'poster' })
      .where(eq(organisation.id, b.actor.organisationId)),
  );
}

async function endTrial(b: Business) {
  await b.run((tx) =>
    tx
      .update(organisation)
      .set({ trialEndsAt: new Date('2026-01-01T00:00:00Z') })
      .where(eq(organisation.id, b.actor.organisationId)),
  );
}

describe('criteria 2 and 3: active clients', () => {
  it('a trial organisation adds as many clients as it likes; on the free plan, three active at most', async () => {
    const b = await business(t, 'Plan Office');
    const extra: string[] = [];
    for (const n of [2, 3, 4])
      extra.push(await b.run((tx) => createClient(tx, b.actor, client(`Client ${n}`))));
    await endTrial(b);
    expect(await failure(b.run((tx) => createClient(tx, b.actor, client('Client 5'))))).toMatch(
      /three active clients/,
    );

    // Invoices can still be issued to every client added during the trial.
    await issued(b, [{ quantity: 1000, unitPrice: 1000, code: b.codes.vat20 }]);

    await b.run((tx) => setClientArchived(tx, b.actor, extra[0]!, true));
    await b.run((tx) => setClientArchived(tx, b.actor, extra[1]!, true));
    await b.run((tx) => createClient(tx, b.actor, client('Client 5')));
    expect(await failure(b.run((tx) => setClientArchived(tx, b.actor, extra[0]!, false)))).toMatch(
      /three active clients/,
    );
  });
});

describe('criteria 4 and 5: how documents look', () => {
  it('on the trial, documents keep the organisation template and colour, without the mark', async () => {
    const b = await business(t, 'Trial Studio');
    await brand(b);
    const id = await issued(b, [{ quantity: 1000, unitPrice: 1000, code: b.codes.vat20 }], {
      template: 'poster',
    });
    const snap = (await b.run((tx) => getDocument(tx, id, TODAY)))!.document
      .snapshot as unknown as DocumentSnapshot;
    expect([snap.template, snap.seller.brandColour, snap.madeWithInvoica]).toEqual([
      'poster',
      '#4338ca',
      false,
    ]);
  });

  it('on the free plan, documents use Signature and Invoica colour, and show the mark', async () => {
    const b = await business(t, 'Free Studio');
    await brand(b);
    await endTrial(b);
    const id = await issued(b, [{ quantity: 1000, unitPrice: 1000, code: b.codes.vat20 }], {
      template: 'poster',
    });
    const snap = (await b.run((tx) => getDocument(tx, id, TODAY)))!.document
      .snapshot as unknown as DocumentSnapshot;
    expect([snap.template, snap.seller.brandColour, snap.seller.logoFileId, snap.madeWithInvoica]).toEqual([
      'signature',
      '#17795a',
      null,
      true,
    ]);
  });
});
