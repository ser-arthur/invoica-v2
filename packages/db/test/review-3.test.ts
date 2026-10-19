import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { DocumentSnapshot } from '@invoica/core';
import { createDatabase } from '../src/client';
import { createCreditNote, creditPosition, getDocument, lockDocument, recordPayment } from '../src/documents';
import { getDashboard } from '../src/dashboard';
import { document, documentLine, organisation } from '../src/schema';
import { ADMIN_URL, createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, failure, issued, lineIds, pay, type Business } from './business';

/**
 * Tests for the findings of the third independent review (docs/reviews/review-3.md). Each names its finding.
 * The ledger itself is tested in packages/core/test/credits-review-3.test.ts.
 */

let t: TestDatabase;
let a: Business;

beforeAll(async () => {
  t = await createTestDatabase();
  a = await business(t, 'Third Review Office');
});

afterAll(async () => {
  await t?.close();
});

const snapshotOf = async (b: Business, id: string) =>
  (await b.run((tx) => getDocument(tx, id, TODAY)))!.document.snapshot as unknown as DocumentSnapshot;

/** Runs SQL on the test database without its triggers, to stand in for records written by earlier versions. */
async function asEarlierVersion(statement: ReturnType<typeof sql>) {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${t.name}`;
  const admin = createDatabase(url.toString(), { max: 1 });
  try {
    await admin.db.transaction(async (tx) => {
      await tx.execute(sql`set local session_replication_role = replica`);
      await tx.execute(statement);
    });
  } finally {
    await admin.pool.end();
  }
}

describe('R3-M1: everything still owed after a part payment', () => {
  it('£100.00 plus VAT with £60.03 paid credits £59.97 exactly and settles the invoice', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    await a.run((tx) => recordPayment(tx, a.actor, pay(id, 6003, 'r3m1-payment-01')));
    const cn = await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        { mode: 'balance', invoiceId: id, reason: 'Rest waived', idempotencyKey: 'r3m1-balance-01' },
        NOW,
      ),
    );
    const note = await snapshotOf(a, cn.id);
    expect([note.totals.net, note.totals.taxTotal, note.totals.total]).toEqual([4998, 999, 5997]);
    const d = await a.run((tx) => getDocument(tx, id, TODAY));
    expect([d!.state, d!.balance]).toEqual(['settled', 0]);
  });
});

describe('R3-L1 and R3-L2: the invoice keeps its slots, and credit notes keep what they took', () => {
  it('a whole line under VAT per line credits the VAT that line was charged', async () => {
    const id = await issued(a, [
      ...Array.from({ length: 10 }, () => ({ quantity: 1000, unitPrice: 3, code: a.codes.vat20 })),
      { quantity: 1000, unitPrice: 100_000, code: a.codes.vat20 },
    ]);
    const invoiceSnapshot = await snapshotOf(a, id);
    expect(invoiceSnapshot.slots).toHaveLength(11);
    const lines = await lineIds(a, id);
    const cn = await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        {
          mode: 'lines',
          invoiceId: id,
          lines: [{ lineId: lines[10]!, quantity: 1000 }],
          reason: 'Returned',
          idempotencyKey: 'r3l1-lines-001',
        },
        NOW,
      ),
    );
    const note = await snapshotOf(a, cn.id);
    expect(note.totals.taxTotal).toBe(20_000);
    expect(note.ledger).toEqual({
      lines: [{ index: 10, quantity: 1000 }],
      slots: [{ slot: 'line:10', value: 100_000, taxes: [{ base: 100_000, amount: 20_000 }] }],
    });
  });
});

describe('criterion 12 (R3-L2): records from earlier versions', () => {
  it('an invoice whose credit note kept no ledger cannot be credited again, says so, and its page data still loads', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const cn = await a.run((tx) =>
      createCreditNote(
        tx,
        a.actor,
        { mode: 'amount', invoiceId: id, amount: 2000, reason: 'Goodwill', idempotencyKey: 'r3l2-legacy-01' },
        NOW,
      ),
    );
    await asEarlierVersion(sql`update document set snapshot = snapshot - 'ledger' where id = ${cn.id}`);
    const position = await a.run(async (tx) => creditPosition(tx, await lockDocument(tx, id)));
    expect(position.ok).toBe(false);
    if (!position.ok) expect(position.reason).toMatch(/earlier version/);
    expect(
      await failure(
        a.run((tx) =>
          createCreditNote(
            tx,
            a.actor,
            { mode: 'amount', invoiceId: id, amount: 1000, reason: 'More', idempotencyKey: 'r3l2-legacy-02' },
            NOW,
          ),
        ),
      ),
    ).toMatch(/earlier version/);
  });

  it('an invoice without slots whose figures cannot be worked out again cannot be credited, and says so', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    await asEarlierVersion(
      sql`update document set snapshot = jsonb_set(snapshot - 'slots', '{totals,taxTotal}', '1999') where id = ${id}`,
    );
    const position = await a.run(async (tx) => creditPosition(tx, await lockDocument(tx, id)));
    expect(position.ok).toBe(false);
  });

  it('an invoice without slots whose figures do work out again can still be credited', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    await asEarlierVersion(sql`update document set snapshot = snapshot - 'slots' where id = ${id}`);
    const position = await a.run(async (tx) => creditPosition(tx, await lockDocument(tx, id)));
    expect(position.ok).toBe(true);
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

const issueAs = (b: Business, id: string, sequence: number, number: string, total: number) =>
  b.run((tx) =>
    tx
      .update(document)
      .set({ lifecycle: 'issued', sequence, number, total, snapshot: {}, issueDate: TODAY, issuedAt: NOW })
      .where(eq(document.id, id)),
  );

describe('R3-L3: the database checks the rest of a credit note on issue', () => {
  it('refuses a printed number that is not the prefix and the padded sequence', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const cn = await draftCreditNote(a, id);
    const sequence = await nextCreditNumber(a);
    expect(await failure(issueAs(a, cn, sequence, 'INV-0001-REISSUE', 100))).toMatch(
      /number must be its prefix and sequence/,
    );
  });

  it('refuses a line that credits no invoice line at a tax the invoice did not use', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.zero }]);
    const cn = await draftCreditNote(a, id);
    await a.run((tx) =>
      tx.insert(documentLine).values({
        organisationId: a.actor.organisationId,
        documentId: cn,
        position: 0,
        title: 'Credit',
        quantity: 1000,
        unitPrice: 8334,
        tax: {
          label: 'Standard rate',
          treatment: 'standard',
          components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
        },
      }),
    );
    const sequence = await nextCreditNumber(a);
    const [org] = await a.run((tx) => tx.select().from(organisation));
    const number = `${org!.creditNotePrefix}${String(sequence).padStart(org!.numberPadding, '0')}`;
    expect(await failure(issueAs(a, cn, sequence, number, 10_000))).toMatch(/tax the invoice used/);
  });

  it('refuses turning a draft invoice into a credit note', async () => {
    const id = await issued(a, [{ quantity: 1000, unitPrice: 10_000, code: a.codes.vat20 }]);
    const [draft] = await a.run((tx) =>
      tx
        .insert(document)
        .values({
          organisationId: a.actor.organisationId,
          kind: 'invoice',
          clientId: a.clientId,
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
            .set({ kind: 'credit_note', creditedDocumentId: id })
            .where(eq(document.id, draft!.id)),
        ),
      ),
    ).toMatch(/kind of a document cannot change/);
  });
});

describe('R3-L5: invoiced this month', () => {
  it('shows what was invoiced and what was credited beside the net figure', async () => {
    const b = await business(t, 'Month Office Three');
    const id = await issued(b, [{ quantity: 1000, unitPrice: 100_000, code: b.codes.vat20 }]);
    await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        { mode: 'whole', invoiceId: id, reason: 'Cancelled', idempotencyKey: 'r3l5-whole-01' },
        NOW,
      ),
    );
    const dash = await b.run((tx) => getDashboard(tx, TODAY, 'GBP'));
    expect(dash.invoicedThisMonth).toEqual([{ currency: 'GBP', amount: 0 }]);
    expect(dash.issuedThisMonth).toEqual([{ currency: 'GBP', amount: 120_000 }]);
    expect(dash.creditedThisMonth).toEqual([{ currency: 'GBP', amount: 120_000 }]);
  });
});
