import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import type { DraftInput } from '@invoica/schemas';
import { draftInput } from '@invoica/schemas';
import { formatMoney, type DocumentSnapshot } from '@invoica/core';
import { createClient, updateClient } from '../src/clients';
import {
  createCreditNote,
  createDraft,
  deleteDraft,
  duplicateDocument,
  getDocument,
  issueDocument,
  listDocuments,
  markSent,
  recordPayment,
  removePayment,
  updateDraft,
  voidDocument,
} from '../src/documents';
import { getDashboard } from '../src/dashboard';
import { createTaxCode } from '../src/taxes';
import { drainOutbox } from '../src/outbox';
import { document, documentLine, organisation, outbox } from '../src/schema';
import { withOrganisation, type Actor } from '../src/tenancy';
import { createTestDatabase, createUserWithOrganisation, type TestDatabase } from './helpers';

const NOW = new Date('2026-10-18T10:00:00Z');
const TODAY = '2026-10-18';

let t: TestDatabase;
let actor: Actor;
let clientId: string;
let vat20: string;

const run = <T>(fn: Parameters<typeof withOrganisation<T>>[2]) => withOrganisation(t.db, actor, fn);

async function failure(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const e = error as Error & { cause?: Error };
    return e.cause?.message ?? e.message;
  }
  return 'did not fail';
}

function draft(over: Partial<DraftInput> = {}): DraftInput {
  return draftInput.parse({
    clientId,
    currency: 'GBP',
    lineStyle: 'quantity',
    pricesIncludeTax: false,
    template: 'receipt',
    lines: [
      { title: 'Design', quantity: 3000, unitPrice: 3333, taxCodeId: vat20 },
      { title: 'Hosting', quantity: 1000, unitPrice: 1000, taxCodeId: vat20 },
    ],
    ...over,
  });
}

beforeAll(async () => {
  t = await createTestDatabase();
  actor = await createUserWithOrganisation(t, 'Field Office');
  await run(async (tx) => {
    await tx
      .update(organisation)
      .set({ taxRegistered: true, taxNumber: 'GB000000000' })
      .where(eq(organisation.id, actor.organisationId));
    clientId = await createClient(tx, actor, {
      name: 'Northlane Ltd',
      contactName: null,
      email: 'accounts@northlane.example',
      phone: null,
      addressLine1: '1 Example Street',
      addressLine2: null,
      city: 'Leeds',
      region: null,
      postcode: 'LS1 1AA',
      countryCode: 'GB',
      taxNumber: null,
      currency: 'GBP',
      paymentTermsDays: 14,
      notes: null,
      fields: [{ label: 'PO number', value: 'PO-123', showOnDocuments: true }],
    });
    vat20 = await createTaxCode(tx, actor, {
      label: 'Standard rate',
      treatment: 'standard',
      components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
      isDefault: true,
    });
  });
});

afterAll(async () => {
  await t?.close();
});

describe('drafts', () => {
  it('stores totals computed by the core', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft()));
    const d = await run((tx) => getDocument(tx, id, TODAY));
    expect([d!.document.subtotal, d!.document.taxTotal, d!.document.total]).toEqual([10_999, 2200, 13_199]);
    expect(d!.lines.map((l) => l.tax?.components[0]?.ratePpm)).toEqual([200_000, 200_000]);
    expect(d!.state).toBe('draft');
  });

  it('replaces lines on update and can be deleted', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) =>
      updateDraft(
        tx,
        actor,
        id,
        draft({
          lines: [
            {
              title: 'One',
              quantity: 1000,
              unitPrice: 500,
              taxCodeId: null,
              description: null,
              unit: null,
              serviceDate: null,
              itemId: null,
            },
          ],
        }),
      ),
    );
    const d = await run((tx) => getDocument(tx, id, TODAY));
    expect(d!.lines.map((l) => l.title)).toEqual(['One']);
    expect(d!.document.total).toBe(500);
    await run((tx) => deleteDraft(tx, actor, id));
    expect(await run((tx) => getDocument(tx, id, TODAY))).toBeNull();
  });

  it('refuses deposits larger than the total', async () => {
    expect(
      await failure(
        run((tx) =>
          createDraft(
            tx,
            actor,
            draft({
              prepayments: [{ label: 'Deposit', amount: 99_999, paidOn: TODAY, method: 'bank_transfer' }],
            }),
          ),
        ),
      ),
    ).toMatch(/more than the invoice total/);
  });
});

describe('issuing', () => {
  it('numbers invoices in sequence with no gaps, even after a failed issue', async () => {
    const empty = await run((tx) => createDraft(tx, actor, draft({ lines: [] })));
    const a = await run((tx) => createDraft(tx, actor, draft()));
    const b = await run((tx) => createDraft(tx, actor, draft()));
    const first = await run((tx) => issueDocument(tx, actor, a, NOW));
    expect(await failure(run((tx) => issueDocument(tx, actor, empty, NOW)))).toMatch(/at least one line/);
    const second = await run((tx) => issueDocument(tx, actor, b, NOW));
    const n1 = Number(first.number.slice(4));
    expect(first.number).toMatch(/^INV-\d{4}$/);
    expect(Number(second.number.slice(4))).toBe(n1 + 1);
  });

  it('gives ten invoices issued at once ten consecutive numbers', async () => {
    const ids = await Promise.all(
      Array.from({ length: 10 }, () => run((tx) => createDraft(tx, actor, draft()))),
    );
    const numbers = await Promise.all(ids.map((id) => run((tx) => issueDocument(tx, actor, id, NOW))));
    const seq = numbers.map((n) => Number(n.number.slice(4))).sort((x, y) => x - y);
    expect(new Set(seq).size).toBe(10);
    expect(seq.at(-1)! - seq[0]!).toBe(9);
    const all = await run((tx) =>
      tx.select({ s: document.sequence }).from(document).where(eq(document.kind, 'invoice')),
    );
    const issued = all
      .map((r) => r.s)
      .filter((s): s is number => s !== null)
      .sort((x, y) => x - y);
    expect(issued).toEqual(Array.from({ length: issued.length }, (_, i) => i + 1));
  });

  it('freezes a snapshot: later edits to the client do not change an issued invoice', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) => issueDocument(tx, actor, id, NOW));
    await run((tx) =>
      updateClient(tx, actor, clientId, {
        name: 'Northlane Group plc',
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
      }),
    );
    const d = await run((tx) => getDocument(tx, id, TODAY));
    const snap = d!.document.snapshot as unknown as DocumentSnapshot;
    expect(snap.buyer.name).toBe('Northlane Ltd');
    expect(snap.buyer.fields).toEqual([{ label: 'PO number', value: 'PO-123' }]);
    expect(snap.seller.taxNumber).toBe('GB000000000');
    expect(snap.issueDate).toBe(TODAY);
    expect(snap.dueDate).toBe('2026-11-01');
    expect(snap.supplyDate).toBe(TODAY);
    expect(snap.totals.total).toBe(13_199);
  });

  it('refuses any change to an issued invoice, its lines, or its deletion, in the database itself', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) => issueDocument(tx, actor, id, NOW));
    expect(
      await failure(run((tx) => tx.update(document).set({ total: 1 }).where(eq(document.id, id)))),
    ).toMatch(/cannot be changed/);
    expect(
      await failure(
        run((tx) => tx.update(documentLine).set({ unitPrice: 1 }).where(eq(documentLine.documentId, id))),
      ),
    ).toMatch(/cannot be changed/);
    expect(await failure(run((tx) => tx.delete(document).where(eq(document.id, id))))).toMatch(
      /cannot be deleted/,
    );
    expect(
      await failure(run((tx) => tx.update(document).set({ lifecycle: 'draft' }).where(eq(document.id, id)))),
    ).toMatch(/Cannot move/);
    expect(await failure(run((tx) => updateDraft(tx, actor, id, draft())))).toMatch(
      /has already been issued as INV-\d+, so it can no longer be changed/,
    );
  });

  it('refuses to issue without a tax number when the business is registered', async () => {
    await run((tx) =>
      tx.update(organisation).set({ taxNumber: null }).where(eq(organisation.id, actor.organisationId)),
    );
    const id = await run((tx) => createDraft(tx, actor, draft()));
    expect(await failure(run((tx) => issueDocument(tx, actor, id, NOW)))).toMatch(/tax registration number/);
    await run((tx) =>
      tx
        .update(organisation)
        .set({ taxNumber: 'GB000000000' })
        .where(eq(organisation.id, actor.organisationId)),
    );
  });
});

describe('payments', () => {
  it('moves an invoice through part paid to paid, and ignores a repeated request', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) => issueDocument(tx, actor, id, NOW));
    await run((tx) => markSent(tx, actor, id, NOW));
    const p = {
      documentId: id,
      paidOn: TODAY,
      method: 'bank_transfer' as const,
      reference: null,
      note: null,
    };
    const first = await run((tx) =>
      recordPayment(tx, actor, { ...p, amount: 5000, idempotencyKey: 'pay-key-0001' }),
    );
    const again = await run((tx) =>
      recordPayment(tx, actor, { ...p, amount: 5000, idempotencyKey: 'pay-key-0001' }),
    );
    expect(again).toEqual({ id: first.id, duplicate: true });
    let d = await run((tx) => getDocument(tx, id, TODAY));
    expect([d!.state, d!.balance]).toEqual(['part_paid', 8199]);
    expect(
      await failure(
        run((tx) => recordPayment(tx, actor, { ...p, amount: 8200, idempotencyKey: 'pay-key-0002' })),
      ),
    ).toMatch(/more than the balance/);
    await run((tx) => recordPayment(tx, actor, { ...p, amount: 8199, idempotencyKey: 'pay-key-0003' }));
    d = await run((tx) => getDocument(tx, id, TODAY));
    expect([d!.state, d!.balance]).toEqual(['paid', 0]);
  });

  it('records two different payments sent at the same moment without exceeding the balance', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) => issueDocument(tx, actor, id, NOW));
    const p = {
      documentId: id,
      paidOn: TODAY,
      method: 'bank_transfer' as const,
      reference: null,
      note: null,
      amount: 10_000,
    };
    const results = await Promise.allSettled([
      run((tx) => recordPayment(tx, actor, { ...p, idempotencyKey: 'race-key-0001' })),
      run((tx) => recordPayment(tx, actor, { ...p, idempotencyKey: 'race-key-0002' })),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const d = await run((tx) => getDocument(tx, id, TODAY));
    expect(d!.applied.paid).toBe(10_000);
  });

  it('refuses payments on drafts and voiding with payments; allows voiding once removed', async () => {
    const draftId = await run((tx) => createDraft(tx, actor, draft()));
    const p = { paidOn: TODAY, method: 'cash' as const, reference: null, note: null, amount: 100 };
    expect(
      await failure(
        run((tx) => recordPayment(tx, actor, { ...p, documentId: draftId, idempotencyKey: 'draft-pay-01' })),
      ),
    ).toMatch(/issued/);
    await run((tx) => issueDocument(tx, actor, draftId, NOW));
    const { id: payId } = await run((tx) =>
      recordPayment(tx, actor, { ...p, documentId: draftId, idempotencyKey: 'void-pay-01' }),
    );
    expect(await failure(run((tx) => voidDocument(tx, actor, draftId, 'Raised in error', NOW)))).toMatch(
      /payments recorded/,
    );
    await run((tx) => removePayment(tx, actor, payId, 'Entered twice'));
    await run((tx) => voidDocument(tx, actor, draftId, 'Raised in error', NOW));
    const d = await run((tx) => getDocument(tx, draftId, TODAY));
    expect([d!.state, d!.balance, d!.overdue]).toEqual(['void', 0, false]);
  });

  it('turns deposits on a draft into payments when it is issued', async () => {
    const id = await run((tx) =>
      createDraft(
        tx,
        actor,
        draft({
          prepayments: [{ label: 'Deposit', amount: 3000, paidOn: '2026-10-01', method: 'bank_transfer' }],
        }),
      ),
    );
    await run((tx) => issueDocument(tx, actor, id, NOW));
    const d = await run((tx) => getDocument(tx, id, TODAY));
    expect(d!.payments.map((p) => [p.amount, p.paidOn])).toEqual([[3000, '2026-10-01']]);
    expect([d!.state, d!.balance]).toEqual(['part_paid', 10_199]);
    expect((d!.document.snapshot as unknown as DocumentSnapshot).balanceDue).toBe(10_199);
  });
});

describe('credit notes', () => {
  it('credits a whole invoice with its own number and clears the balance', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) => issueDocument(tx, actor, id, NOW));
    const cn = await run((tx) =>
      createCreditNote(
        tx,
        actor,
        { mode: 'whole', invoiceId: id, reason: 'Cancelled order', idempotencyKey: 'credit-key-01' },
        NOW,
      ),
    );
    const again = await run((tx) =>
      createCreditNote(
        tx,
        actor,
        { mode: 'whole', invoiceId: id, reason: 'Cancelled order', idempotencyKey: 'credit-key-01' },
        NOW,
      ),
    );
    expect(cn.number).toMatch(/^CN-\d{4}$/);
    expect(again).toEqual({ ...cn, duplicate: true });
    const d = await run((tx) => getDocument(tx, id, TODAY));
    expect([d!.applied.credited, d!.balance]).toEqual([13_199, 0]);
    const credit = await run((tx) => getDocument(tx, cn.id, TODAY));
    const snap = credit!.document.snapshot as unknown as DocumentSnapshot;
    expect(snap.credits?.reason).toBe('Cancelled order');
    expect(snap.totals.total).toBe(13_199);
  });

  it('refuses a credit larger than the balance', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) => issueDocument(tx, actor, id, NOW));
    expect(
      await failure(
        run((tx) =>
          createCreditNote(
            tx,
            actor,
            { mode: 'amount', invoiceId: id, reason: 'x', amount: 20_000, idempotencyKey: 'credit-key-02' },
            NOW,
          ),
        ),
      ),
    ).toMatch(/more than is left to credit/);
  });
});

describe('outbox', () => {
  it('queues a PDF job on issue and retries a failing job with a delay', async () => {
    const pending = await run((tx) =>
      tx.select().from(outbox).where(eq(outbox.topic, 'document.render_pdf')),
    );
    expect(pending.length).toBeGreaterThan(0);
    const seen: string[] = [];
    const ok = await drainOutbox(
      t.worker.db,
      { 'document.render_pdf': async (job) => void seen.push(String(job.payload.documentId)) },
      500,
    );
    expect(ok.done).toBe(pending.length);
    expect(new Set(seen).size).toBe(pending.length);

    const id = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) => issueDocument(tx, actor, id, NOW));
    const failed = await drainOutbox(t.worker.db, {
      'document.render_pdf': async () => Promise.reject(new Error('renderer down')),
    });
    expect(failed).toEqual({ done: 0, failed: 1 });
    const [job] = await run((tx) =>
      tx
        .select()
        .from(outbox)
        .where(sql`${outbox.payload}->>'documentId' = ${id}`),
    );
    expect([job!.status, job!.attempts, job!.lastError]).toEqual(['pending', 1, 'renderer down']);
  });

  it('a handler that fails with nothing at all is recorded as failed and retried, and the rest still run', async () => {
    const first = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) => issueDocument(tx, actor, first, NOW));
    const second = await run((tx) => createDraft(tx, actor, draft()));
    await run((tx) => issueDocument(tx, actor, second, NOW));
    let calls = 0;
    const outcome = await drainOutbox(t.worker.db, {
      'document.render_pdf': async () => {
        calls += 1;
        if (calls === 1) throw null;
      },
    });
    expect(outcome.failed).toBe(1);
    expect(outcome.done).toBeGreaterThanOrEqual(1);
    const jobs = await run((tx) => tx.select().from(outbox).where(eq(outbox.topic, 'document.render_pdf')));
    const mine = jobs
      .filter((j) => [first, second].includes(String(j.payload.documentId)))
      .map((j) => [j.status, j.lastError])
      .sort();
    expect(mine).toEqual([
      ['done', null],
      ['pending', 'The job failed without saying why.'],
    ]);
  });
});

describe('lists and dashboard', () => {
  it('derives every figure from records, with one definition of outstanding', async () => {
    const all = await run((tx) => listDocuments(tx, { today: TODAY }));
    const open = await run((tx) => listDocuments(tx, { today: TODAY, filter: 'open' }));
    const dash = await run((tx) => getDashboard(tx, TODAY, 'GBP'));
    const gbp = dash.receivables.find((r) => r.currency === 'GBP')!;
    expect(gbp.outstanding).toBe(open.reduce((a, d) => a + d.balance, 0));
    expect(gbp.openCount).toBe(open.length);
    expect(dash.draftCount).toBe(all.filter((d) => d.state === 'draft').length);
    const later = await run((tx) => getDashboard(tx, '2026-12-01', 'GBP'));
    expect(later.receivables[0]!.overdueCount).toBe(open.length);
  });
});

describe('duplicating', () => {
  it('copies lines and wording into a new draft without dates, number or deposits', async () => {
    const id = await run((tx) =>
      createDraft(
        tx,
        actor,
        draft({
          title: 'Monthly retainer',
          prepayments: [{ label: 'Deposit', amount: 1000, paidOn: TODAY, method: 'cash' }],
        }),
      ),
    );
    await run((tx) => issueDocument(tx, actor, id, NOW));
    const copy = await run((tx) => duplicateDocument(tx, actor, id));
    const d = await run((tx) => getDocument(tx, copy, TODAY));
    expect([d!.document.lifecycle, d!.document.number, d!.document.issueDate, d!.document.title]).toEqual([
      'draft',
      null,
      null,
      'Monthly retainer',
    ]);
    expect(d!.document.prepayments).toEqual([]);
    expect(d!.lines.map((l) => l.title)).toEqual(['Design', 'Hosting']);
    expect(d!.document.total).toBe(13_199);
  });

  it('a duplicate asked for again with the same key, after a lost answer, is one copy', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft({ title: 'Quarterly review' })));
    await run((tx) => issueDocument(tx, actor, id, NOW));
    const first = await run((tx) => duplicateDocument(tx, actor, id, 'dup-key-000001'));
    const again = await run((tx) => duplicateDocument(tx, actor, id, 'dup-key-000001'));
    expect(again).toBe(first);
    const copies = await run((tx) =>
      tx
        .select()
        .from(document)
        .where(sql`${document.title} = 'Quarterly review' and ${document.lifecycle} = 'draft'`),
    );
    expect(copies).toHaveLength(1);
    const other = await run((tx) => duplicateDocument(tx, actor, id, 'dup-key-000002'));
    expect(other).not.toBe(first);
  });
});

describe('issuing checks the total the person confirmed', () => {
  it('a total that changed since the editor showed it is refused with the new figure, and nothing is issued', async () => {
    const id = await run((tx) => createDraft(tx, actor, draft()));
    const detail = await run((tx) => getDocument(tx, id, '2026-10-18'));
    const total = detail!.document.total;
    expect(await failure(run((tx) => issueDocument(tx, actor, id, NOW, { total: total - 1 })))).toBe(
      `The total changed while this was open: it is now ${formatMoney(total, 'GBP')}, with the tax rates and settings as they are now. Check it and issue again.`,
    );
    expect((await run((tx) => getDocument(tx, id, '2026-10-18')))!.document.lifecycle).toBe('draft');
    await run((tx) => issueDocument(tx, actor, id, NOW, { total }));
    expect((await run((tx) => getDocument(tx, id, '2026-10-18')))!.document.lifecycle).toBe('issued');
  });
});
