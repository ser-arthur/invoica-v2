import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { CreditNoteInput } from '@invoica/schemas';
import { createCreditNote, getDocument, recordPayment, removePayment } from '../src/documents';
import { queueDueReminders, sendReminderNow, updateReminderSettings } from '../src/reminders';
import { outbox, payment, refund } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, issued, pay, type Business } from './business';

/**
 * Two people, or two tabs, acting on the same invoice at the same moment. Whichever order the database puts them
 * in, the invoice must end up consistent: nothing owed below zero, refunds within payments, credits within the total,
 * and one reminder per offset.
 */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

const ROUNDS = 12;
const REFUND = { refundedOn: TODAY, method: 'bank_transfer' as const, reference: null };

/** An invoice of £100.00 plus VAT at 20%: £120.00. */
const invoiceOf120 = (b: Business) => issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);

type WithoutReason<T> = T extends unknown ? Omit<T, 'reason'> : never;

const credit = (b: Business, input: WithoutReason<CreditNoteInput>) =>
  b.run((tx) => createCreditNote(tx, b.actor, { reason: 'At once', ...input } as CreditNoteInput, NOW));

/** The invoice's figures, read back, with the rules every interleaving must keep. */
async function consistent(b: Business, id: string) {
  const d = (await b.run((tx) => getDocument(tx, id, TODAY)))!;
  const paid = d.payments.filter((p) => !p.removedAt).reduce((a, p) => a + p.amount, 0);
  const refunded = d.refunds.reduce((a, r) => a + r.amount, 0);
  expect(d.balance, 'nothing owed below zero').toBeGreaterThanOrEqual(0);
  expect(refunded, 'refunds within payments').toBeLessThanOrEqual(paid);
  expect(d.applied.credited, 'credits within the total').toBeLessThanOrEqual(d.document.total);
  expect(d.balance).toBe(d.document.total - (paid - refunded) - d.applied.credited);
  return { d, paid, refunded };
}

const settled = (results: PromiseSettledResult<unknown>[]) => results.map((r) => r.status === 'fulfilled');

describe('at the same moment', () => {
  it('a credit with a refund and the removal of a payment', async () => {
    const b = await business(t, 'Race Refund Office');
    const outcomes = new Set<string>();
    for (let i = 0; i < ROUNDS; i++) {
      const id = await invoiceOf120(b);
      const first = await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, `race-a-${i}-1`)));
      await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, `race-a-${i}-2`)));
      // Half the rounds start the credit first, half the removal, the other following a moment later.
      const later = <T>(run: () => Promise<T>) =>
        new Promise<T>((done, fail) => setTimeout(() => run().then(done, fail), 5));
      // Confirmed as the dialog showed it, with £120.00 received.
      const creditIt = () =>
        credit(b, {
          mode: 'whole',
          invoiceId: id,
          idempotencyKey: `race-a-${i}-cn`,
          refund: { ...REFUND, amount: 12_000 },
        });
      const removeIt = () => b.run((tx) => removePayment(tx, b.actor, first.id, 'Bounced'));
      const results = await Promise.allSettled(
        i % 2 === 0 ? [creditIt(), later(removeIt)] : [later(creditIt), removeIt()],
      );
      outcomes.add(settled(results).join(','));
      const { refunded, d } = await consistent(b, id);
      // The credit first: £120.00 refunded, and the removal is refused. The removal first: the refund confirmed is
      // no longer the right one, so the credit is refused and nothing is refunded.
      if (results[0]!.status === 'fulfilled') expect([d.balance, refunded]).toEqual([0, 12_000]);
      else expect([d.balance, refunded]).toEqual([6000, 0]);
    }
    // Exactly one goes through, and both orders happened.
    expect([...outcomes].sort()).toEqual(['false,true', 'true,false']);
  });

  it('two credit notes that together would go above the balance', async () => {
    const b = await business(t, 'Race Credit Office');
    for (let i = 0; i < ROUNDS; i++) {
      const id = await invoiceOf120(b);
      const results = await Promise.allSettled([
        credit(b, { mode: 'amount', invoiceId: id, amount: 8000, idempotencyKey: `race-b-${i}-1` }),
        credit(b, { mode: 'amount', invoiceId: id, amount: 8000, idempotencyKey: `race-b-${i}-2` }),
      ]);
      expect(settled(results).filter(Boolean)).toHaveLength(1);
      const { d } = await consistent(b, id);
      expect(d.applied.credited).toBe(9600);
    }
  });

  it('a payment and a whole credit', async () => {
    const b = await business(t, 'Race Pay Office');
    for (let i = 0; i < ROUNDS; i++) {
      const id = await invoiceOf120(b);
      const results = await Promise.allSettled([
        b.run((tx) => recordPayment(tx, b.actor, pay(id, 10_000, `race-c-${i}`))),
        credit(b, { mode: 'whole', invoiceId: id, idempotencyKey: `race-c-${i}-cn` }),
      ]);
      // Whichever comes second is refused: the credit needs a refund once paid, the payment finds nothing owed.
      expect(settled(results).filter(Boolean)).toHaveLength(1);
      await consistent(b, id);
    }
  });

  it('two payments of the whole balance with refunds on the invoice', async () => {
    const b = await business(t, 'Race Twice Office');
    for (let i = 0; i < ROUNDS; i++) {
      const id = await invoiceOf120(b);
      const one = await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, `race-d-${i}-1`)));
      await b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, `race-d-${i}-2`)));
      await credit(b, {
        mode: 'amount',
        invoiceId: id,
        amount: 2500,
        idempotencyKey: `race-d-${i}-cn`,
        refund: { ...REFUND, amount: 3000 },
      });
      await b.run((tx) => removePayment(tx, b.actor, one.id, 'Bounced'));
      // £120.00 less £60.00 received after the £30.00 refund, less the £30.00 credit: £60.00 owed.
      const results = await Promise.allSettled([
        b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, `race-d-${i}-3`))),
        b.run((tx) => recordPayment(tx, b.actor, pay(id, 6000, `race-d-${i}-4`))),
      ]);
      expect(settled(results).filter(Boolean)).toHaveLength(1);
      const { d } = await consistent(b, id);
      expect(d.balance).toBe(0);
    }
  });

  it('the same refund request twice', async () => {
    const b = await business(t, 'Race Repeat Office');
    for (let i = 0; i < ROUNDS; i++) {
      const id = await invoiceOf120(b);
      await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, `race-e-${i}`)));
      const input = {
        mode: 'whole' as const,
        invoiceId: id,
        idempotencyKey: `race-e-${i}-cn`,
        refund: { ...REFUND, amount: 12_000 },
      };
      const results = await Promise.allSettled([credit(b, input), credit(b, input)]);
      expect(settled(results)).toEqual([true, true]);
      const ids = results.map((r) => (r as PromiseFulfilledResult<{ id: string }>).value.id);
      expect(ids[0]).toBe(ids[1]);
      expect(await b.run((tx) => tx.select().from(refund).where(eq(refund.documentId, id)))).toHaveLength(1);
      await consistent(b, id);
    }
  });

  it('two reminder scans, and the same "send a reminder now" twice', async () => {
    const b = await business(t, 'Race Remind Office');
    await b.run((tx) =>
      updateReminderSettings(tx, b.actor, {
        remindersEnabled: true,
        reminderOffsets: [-3, 0, 7, 14, 30],
        reminderWording: {},
      }),
    );
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push(await invoiceOf120(b));
    // Due fourteen days after issue: three days before, the first reminder is due.
    const at = new Date(NOW.getTime() + 11 * 86_400_000);
    for (let i = 0; i < ROUNDS; i++) {
      await Promise.all([queueDueReminders(t.db, t.worker.db, at), queueDueReminders(t.db, t.worker.db, at)]);
    }
    const rows = await b.run((tx) =>
      tx.select({ key: outbox.idempotencyKey }).from(outbox).where(eq(outbox.topic, 'document.reminder')),
    );
    expect(rows.map((r) => r.key).sort()).toEqual(ids.map((id) => `reminder:${id}:-3`).sort());

    await Promise.allSettled([
      b.run((tx) => sendReminderNow(tx, b.actor, ids[0]!, 'click-0001', NOW)),
      b.run((tx) => sendReminderNow(tx, b.actor, ids[0]!, 'click-0001', NOW)),
    ]);
    const now = await b.run((tx) =>
      tx
        .select()
        .from(outbox)
        .where(eq(outbox.idempotencyKey, `reminder:${ids[0]}:now:click-0001`)),
    );
    expect(now).toHaveLength(1);
    // Payments are untouched by any of it.
    expect(await b.run((tx) => tx.select().from(payment))).toHaveLength(0);
  });
});
