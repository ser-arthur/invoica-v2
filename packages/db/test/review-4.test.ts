import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { DocumentSnapshot } from '@invoica/core';
import { draftInput, organisationProfileInput } from '@invoica/schemas';
import { setClientArchived } from '../src/clients';
import {
  clientsForEditor,
  createCreditNote,
  createDraft,
  getDocument,
  issueDocument,
} from '../src/documents';
import { getOrganisation, updateOrganisationProfile } from '../src/organisations';
import { document, documentLine, organisation } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, draftFor, failure, issued, lineIds, type Business } from './business';

/**
 * Tests for the findings of the fourth independent review (docs/reviews/review-4.md). Each names its finding.
 * The ledger's own findings are tested in packages/core/test/credits-review-4.test.ts.
 */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

const snapshotOf = async (b: Business, id: string) =>
  (await b.run((tx) => getDocument(tx, id, TODAY)))!.document.snapshot as unknown as DocumentSnapshot;

const amountCredit = (b: Business, invoiceId: string, amount: number, key: string) =>
  b.run((tx) =>
    createCreditNote(
      tx,
      b.actor,
      { mode: 'amount', invoiceId, amount, reason: 'Goodwill', idempotencyKey: key },
      NOW,
    ),
  );

describe('R4-L3: an amount credit names the lines it reduces', () => {
  it('names every one of 140 lines, by position when their titles are too long to list', async () => {
    const b = await business(t, 'Long List Office');
    const input = draftInput.parse({
      ...draftFor(b, []),
      lines: Array.from({ length: 140 }, (_, i) => ({
        title: `Site visit and report, job ${String(i + 1).padStart(3, '0')}-B`,
        quantity: 1000,
        unitPrice: 1000,
        taxCodeId: b.codes.vat20,
      })),
    });
    const id = await b.run((tx) => createDraft(tx, b.actor, input));
    await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    const cn = await amountCredit(b, id, 5000, 'r4l3-many-0001');
    const line = (await snapshotOf(b, cn.id)).lines[0]!;
    expect(line.title).toMatch(/: 140 lines$/);
    expect(line.description).toMatch(/^Invoice lines 1 to 140/);
  });

  it('leaves out lines already credited in full', async () => {
    const b = await business(t, 'Kitchen Office');
    await b.run((tx) =>
      tx
        .update(organisation)
        .set({ taxLevel: 'document' })
        .where(eq(organisation.id, b.actor.organisationId)),
    );
    const id = await b.run(async (tx) => {
      const draft = await createDraft(
        tx,
        b.actor,
        draftInput.parse({
          ...draftFor(b, []),
          lines: [
            { title: 'Kitchen units', quantity: 1000, unitPrice: 200_000, taxCodeId: b.codes.vat20 },
            { title: 'Fitting', quantity: 1000, unitPrice: 50_000, taxCodeId: b.codes.vat20 },
          ],
        }),
      );
      await issueDocument(tx, b.actor, draft, NOW);
      return draft;
    });
    const [units] = await lineIds(b, id);
    await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        {
          mode: 'lines',
          invoiceId: id,
          lines: [{ lineId: units!, quantity: 1000 }],
          reason: 'Returned',
          idempotencyKey: 'r4l3-units-001',
        },
        NOW,
      ),
    );
    const cn = await amountCredit(b, id, 1000, 'r4l3-rest-0001');
    expect((await snapshotOf(b, cn.id)).lines[0]!.title).toMatch(/: Fitting$/);
  });
});

describe('R4-L4: numbering', () => {
  it('refuses a prefix whose numbers would repeat ones already used', async () => {
    const b = await business(t, 'Prefix Office');
    await b.run((tx) =>
      tx
        .update(organisation)
        .set({ invoicePrefix: 'Q1', numberPadding: 1 })
        .where(eq(organisation.id, b.actor.organisationId)),
    );
    for (let i = 0; i < 10; i++) await issued(b, [{ quantity: 1000, unitPrice: 1000, code: b.codes.vat20 }]);
    const org = await b.run((tx) => getOrganisation(tx, b.actor));
    const input = organisationProfileInput.parse({ ...org, invoicePrefix: 'Q' });
    expect(await failure(b.run((tx) => updateOrganisationProfile(tx, b.actor, input)))).toMatch(
      /Q11 is already used/,
    );
    const later = organisationProfileInput.parse({ ...org, invoicePrefix: 'R-' });
    await b.run((tx) => updateOrganisationProfile(tx, b.actor, later));
  });

  it('an issue that meets a settings save in progress waits for it and uses the new prefix', async () => {
    const b = await business(t, 'Race Office');
    const draft = await b.run((tx) =>
      createDraft(tx, b.actor, draftFor(b, [{ quantity: 1000, unitPrice: 1000, code: b.codes.vat20 }])),
    );
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let saved!: () => void;
    const started = new Promise<void>((resolve) => (saved = resolve));
    const save = b.run(async (tx) => {
      await tx
        .update(organisation)
        .set({ invoicePrefix: 'NEW-' })
        .where(eq(organisation.id, b.actor.organisationId));
      saved();
      await gate;
    });
    await started;
    const issue = b.run((tx) => issueDocument(tx, b.actor, draft, NOW));
    await new Promise((resolve) => setTimeout(resolve, 300));
    release();
    await save;
    await issue;
    expect((await snapshotOf(b, draft)).number).toBe('NEW-0001');
  });
});

/** Takes the next credit note number from the counter, as issuing does, and formats it as the organisation does. */
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

/** A draft credit note with one line crediting the invoice's first line in full, at `unitPrice`. */
async function creditingFirstLine(b: Business, invoiceId: string, unitPrice?: number) {
  const cn = await draftCreditNote(b, invoiceId);
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
      documentId: cn,
      position: 0,
      title: first!.title,
      quantity: first!.quantity,
      unitPrice: unitPrice ?? first!.unitPrice,
      tax: first!.tax,
      creditedLineId: first!.id,
    }),
  );
  return cn;
}

const issueDirectly = async (
  b: Business,
  id: string,
  total: number,
  taxTotal: number,
  snapshot: Record<string, unknown>,
) => {
  const { sequence, number } = await nextCreditNumber(b);
  return b.run((tx) =>
    tx
      .update(document)
      .set({
        lifecycle: 'issued',
        sequence,
        number,
        total,
        taxTotal,
        snapshot,
        issueDate: TODAY,
        issuedAt: NOW,
      })
      .where(eq(document.id, id)),
  );
};

describe('R4-L5: the database checks a credit note’s figures on issue', () => {
  it('refuses a line that credits an invoice line at another price', async () => {
    const b = await business(t, 'Price Office');
    const id = await issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);
    const cn = await creditingFirstLine(b, id, 100_000);
    expect(await failure(issueDirectly(b, cn, 12_000, 2000, {}))).toMatch(
      /price and tax of the line it credits/,
    );
  });

  it('refuses figures that are not its snapshot’s', async () => {
    const b = await business(t, 'Figures Office');
    const id = await issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);
    const cn = await creditingFirstLine(b, id);
    expect(await failure(issueDirectly(b, cn, 12_000, 2000, {}))).toMatch(/must match its snapshot/);
  });

  it('refuses more tax than the invoice charged', async () => {
    const b = await business(t, 'Tax Office');
    const id = await issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);
    const row = (await snapshotOf(b, id)).totals.taxes[0]!;
    const cn = await creditingFirstLine(b, id);
    const snapshot = {
      totals: { total: 12_000, taxTotal: 12_000, taxes: [{ ...row, amount: 12_000 }] },
    };
    expect(await failure(issueDirectly(b, cn, 12_000, 12_000, snapshot))).toMatch(
      /more tax than the invoice/,
    );
  });
});

describe('R4-L6: a client already in the account can always be invoiced', () => {
  it('the editor offers archived clients too, marked as archived', async () => {
    const b = await business(t, 'Archive Office');
    await b.run((tx) => setClientArchived(tx, b.actor, b.clientId, true));
    const clients = await b.run((tx) => clientsForEditor(tx));
    expect(clients.map((c) => [c.row.id, c.archived])).toEqual([[b.clientId, true]]);
  });
});
