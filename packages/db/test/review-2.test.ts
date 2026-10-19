import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { DocumentSnapshot } from '@invoica/core';
import {
  createCreditNote,
  createDraft,
  documentForKey,
  getDocument,
  issueDocument,
  lockRequestKey,
} from '../src/documents';
import { getDashboard } from '../src/dashboard';
import { document, documentLine, organisation } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, draftFor, failure, issued, lineIds, type Business } from './business';

/**
 * Tests for the findings of the second independent review (docs/reviews/review-2.md). Each names its finding.
 * The credit ledger itself is tested in packages/core/test/credits.test.ts.
 */

let t: TestDatabase;
let a: Business;

beforeAll(async () => {
  t = await createTestDatabase();
  a = await business(t, 'Second Review Office');
});

afterAll(async () => {
  await t?.close();
});

async function creditNotesOf(b: Business, invoiceId: string) {
  return b.run((tx) =>
    tx
      .select({ total: document.total, taxTotal: document.taxTotal, snapshot: document.snapshot })
      .from(document)
      .where(eq(document.creditedDocumentId, invoiceId)),
  );
}

describe('R2-H1: line credits then an amount credit the VAT exactly', () => {
  it('£5,000 standard-rated and £5,000 zero-rated: the zero-rated line, then the rest as an amount', async () => {
    const id = await issued(a, [
      { quantity: 1000, unitPrice: 500_000, code: a.codes.vat20 },
      { quantity: 1000, unitPrice: 500_000, code: a.codes.zero },
    ]);
    const [, zeroLine] = await lineIds(a, id);
    await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        {
          mode: 'lines',
          invoiceId: id,
          lines: [{ lineId: zeroLine!, quantity: 1000 }],
          reason: 'Returned',
          idempotencyKey: 'r2h1-lines-01',
        },
        NOW,
      ),
    );
    await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        {
          mode: 'amount',
          invoiceId: id,
          amount: 500_000,
          reason: 'Cancelled',
          idempotencyKey: 'r2h1-amount-1',
        },
        NOW,
      ),
    );
    const d = await a.run((tx) => getDocument(tx, id, TODAY));
    const notes = await creditNotesOf(a, id);
    expect([d!.state, d!.balance]).toEqual(['credited', 0]);
    expect(notes.reduce((x, n) => x + n.taxTotal, 0)).toBe(100_000);
  });
});

describe('R2-M1: amount credits in parts', () => {
  it('two £8.37 credits and the rest credit exactly £20.00 of VAT and clear the balance', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    for (const [n, amount] of [837, 837, 8326].entries()) {
      await a.run((tx) =>
        createCreditNote(
          tx,
          a.actor,
          { mode: 'amount', invoiceId: id, amount, reason: 'Goodwill', idempotencyKey: `r2m1-part-0${n}` },
          NOW,
        ),
      );
    }
    const d = await a.run((tx) => getDocument(tx, id, TODAY));
    const notes = await creditNotesOf(a, id);
    expect([d!.state, d!.balance]).toEqual(['credited', 0]);
    expect(notes.reduce((x, n) => x + n.taxTotal, 0)).toBe(2000);
  });
});

describe('R2-M3: an amount credit is priced the way the invoice was', () => {
  it('shows the decrease before VAT on an invoice priced excluding VAT', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 50_000, code: a.codes.vat20 }]);
    const cn = await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        {
          mode: 'amount',
          invoiceId: id,
          amount: 30_000,
          reason: 'Late delivery',
          idempotencyKey: 'r2m3-basis-01',
        },
        NOW,
      ),
    );
    const d = await a.run((tx) => getDocument(tx, cn.id, TODAY));
    const snap = d!.document.snapshot as unknown as DocumentSnapshot;
    expect(snap.pricesIncludeTax).toBe(false);
    expect([snap.totals.net, snap.totals.taxTotal, snap.totals.total]).toEqual([30_000, 6000, 36_000]);
    expect(snap.lines[0]!.title).toMatch(/^Reduction on INV-\d+: Line 1$/);
  });
});

/** Takes the next credit note number from the counter, as issuing does. */
async function nextCreditNumber(b: Business): Promise<number> {
  const r = await b.run((tx) =>
    tx.execute<{ seq: number }>(
      sql`update number_counter set next_value = next_value + 1 where kind = 'credit_note' returning next_value - 1 as seq`,
    ),
  );
  return Number(r.rows[0]!.seq);
}

async function draftCreditNote(b: Business, invoiceId: string) {
  const [row] = await b.run((tx) =>
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
  return row!.id;
}

describe('R2-L1: the database checks credit note lines on issue', () => {
  it('refuses a credit note that credits more of a line than was invoiced, even directly', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.zero }]);
    const [lineId] = await lineIds(a, id);
    const cn = await draftCreditNote(a, id);
    await a.run((tx) =>
      tx.insert(documentLine).values({
        organisationId: a.actor.organisationId,
        documentId: cn,
        position: 0,
        title: 'Too many',
        quantity: 50_000,
        unitPrice: 200,
        creditedLineId: lineId!,
      }),
    );
    const sequence = await nextCreditNumber(a);
    expect(
      await failure(
        a.run((tx) =>
          tx
            .update(document)
            .set({ lifecycle: 'issued', sequence, number: `CN-${sequence}`, total: 10_000 })
            .where(eq(document.id, cn)),
        ),
      ),
    ).toMatch(/more of a line than was invoiced/);
  });

  it('refuses moving a draft credit note with lines to another invoice', async () => {
    const x = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const y = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const [lineId] = await lineIds(a, x);
    const cn = await draftCreditNote(a, x);
    await a.run((tx) =>
      tx.insert(documentLine).values({
        organisationId: a.actor.organisationId,
        documentId: cn,
        position: 0,
        title: 'Credit',
        quantity: 1000,
        unitPrice: 10_000,
        creditedLineId: lineId!,
      }),
    );
    expect(
      await failure(
        a.run((tx) => tx.update(document).set({ creditedDocumentId: y }).where(eq(document.id, cn))),
      ),
    ).toMatch(/cannot move to another invoice/);
  });

  it('refuses a number that did not come from the counter', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const cn = await draftCreditNote(a, id);
    expect(
      await failure(
        a.run((tx) =>
          tx
            .update(document)
            .set({ lifecycle: 'issued', sequence: 777, number: 'CN-0777', total: 100 })
            .where(eq(document.id, cn)),
        ),
      ),
    ).toMatch(/numbered from its counter/);
  });
});

describe('R2-L2: two overlapping repeats of the first save', () => {
  it('make one invoice, and both find it', async () => {
    const input = draftFor(a, [{ quantity: 1000, unitPrice: 4200, code: a.codes.vat20 }], {
      idempotencyKey: 'r2l2-save-0001',
    });
    const save = () =>
      a.run(async (tx) => {
        await lockRequestKey(tx, 'r2l2-save-0001');
        const earlier = await documentForKey(tx, 'r2l2-save-0001');
        if (earlier) return earlier.id;
        const id = await createDraft(tx, a.actor, input);
        await issueDocument(tx, a.actor, id, NOW);
        return id;
      });
    const [one, two] = await Promise.all([save(), save()]);
    expect(one).toBe(two);
    const found = await a.run((tx) =>
      tx.select({ id: document.id }).from(document).where(eq(document.idempotencyKey, 'r2l2-save-0001')),
    );
    expect(found).toHaveLength(1);
  });
});

describe('R2-L4: invoiced this month', () => {
  it('takes off credit notes issued this month', async () => {
    const b = await business(t, 'Month Office');
    await b.run((tx) =>
      tx
        .update(organisation)
        .set({ timeZone: 'Europe/London' })
        .where(eq(organisation.id, b.actor.organisationId)),
    );
    const id = await issued(b, [{ quantity: 1000, unitPrice: 100_000, code: b.codes.vat20 }]);
    await issued(b, [{ quantity: 1000, unitPrice: 50_000, code: b.codes.vat20 }]);
    await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        { mode: 'whole', invoiceId: id, reason: 'Cancelled', idempotencyKey: 'r2l4-whole-01' },
        NOW,
      ),
    );
    const dash = await b.run((tx) => getDashboard(tx, TODAY, 'GBP'));
    expect(dash.invoicedThisMonth).toEqual([{ currency: 'GBP', amount: 60_000 }]);
  });
});
