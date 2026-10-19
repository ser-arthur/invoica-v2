import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { DocumentSnapshot } from '@invoica/core';
import { draftInput, organisationProfileInput } from '@invoica/schemas';
import { createCreditNote, createDraft, getDocument, issueDocument } from '../src/documents';
import { getOrganisation, updateOrganisationProfile } from '../src/organisations';
import { document, documentLine, organisation } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, draftFor, failure, issued, type Business } from './business';

/** Tests for the findings of the fifth independent review (docs/reviews/review-5.md). Each names its finding. */

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

describe('R5-L2: the database checks a credit note’s tax rows as a whole', () => {
  let b: Business;
  let row: DocumentSnapshot['totals']['taxes'][number];
  const invoice = () => issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);

  beforeAll(async () => {
    b = await business(t, 'Rows Office');
    row = (await snapshotOf(b, await invoice())).totals.taxes[0]!;
  });

  it('refuses a tax total with no tax rows', async () => {
    expect(await failure(issueCreditDirectly(b, await invoice(), 2000, []))).toMatch(
      /tax total must be its charged tax/,
    );
  });

  it('refuses the same tax twice in one note beyond what the invoice charged', async () => {
    expect(await failure(issueCreditDirectly(b, await invoice(), 4000, [row, row]))).toMatch(
      /more tax than the invoice/,
    );
  });

  it('refuses negative and missing amounts', async () => {
    const id = await invoice();
    expect(await failure(issueCreditDirectly(b, id, -500, [{ ...row, amount: -500, base: -2500 }]))).toMatch(
      /whole numbers of zero or more/,
    );
    expect(await failure(issueCreditDirectly(b, id, 0, [{ ...row, amount: null, base: null }]))).toMatch(
      /whole numbers of zero or more/,
    );
  });

  it('refuses moving a number counter by more than one', async () => {
    expect(
      await failure(
        b.run((tx) =>
          tx.execute(sql`update number_counter set next_value = next_value + 5 where kind = 'invoice'`),
        ),
      ),
    ).toMatch(/one at a time/);
  });
});

const profile = async (b: Business, change: Record<string, unknown>) => {
  const org = await b.run((tx) => getOrganisation(tx, b.actor));
  return organisationProfileInput.parse({ ...org, ...change });
};

describe('R5-L3 and R5-L4: numbering settings', () => {
  it('a prefix saved while an invoice is being issued is checked against that invoice’s number', async () => {
    const b = await business(t, 'Timing Office');
    await b.run((tx) =>
      tx
        .update(organisation)
        .set({ invoicePrefix: 'Q1', numberPadding: 1 })
        .where(eq(organisation.id, b.actor.organisationId)),
    );
    const draft = await b.run((tx) =>
      createDraft(tx, b.actor, draftFor(b, [{ quantity: 1000, unitPrice: 1000, code: b.codes.vat20 }])),
    );
    const input = await profile(b, { invoicePrefix: 'Q' });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let issuedNow!: () => void;
    const done = new Promise<void>((resolve) => (issuedNow = resolve));
    const issue = b.run(async (tx) => {
      await issueDocument(tx, b.actor, draft, NOW);
      issuedNow();
      await gate;
    });
    await done;
    const save = failure(b.run((tx) => updateOrganisationProfile(tx, b.actor, input)));
    await new Promise((resolve) => setTimeout(resolve, 300));
    release();
    await issue;
    expect(await save).toMatch(/Q11 is already used/);
  });

  it('refuses invoice and credit note prefixes whose numbers could be the same', async () => {
    const b = await business(t, 'Same Prefix Office');
    expect(
      await failure(
        b.run(async (tx) =>
          updateOrganisationProfile(
            tx,
            b.actor,
            await profile(b, { invoicePrefix: 'DOC-', creditNotePrefix: 'DOC-' }),
          ),
        ),
      ),
    ).toMatch(/could be the same/);
    expect(
      await failure(
        b.run(async (tx) =>
          updateOrganisationProfile(
            tx,
            b.actor,
            await profile(b, { invoicePrefix: 'A', creditNotePrefix: 'A1' }),
          ),
        ),
      ),
    ).toMatch(/could be the same/);
    await b.run(async (tx) =>
      updateOrganisationProfile(
        tx,
        b.actor,
        await profile(b, { invoicePrefix: 'INV', creditNotePrefix: 'INV-C' }),
      ),
    );
  });
});

describe('R5-L6: wording of an amount credit on one long line', () => {
  it('names the line by position without “1 lines”', async () => {
    const b = await business(t, 'Long Title Office');
    const id = await b.run(async (tx) => {
      const draft = await createDraft(
        tx,
        b.actor,
        draftInput.parse({
          ...draftFor(b, []),
          lines: [{ title: 'A'.repeat(200), quantity: 1000, unitPrice: 10_000, taxCodeId: b.codes.vat20 }],
        }),
      );
      await issueDocument(tx, b.actor, draft, NOW);
      return draft;
    });
    const cn = await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        { mode: 'amount', invoiceId: id, amount: 1000, reason: 'Goodwill', idempotencyKey: 'r5l6-long-0001' },
        NOW,
      ),
    );
    const line = (await snapshotOf(b, cn.id)).lines[0]!;
    expect(line.title).toMatch(/: line 1$/);
    expect(line.description).toMatch(/^Invoice line 1: A+$/);
  });
});
