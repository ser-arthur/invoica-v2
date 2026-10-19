import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { DocumentSnapshot } from '@invoica/core';
import { getDocument } from '../src/documents';
import { document, documentLine, organisation } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, failure, issued, type Business } from './business';

/** Tests for the findings of the seventh independent review (docs/reviews/review-7.md). */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

const snapshotOf = async (b: Business, id: string) =>
  (await b.run((tx) => getDocument(tx, id, TODAY)))!.document.snapshot as unknown as DocumentSnapshot;

async function nextCreditNumber(b: Business) {
  const r = await b.run((tx) =>
    tx.execute<{ seq: number }>(
      sql`update number_counter set next_value = next_value + 1 where kind = 'credit_note' returning next_value - 1 as seq`,
    ),
  );
  const sequence = Number(r.rows[0]!.seq);
  const [org] = await b.run((tx) => tx.select().from(organisation));
  return {
    sequence,
    number: `${org!.creditNotePrefix}${String(sequence).padStart(org!.numberPadding, '0')}`,
  };
}

/** A draft credit note crediting the invoice's first line in full, issued directly with the given figures. */
async function issueCreditDirectly(b: Business, invoiceId: string, taxTotal: number, taxes: unknown[]) {
  const [cn] = await b.run((tx) =>
    tx
      .insert(document)
      .values({
        organisationId: b.actor.organisationId,
        kind: 'credit_note',
        clientId: b.clientId,
        creditedDocumentId: invoiceId,
        currency: 'GBP',
        createdBy: b.actor.userId,
      })
      .returning({ id: document.id }),
  );
  const [first] = await b.run((tx) =>
    tx
      .select()
      .from(documentLine)
      .where(eq(documentLine.documentId, invoiceId))
      .orderBy(documentLine.position),
  );
  await b.run((tx) =>
    tx.insert(documentLine).values({
      organisationId: b.actor.organisationId,
      documentId: cn!.id,
      position: 0,
      title: first!.title,
      quantity: first!.quantity,
      unitPrice: first!.unitPrice,
      tax: first!.tax,
      creditedLineId: first!.id,
    }),
  );
  const { sequence, number } = await nextCreditNumber(b);
  // A small net keeps the note within the balance, so only the tax checks can refuse it.
  const total = 1000 + taxTotal;
  return b.run((tx) =>
    tx
      .update(document)
      .set({
        lifecycle: 'issued',
        sequence,
        number,
        total,
        taxTotal,
        snapshot: { totals: { total, taxTotal, taxes } },
        issueDate: TODAY,
        issuedAt: NOW,
      })
      .where(eq(document.id, cn!.id)),
  );
}

describe('R7-L1: a credit note’s tax rows keep the invoice’s charged or shown status', () => {
  it('refuses a VAT row marked as not charged against VAT the invoice charged', async () => {
    const b = await business(t, 'Charged Office');
    const id = await issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);
    const row = (await snapshotOf(b, id)).totals.taxes[0]!;
    expect(
      await failure(issueCreditDirectly(b, id, 0, [{ ...row, amount: 2000, base: 10_000, charged: false }])),
    ).toMatch(/charged as the invoice/);
  });
});
