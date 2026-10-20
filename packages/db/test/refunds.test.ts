import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { DomainError } from '@invoica/core';
import type { CreditNoteInput } from '@invoica/schemas';
import { getDashboard } from '../src/dashboard';
import { createCreditNote, getDocument, listDocuments, recordPayment, removePayment } from '../src/documents';
import { document, payment, refund } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, failure, issued, pay, type Business } from './business';

/** docs/specs/refunds.md, acceptance criteria 1 to 7. */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

const REFUND = {
  refundedOn: TODAY,
  method: 'bank_transfer' as const,
  reference: 'Returned to sort code ending 00',
};

/** The refund as the dialog confirms it: its details and the figure shown. */
const refundOf = (amount: number) => ({ ...REFUND, amount });

/** An invoice of £100.00 plus VAT at 20%: £120.00. */
const invoiceOf120 = (b: Business) => issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);

type WithoutReason<T> = T extends unknown ? Omit<T, 'reason'> : never;

const credit = (b: Business, input: WithoutReason<CreditNoteInput>) =>
  b.run((tx) => createCreditNote(tx, b.actor, { reason: 'Work returned', ...input } as CreditNoteInput, NOW));

const detail = (b: Business, id: string) => b.run(async (tx) => (await getDocument(tx, id, TODAY))!);

describe('criterion 1: a paid invoice credited in full', () => {
  it('is credited with a refund of everything paid, leaving nothing owed', async () => {
    const b = await business(t, 'Refund Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, 'pay-refund-0001')));
    expect(
      await failure(credit(b, { mode: 'whole', invoiceId: id, idempotencyKey: 'cn-no-refund-01' })),
    ).toMatch(/more than the balance still owed/);
    const cn = await credit(b, {
      mode: 'whole',
      invoiceId: id,
      idempotencyKey: 'cn-refund-0001',
      refund: refundOf(12_000),
    });
    const [r] = await b.run((tx) => tx.select().from(refund).where(eq(refund.creditNoteId, cn.id)));
    expect([r!.amount, r!.documentId, r!.refundedOn, r!.method]).toEqual([
      12_000,
      id,
      TODAY,
      'bank_transfer',
    ]);
    const d = await detail(b, id);
    expect(d.balance).toBe(0);
    expect(d.state).toBe('credited');
    expect(d.refunds.map((x) => x.amount)).toEqual([12_000]);
  });

  it('a repeated request returns the first credit note and records one refund', async () => {
    const b = await business(t, 'Repeat Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, 'pay-repeat-0001')));
    const input = {
      mode: 'whole' as const,
      invoiceId: id,
      idempotencyKey: 'cn-repeat-0001',
      refund: refundOf(12_000),
    };
    const first = await credit(b, input);
    const again = await credit(b, input);
    expect([again.id, again.duplicate]).toEqual([first.id, true]);
    expect(await b.run((tx) => tx.select().from(refund))).toHaveLength(1);
    expect(
      await failure(credit(b, { ...input, refund: { ...refundOf(12_000), reference: 'Something else' } })),
    ).toMatch(/already used/);
  });
});

describe('criterion 2: part paid', () => {
  it('the refund is exactly what was paid above the balance', async () => {
    const b = await business(t, 'Part Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 10_000, 'pay-part-00001')));
    const cn = await credit(b, {
      mode: 'whole',
      invoiceId: id,
      idempotencyKey: 'cn-part-000001',
      refund: refundOf(10_000),
    });
    const [r] = await b.run((tx) => tx.select().from(refund).where(eq(refund.creditNoteId, cn.id)));
    expect(r!.amount).toBe(10_000);
    expect((await detail(b, id)).balance).toBe(0);
  });
});

describe('criterion 3: within the balance', () => {
  it('a credit that fits the balance owed refuses a refund', async () => {
    const b = await business(t, 'Within Office');
    const id = await invoiceOf120(b);
    expect(
      await failure(
        credit(b, {
          mode: 'amount',
          invoiceId: id,
          amount: 5000,
          idempotencyKey: 'cn-within-0001',
          refund: refundOf(1),
        }),
      ),
    ).toMatch(/needs no refund/);
  });
});

describe('criteria 4 and 5: payments after a refund', () => {
  it('a payment cannot be removed while the refunds would be more than the payments left', async () => {
    const b = await business(t, 'Remove Office');
    const id = await invoiceOf120(b);
    const paid = await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, 'pay-remove-0001')));
    await credit(b, {
      mode: 'amount',
      invoiceId: id,
      amount: 5000,
      idempotencyKey: 'cn-remove-0001',
      refund: refundOf(6_000),
    });
    expect(await failure(b.run((tx) => removePayment(tx, b.actor, paid.id, 'Bounced')))).toMatch(
      /refunds on the invoice would be more than the payments left/,
    );
    // The app says so before the database is asked.
    const error = await b
      .run((tx) => removePayment(tx, b.actor, paid.id, 'Bounced'))
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('payment_needed_by_refund');
  });

  it('with the refunds still covered, a payment can be removed, and the balance then takes payments again', async () => {
    const b = await business(t, 'Again Office');
    const id = await invoiceOf120(b);
    const first = await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, 'pay-again-00001')));
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, 'pay-again-00002')));
    // £50.00 plus VAT credited after full payment: £60.00 refunded.
    await credit(b, {
      mode: 'amount',
      invoiceId: id,
      amount: 5000,
      idempotencyKey: 'cn-again-00001',
      refund: refundOf(6_000),
    });
    expect((await detail(b, id)).balance).toBe(0);
    expect(await failure(b.run((tx) => recordPayment(tx, b.actor, pay(id, 1, 'pay-again-00003'))))).toMatch(
      /more than the balance/,
    );
    await b.run((tx) => removePayment(tx, b.actor, first.id, 'Bounced'));
    expect((await detail(b, id)).balance).toBe(6000);
    expect(
      await failure(b.run((tx) => recordPayment(tx, b.actor, pay(id, 6001, 'pay-again-00004')))),
    ).toMatch(/more than the balance/);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, 'pay-again-00005')));
    expect((await detail(b, id)).state).toBe('settled');
  });
});

describe('criterion 6: the database guards refunds', () => {
  async function paidInvoiceWithDraftNote(b: Business, currency = 'GBP') {
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, `pay-db-${id.slice(0, 8)}`)));
    const [note] = await b.run((tx) =>
      tx
        .insert(document)
        .values({
          organisationId: b.actor.organisationId,
          kind: 'credit_note',
          clientId: b.clientId,
          creditedDocumentId: id,
          currency,
          createdBy: b.actor.userId,
        })
        .returning({ id: document.id }),
    );
    return { id, note: note!.id };
  }

  const insertRefund = (
    b: Business,
    o: { invoice: string; note: string; amount: number; currency?: string; refundedOn?: string },
  ) =>
    b.run(async (tx) => {
      await tx.insert(refund).values({
        organisationId: b.actor.organisationId,
        documentId: o.invoice,
        creditNoteId: o.note,
        amount: o.amount,
        currency: o.currency ?? 'GBP',
        refundedOn: o.refundedOn ?? TODAY,
        method: 'bank_transfer',
      });
      // The refund is checked again at commit: its credit note must be issued by then.
    });

  it('refuses a refund dated well after today', async () => {
    const b = await business(t, 'Later Refund Office');
    const { id, note } = await paidInvoiceWithDraftNote(b);
    expect(
      await failure(insertRefund(b, { invoice: id, note, amount: 1000, refundedOn: '2099-01-01' })),
    ).toBe('A refund cannot be dated after today.');
  });

  it('refuses a refund that is never issued with its credit note', async () => {
    const b = await business(t, 'Deferred Office');
    const { id, note } = await paidInvoiceWithDraftNote(b);
    expect(await failure(insertRefund(b, { invoice: id, note, amount: 1000 }))).toMatch(
      /must be issued with its credit note/,
    );
  });

  it('refuses another currency, another invoice’s note, more than was paid, and an issued note', async () => {
    const b = await business(t, 'Guard Office');
    const first = await paidInvoiceWithDraftNote(b);
    const other = await invoiceOf120(b);
    expect(
      await failure(insertRefund(b, { invoice: first.id, note: first.note, amount: 100, currency: 'EUR' })),
    ).toMatch(/invoice currency/);
    expect(await failure(insertRefund(b, { invoice: other, note: first.note, amount: 100 }))).toMatch(
      /credit note of the invoice/,
    );
    expect(await failure(insertRefund(b, { invoice: first.id, note: first.note, amount: 12_001 }))).toMatch(
      /more than the payments received/,
    );
    const issuedNote = await credit(b, {
      mode: 'whole',
      invoiceId: first.id,
      idempotencyKey: 'cn-guard-00001',
      refund: refundOf(12_000),
    });
    expect(await failure(insertRefund(b, { invoice: first.id, note: issuedNote.id, amount: 1 }))).toMatch(
      /before the note is issued/,
    );
  });

  it('a draft credit note with a refund cannot move to another invoice', async () => {
    const b = await business(t, 'Moving Note Office');
    const { id, note } = await paidInvoiceWithDraftNote(b);
    const other = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(other, 12_000, 'pay-moving-0001')));
    const outcome = await failure(
      b.run(async (tx) => {
        await tx.insert(refund).values({
          organisationId: b.actor.organisationId,
          documentId: id,
          creditNoteId: note,
          amount: 12_000,
          currency: 'GBP',
          refundedOn: TODAY,
          method: 'bank_transfer',
        });
        await tx.update(document).set({ creditedDocumentId: other }).where(eq(document.id, note));
      }),
    );
    expect(outcome).toMatch(/A credit note with a refund cannot move to another invoice/);
    expect(await b.run((tx) => tx.select().from(refund))).toHaveLength(0);
  });

  it('payments, refunds and credit notes are refused outside read committed, where the guards hold', async () => {
    const b = await business(t, 'Isolation Office');
    const id = await invoiceOf120(b);
    const { Client } = await import('pg');
    const app = new Client({ connectionString: t.appUrl });
    await app.connect();
    try {
      for (const level of ['repeatable read', 'serializable']) {
        await app.query(`begin isolation level ${level}`);
        await app.query(
          `select set_config('app.user_id', $1, true), set_config('app.organisation_id', $2, true)`,
          [b.actor.userId, b.actor.organisationId],
        );
        await expect(
          app.query(
            `insert into payment (organisation_id, document_id, amount, currency, paid_on, method, idempotency_key)
             values ($1, $2, 100, 'GBP', $3, 'cash', $4)`,
            [b.actor.organisationId, id, TODAY, `iso-${level.replace(' ', '-')}`],
          ),
          level,
        ).rejects.toThrow(/only in read committed/);
        await app.query('rollback');
        await app.query(`begin isolation level ${level}`);
        await app.query(
          `select set_config('app.user_id', $1, true), set_config('app.organisation_id', $2, true)`,
          [b.actor.userId, b.actor.organisationId],
        );
        await expect(
          app.query(`update document set updated_at = now() where id = $1`, [id]),
          level,
        ).rejects.toThrow(/only in read committed/);
        await app.query('rollback');
      }
    } finally {
      await app.end();
    }
    expect(await b.run((tx) => tx.select().from(payment))).toHaveLength(0);
  });

  it('a refund cannot be changed or deleted', async () => {
    const b = await business(t, 'Fixed Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, 'pay-fixed-00001')));
    const cn = await credit(b, {
      mode: 'whole',
      invoiceId: id,
      idempotencyKey: 'cn-fixed-00001',
      refund: refundOf(12_000),
    });
    expect(
      await failure(
        b.run((tx) => tx.update(refund).set({ amount: 1 }).where(eq(refund.creditNoteId, cn.id))),
      ),
    ).toMatch(/permission denied/);
    expect(await failure(b.run((tx) => tx.delete(refund).where(eq(refund.creditNoteId, cn.id))))).toMatch(
      /permission denied/,
    );
    // Even the owner role, which bypasses the grants, cannot change one.
    const { Client } = await import('pg');
    const owner = new Client({ connectionString: t.ownerUrl });
    await owner.connect();
    try {
      await owner.query(
        `select set_config('app.user_id', $1, false), set_config('app.organisation_id', $2, false)`,
        [b.actor.userId, b.actor.organisationId],
      );
      expect((await owner.query(`select count(*)::int as n from refund`)).rows[0].n).toBe(1);
      await expect(owner.query(`update refund set amount = 1`)).rejects.toThrow(/append-only/);
      await expect(owner.query(`delete from refund`)).rejects.toThrow(/append-only/);
    } finally {
      await owner.end();
    }
  });

  it('on issue, a credit note’s refund must be exactly the part above the balance', async () => {
    const b = await business(t, 'Exact Office');
    const { id, note } = await paidInvoiceWithDraftNote(b);
    const outcome = await failure(
      b.run(async (tx) => {
        await tx.insert(refund).values({
          organisationId: b.actor.organisationId,
          documentId: id,
          creditNoteId: note,
          amount: 9999,
          currency: 'GBP',
          refundedOn: TODAY,
          method: 'bank_transfer',
        });
        // Issue the note for £100.00 with a refund £0.01 short of what is above the balance (nothing is owed).
        const seq = await tx.execute<{ seq: number }>(
          sql`update number_counter set next_value = next_value + 1 where kind = 'credit_note' returning next_value - 1 as seq`,
        );
        const sequence = Number(seq.rows[0]!.seq);
        await tx
          .update(document)
          .set({
            lifecycle: 'issued',
            sequence,
            number: `CN-${String(sequence).padStart(4, '0')}`,
            total: 10_000,
            taxTotal: 0,
            snapshot: { totals: { total: 10_000, taxTotal: 0, taxes: [] } },
            issueDate: TODAY,
            issuedAt: NOW,
          })
          .where(eq(document.id, note));
      }),
    );
    expect(outcome).toMatch(/refund must be exactly the part above the balance owed/);
  });
});

describe('criterion 7: received figures are net of refunds', () => {
  it('the list and the dashboard count payments less refunds', async () => {
    const b = await business(t, 'Net Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, 'pay-net-000001')));
    await credit(b, {
      mode: 'amount',
      invoiceId: id,
      amount: 5000,
      idempotencyKey: 'cn-net-000001',
      refund: refundOf(6_000),
    });
    const [row] = await b.run((tx) => listDocuments(tx, { kind: 'invoice', today: TODAY }));
    expect([row!.paid, row!.credited, row!.balance]).toEqual([6000, 6000, 0]);
    const dash = await b.run((tx) => getDashboard(tx, TODAY, 'GBP'));
    expect(dash.paidLast30Days).toEqual([{ currency: 'GBP', amount: 6000 }]);
    expect(dash.refundedLast30Days).toEqual([{ currency: 'GBP', amount: 6000 }]);
    expect(dash.monthlyPaid.at(-1)!.amount).toBe(6000);
    expect(dash.topClients[0]!.paid).toBe(6000);
  });

  it('each on its own date: a payment from September refunded in October counts in each month, and per client', async () => {
    const b = await business(t, 'Dated Net Office');
    const id = await invoiceOf120(b);
    await b.run((tx) =>
      recordPayment(tx, b.actor, { ...pay(id, 12_000, 'pay-dated-0001'), paidOn: '2026-09-01' }),
    );
    await credit(b, {
      mode: 'whole',
      invoiceId: id,
      idempotencyKey: 'cn-dated-0001',
      refund: refundOf(12_000),
    });
    const dash = await b.run((tx) => getDashboard(tx, TODAY, 'GBP'));
    expect(dash.paidLast30Days).toEqual([{ currency: 'GBP', amount: -12_000 }]);
    expect(dash.refundedLast30Days).toEqual([{ currency: 'GBP', amount: 12_000 }]);
    expect(dash.monthlyPaid.slice(-2).map((m) => [m.month, m.amount])).toEqual([
      ['2026-09', 12_000],
      ['2026-10', -12_000],
    ]);
    // The client's "Paid to date" sums the list's figure for each invoice: payments less refunds.
    const forClient = await b.run((tx) =>
      listDocuments(tx, { kind: 'invoice', clientId: b.clientId, today: TODAY }),
    );
    expect(forClient.map((d) => d.paid)).toEqual([0]);
  });

  it('payments recorded are still listed as they were', async () => {
    const b = await business(t, 'Listed Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, 'pay-listed-0001')));
    await credit(b, {
      mode: 'whole',
      invoiceId: id,
      idempotencyKey: 'cn-listed-0001',
      refund: refundOf(12_000),
    });
    const d = await detail(b, id);
    expect(d.payments.filter((p) => !p.removedAt).map((p) => p.amount)).toEqual([12_000]);
    expect(await b.run((tx) => tx.select().from(payment))).toHaveLength(1);
  });
});

describe('the refund recorded is the refund confirmed', () => {
  it('a payment recorded while the dialog was open makes the confirmed refund wrong, and it is refused', async () => {
    const b = await business(t, 'Confirmed Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, 'pay-confirm-0001')));
    // The dialog shows a refund of £60.00; meanwhile the client's other £60.00 is recorded.
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, 'pay-confirm-0002')));
    const stale = { mode: 'whole' as const, invoiceId: id, idempotencyKey: 'cn-confirm-0001' };
    expect(await failure(credit(b, { ...stale, refund: refundOf(6000) }))).toMatch(
      /The amount owed changed while this was open: the refund would now be £120\.00\. Check it and issue again\./,
    );
    expect(await b.run((tx) => tx.select().from(refund))).toHaveLength(0);
    expect(
      await b.run((tx) => tx.select().from(document).where(eq(document.kind, 'credit_note'))),
    ).toHaveLength(0);
    await credit(b, { ...stale, idempotencyKey: 'cn-confirm-0002', refund: refundOf(12_000) });
    expect((await detail(b, id)).refunds.map((r) => r.amount)).toEqual([12_000]);
  });

  it('a payment removed while the dialog was open is refused the same way', async () => {
    const b = await business(t, 'Removed Meanwhile Office');
    const id = await invoiceOf120(b);
    const first = await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, 'pay-removed-0001')));
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, 'pay-removed-0002')));
    await b.run((tx) => removePayment(tx, b.actor, first.id, 'Bounced'));
    expect(
      await failure(
        credit(b, {
          mode: 'whole',
          invoiceId: id,
          idempotencyKey: 'cn-removed-0001',
          refund: refundOf(12_000),
        }),
      ),
    ).toMatch(/the refund would now be £60\.00/);
    expect(await b.run((tx) => tx.select().from(refund))).toHaveLength(0);
  });

  it('a refund of any other figure is refused, and a repeat of the accepted request is the same note', async () => {
    const b = await business(t, 'Exact Figure Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, 'pay-figure-0001')));
    for (const amount of [1, 11_999, 12_001]) {
      expect(
        await failure(
          credit(b, {
            mode: 'whole',
            invoiceId: id,
            idempotencyKey: `cn-figure-${amount}`,
            refund: refundOf(amount),
          }),
        ),
      ).toMatch(/the refund would now be £120\.00/);
    }
    const input = {
      mode: 'whole' as const,
      invoiceId: id,
      idempotencyKey: 'cn-figure-ok01',
      refund: refundOf(12_000),
    };
    const first = await credit(b, input);
    expect(await credit(b, input)).toEqual({ ...first, duplicate: true });
  });
});

describe('a refund’s date', () => {
  it('cannot be before the latest payment it returns, in the app or in the database', async () => {
    const b = await business(t, 'Refund Date Office');
    const id = await invoiceOf120(b);
    await b.run((tx) =>
      recordPayment(tx, b.actor, { ...pay(id, 6000, 'pay-date-0001'), paidOn: '2026-10-01' }),
    );
    await b.run((tx) =>
      recordPayment(tx, b.actor, { ...pay(id, 6000, 'pay-date-0002'), paidOn: '2026-10-15' }),
    );
    const input = { mode: 'whole' as const, invoiceId: id };
    expect(
      await failure(
        credit(b, {
          ...input,
          idempotencyKey: 'cn-date-00001',
          refund: { ...refundOf(12_000), refundedOn: '2026-10-14' },
        }),
      ),
    ).toMatch(/A refund cannot be dated before the latest payment on the invoice, 15 October 2026/);
    // The database refuses it too, whoever writes it.
    const { Client } = await import('pg');
    const app = new Client({ connectionString: t.appUrl });
    await app.connect();
    try {
      await app.query('begin');
      await app.query(
        `select set_config('app.user_id', $1, true), set_config('app.organisation_id', $2, true)`,
        [b.actor.userId, b.actor.organisationId],
      );
      const note = await app.query(
        `insert into document (organisation_id, kind, client_id, credited_document_id, currency, created_by)
         values ($1, 'credit_note', $2, $3, 'GBP', $4) returning id`,
        [b.actor.organisationId, b.clientId, id, b.actor.userId],
      );
      await expect(
        app.query(
          `insert into refund (organisation_id, document_id, credit_note_id, amount, currency, refunded_on, method)
           values ($1, $2, $3, 100, 'GBP', '2026-10-14', 'cash')`,
          [b.actor.organisationId, id, note.rows[0].id],
        ),
      ).rejects.toThrow(/cannot be dated before the latest payment/);
      await app.query('rollback');
    } finally {
      await app.end();
    }
    await credit(b, {
      ...input,
      idempotencyKey: 'cn-date-00002',
      refund: { ...refundOf(12_000), refundedOn: '2026-10-15' },
    });
    expect((await detail(b, id)).refunds.map((r) => r.refundedOn)).toEqual(['2026-10-15']);
  });
});

describe('everything still owed is the figure confirmed', () => {
  it('a payment removed while the dialog was open makes the confirmed balance wrong, and it is refused', async () => {
    const b = await business(t, 'Balance Removed Office');
    const id = await invoiceOf120(b);
    const paid = await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, 'pay-bal-00001')));
    // The dialog offers "Everything still owed, £60.00"; meanwhile the payment bounces.
    await b.run((tx) => removePayment(tx, b.actor, paid.id, 'Bounced'));
    const input = { mode: 'balance' as const, invoiceId: id, balance: 6000 };
    expect(await failure(credit(b, { ...input, idempotencyKey: 'cn-bal-00001' }))).toMatch(
      /The amount owed changed while this was open: everything still owed is now £120\.00\. Check it and issue again\./,
    );
    expect(
      await b.run((tx) => tx.select().from(document).where(eq(document.kind, 'credit_note'))),
    ).toHaveLength(0);
    const cn = await credit(b, { ...input, balance: 12_000, idempotencyKey: 'cn-bal-00002' });
    expect((await detail(b, id)).balance).toBe(0);
    expect(cn.duplicate).toBe(false);
  });

  it('a payment recorded meanwhile is refused the same way', async () => {
    const b = await business(t, 'Balance Paid Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, 'pay-bal-00002')));
    expect(
      await failure(
        credit(b, { mode: 'balance', invoiceId: id, balance: 12_000, idempotencyKey: 'cn-bal-00003' }),
      ),
    ).toMatch(/everything still owed is now £60\.00/);
  });

  it('paid in full meanwhile: the answer says nothing is owed now', async () => {
    const b = await business(t, 'Balance Settled Office');
    const id = await invoiceOf120(b);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, 'pay-bal-00003')));
    expect(
      await failure(
        credit(b, { mode: 'balance', invoiceId: id, balance: 12_000, idempotencyKey: 'cn-bal-00004' }),
      ),
    ).toBe(
      'The amount owed changed while this was open: nothing is owed on it now, so there is nothing to credit.',
    );
  });
});
