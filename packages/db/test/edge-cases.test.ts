import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { MAX_UNIT_PRICE, addDays, todayIn, type DocumentSnapshot } from '@invoica/core';
import { draftInput, type DraftFormInput, type DraftInput } from '@invoica/schemas';
import { setClientArchived } from '../src/clients';
import { getDashboard } from '../src/dashboard';
import {
  createCreditNote,
  createDraft,
  getDocument,
  issueDocument,
  listDocuments,
  recordPayment,
  updateDraft,
} from '../src/documents';
import { queueDueReminders, updateReminderSettings } from '../src/reminders';
import { client, document, organisation, outbox, payment } from '../src/schema';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, failure, pay, type Business } from './business';

/** Edge cases people will meet: odd currencies, very large figures, drafts that change, time zones and dates. */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

const draft = (b: Business, over: Partial<DraftFormInput>) =>
  draftInput.parse({
    clientId: b.clientId,
    currency: 'GBP',
    lineStyle: 'quantity',
    pricesIncludeTax: false,
    template: 'signature',
    lines: [{ title: 'Work', quantity: 1000, unitPrice: 10_000, taxCodeId: b.codes.vat20 }],
    ...over,
  });

const issueOf = async (b: Business, input: DraftInput, now = NOW) => {
  const id = await b.run((tx) => createDraft(tx, b.actor, input, NOW));
  await b.run((tx) => issueDocument(tx, b.actor, id, now));
  return id;
};

const detail = async (b: Business, id: string) => (await b.run((tx) => getDocument(tx, id, TODAY)))!;
const snapshotOf = async (b: Business, id: string) =>
  (await detail(b, id)).document.snapshot as unknown as DocumentSnapshot;

describe('currencies without minor units, and with three', () => {
  it('yen: VAT in sterling, a part payment, a refunded credit and a settling credit add up exactly', async () => {
    const b = await business(t, 'Yen Office');
    // ¥10,000 plus VAT at 20%: ¥12,000, of which ¥2,000 VAT. At ¥190.25 to £1 that VAT is £10.51.
    const id = await issueOf(
      b,
      draft(b, {
        currency: 'JPY',
        sterlingRate: '190.25',
        lines: [{ title: 'Licence', quantity: 1000, unitPrice: 10_000, taxCodeId: b.codes.vat20 }],
      }),
    );
    const snap = await snapshotOf(b, id);
    expect([snap.totals.total, snap.totals.taxTotal]).toEqual([12_000, 2000]);
    expect(snap.sterlingVat).toMatchObject({ charged: 1051, rate: 190_250_000 });
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 7001, 'jpy-pay-0001')));
    // An amount of ¥5,000 before VAT is ¥6,000, more than the ¥4,999 owed: ¥1,001 is refunded.
    const cn = await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        {
          mode: 'amount',
          invoiceId: id,
          amount: 5000,
          reason: 'Fewer seats',
          idempotencyKey: 'jpy-credit-01',
          refund: { amount: 1001, refundedOn: TODAY, method: 'bank_transfer', reference: null },
        },
        NOW,
      ),
    );
    const note = await snapshotOf(b, cn.id);
    expect(note.totals.total).toBe(6000);
    expect(note.sterlingVat?.charged).toBe(526);
    const d = await detail(b, id);
    expect([d.balance, d.refunds[0]?.amount]).toEqual([0, 1001]);
    expect(d.state).toBe('settled');
  });

  it('Kuwaiti dinars: three decimal places through VAT in sterling and a credit for everything owed', async () => {
    const b = await business(t, 'Dinar Office');
    // 6.250 KWD plus VAT: 7.500, of which 1.250 VAT. At 0.385 to £1 that VAT is £3.246..., so £3.25.
    const id = await issueOf(
      b,
      draft(b, {
        currency: 'KWD',
        sterlingRate: '0.385',
        lines: [{ title: 'Survey', quantity: 1000, unitPrice: 6250, taxCodeId: b.codes.vat20 }],
      }),
    );
    expect((await snapshotOf(b, id)).sterlingVat?.charged).toBe(325);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 1, 'kwd-pay-0001')));
    await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        { mode: 'balance', invoiceId: id, balance: 7499, reason: 'Waived', idempotencyKey: 'kwd-balance-1' },
        NOW,
      ),
    );
    const d = await detail(b, id);
    expect([d.balance, d.applied.credited, d.state]).toEqual([0, 7499, 'settled']);
  });
});

describe('very large figures', () => {
  it('the largest price is invoiced, paid and summed exactly', async () => {
    const b = await business(t, 'Large Office');
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push(
        await issueOf(
          b,
          draft(b, {
            lines: [{ title: 'Asset', quantity: 1000, unitPrice: MAX_UNIT_PRICE, taxCodeId: b.codes.vat20 }],
          }),
        ),
      );
    }
    const total = (await detail(b, ids[0]!)).document.total;
    expect(total).toBe(1_200_000_000_000);
    await b.run((tx) => recordPayment(tx, b.actor, pay(ids[0]!, total - 1, 'large-pay-001')));
    const dash = await b.run((tx) => getDashboard(tx, TODAY, 'GBP'));
    expect(dash.receivables.find((r) => r.currency === 'GBP')?.outstanding).toBe(2 * total + 1);
  });

  it('a total past the largest safe figure is refused with a message, and nothing is saved', async () => {
    const b = await business(t, 'Too Large Office');
    const huge = draft(b, {
      lines: Array.from({ length: 10 }, () => ({
        title: 'Asset',
        quantity: 1_000_000_000_000,
        unitPrice: MAX_UNIT_PRICE,
        taxCodeId: b.codes.vat20,
      })),
    });
    expect(await failure(b.run((tx) => createDraft(tx, b.actor, huge, NOW)))).toMatch(/too large/i);
    expect(await b.run((tx) => tx.select().from(document))).toHaveLength(0);
  });
});

describe('drafts that change after a rate is entered', () => {
  it('switched to pounds, or to lines without VAT, they need no VAT in sterling', async () => {
    const b = await business(t, 'Change Office');
    const euros = draft(b, { currency: 'EUR', sterlingRate: '1.1500' });
    const id = await b.run((tx) => createDraft(tx, b.actor, euros, NOW));
    await b.run((tx) => updateDraft(tx, b.actor, id, { ...euros, currency: 'GBP' }, NOW));
    await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    expect((await snapshotOf(b, id)).sterlingVat).toBeUndefined();

    const outside = await issueOf(
      b,
      draft(b, {
        currency: 'EUR',
        sterlingRate: '1.1500',
        lines: [{ title: 'Export', quantity: 1000, unitPrice: 10_000, taxCodeId: b.codes.zero }],
      }),
    );
    expect((await snapshotOf(b, outside)).sterlingVat).toBeUndefined();
  });

  it('a rate cleared before issuing is asked for again', async () => {
    const b = await business(t, 'Cleared Office');
    const euros = draft(b, { currency: 'EUR', sterlingRate: '1.1500' });
    const id = await b.run((tx) => createDraft(tx, b.actor, euros, NOW));
    await b.run((tx) => updateDraft(tx, b.actor, id, { ...euros, sterlingRate: null }, NOW));
    expect(await failure(b.run((tx) => issueDocument(tx, b.actor, id, NOW)))).toMatch(/exchange rate/);
  });

  it('a rate changed on the draft is the one kept', async () => {
    const b = await business(t, 'Rate Change Office');
    const euros = draft(b, { currency: 'EUR', sterlingRate: '1.1500' });
    const id = await b.run((tx) => createDraft(tx, b.actor, euros, NOW));
    await b.run((tx) => updateDraft(tx, b.actor, id, { ...euros, sterlingRate: 1_160_000 }, NOW));
    await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
    expect((await snapshotOf(b, id)).sterlingVat?.rate).toBe(1_160_000);
  });
});

describe('payments and refunds are not dated in the future', () => {
  it('a payment dated after today, in the business’s time zone, is refused', async () => {
    const b = await business(t, 'Future Office');
    const id = await issueOf(b, draft(b, {}));
    expect(
      await failure(
        b.run((tx) =>
          recordPayment(tx, b.actor, { ...pay(id, 100, 'future-pay-01'), paidOn: '2026-10-19' }, NOW),
        ),
      ),
    ).toMatch(/dated after today/);
    await b.run((tx) =>
      recordPayment(tx, b.actor, { ...pay(id, 100, 'future-pay-02'), paidOn: '2026-10-18' }, NOW),
    );
    // Earlier dates are fine: payments are often recorded late.
    await b.run((tx) =>
      recordPayment(tx, b.actor, { ...pay(id, 100, 'future-pay-03'), paidOn: '2025-01-01' }, NOW),
    );
  });

  it('in Auckland it is already tomorrow', async () => {
    const b = await business(t, 'Auckland Office');
    await b.run((tx) =>
      tx
        .update(organisation)
        .set({ timeZone: 'Pacific/Auckland' })
        .where(eq(organisation.id, b.actor.organisationId)),
    );
    const id = await issueOf(b, draft(b, {}));
    // 10:00 UTC on 18 October is 23:00 on 18 October in Auckland; at 12:00 UTC it is 01:00 on the 19th.
    const late = new Date('2026-10-18T12:00:00Z');
    await b.run((tx) =>
      recordPayment(tx, b.actor, { ...pay(id, 100, 'akl-pay-0001'), paidOn: '2026-10-19' }, late),
    );
  });

  it('a deposit dated after today is refused when the invoice is issued', async () => {
    const b = await business(t, 'Future Deposit Office');
    const id = await b.run((tx) =>
      createDraft(
        tx,
        b.actor,
        draft(b, {
          prepayments: [{ label: 'Deposit', amount: 1000, paidOn: '2026-10-30', method: 'bank_transfer' }],
        }),
      ),
    );
    expect(await failure(b.run((tx) => issueDocument(tx, b.actor, id, NOW)))).toMatch(/dated after today/);
  });

  it('a refund dated after today is refused', async () => {
    const b = await business(t, 'Future Refund Office');
    const id = await issueOf(b, draft(b, {}));
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 12_000, 'future-ref-01')));
    expect(
      await failure(
        b.run((tx) =>
          createCreditNote(
            tx,
            b.actor,
            {
              mode: 'whole',
              invoiceId: id,
              reason: 'Returned',
              idempotencyKey: 'future-ref-cn',
              refund: { amount: 12_000, refundedOn: '2026-10-25', method: 'bank_transfer', reference: null },
            },
            NOW,
          ),
        ),
      ),
    ).toMatch(/dated after today/);
  });
});

describe('R9-L7: the database refuses money dated well after today', () => {
  it('a payment written straight to the database for a later day is refused, and one for today is kept', async () => {
    const b = await business(t, 'Direct Payment Office');
    const id = await issueOf(b, draft(b, {}));
    const insert = (paidOn: string, key: string) =>
      b.run((tx) =>
        tx.insert(payment).values({
          organisationId: b.actor.organisationId,
          documentId: id,
          amount: 100,
          currency: 'GBP',
          paidOn,
          method: 'bank_transfer',
          idempotencyKey: key,
        }),
      );
    expect(await failure(insert('2099-01-01', 'direct-future-1'))).toBe(
      'A payment cannot be dated after today.',
    );
    const today = todayIn('Europe/London', new Date());
    expect(await failure(insert(addDays(today, 3), 'direct-future-2'))).toBe(
      'A payment cannot be dated after today.',
    );
    await insert(today, 'direct-today-1');
  });
});

describe('reminders across time zones, clock changes and month ends', () => {
  async function dueOn(name: string, timeZone: string, dueDate: string, offsets: number[]) {
    const b = await business(t, name);
    await b.run(async (tx) => {
      await tx.update(organisation).set({ timeZone }).where(eq(organisation.id, b.actor.organisationId));
      await updateReminderSettings(tx, b.actor, {
        remindersEnabled: true,
        reminderOffsets: offsets as (-3 | 0 | 7 | 14 | 30)[],
        reminderWording: {},
      });
    });
    const id = await issueOf(b, draft(b, { issueDate: '2026-01-01', dueDate }));
    const queuedAt = async (instant: string) => {
      await queueDueReminders(t.db, t.worker.db, new Date(instant));
      const rows = await b.run((tx) =>
        tx.select({ key: outbox.idempotencyKey }).from(outbox).where(eq(outbox.topic, 'document.reminder')),
      );
      return rows.map((r) => r.key.replace(`reminder:${id}:`, '')).sort();
    };
    return { b, id, queuedAt };
  }

  it('Auckland: due at local midnight, not at UTC midnight', async () => {
    const { queuedAt } = await dueOn('Auckland Remind', 'Pacific/Auckland', '2026-11-01', [0]);
    // 10:59 UTC on 31 October is 23:59 in Auckland (13 hours ahead in summer).
    expect(await queuedAt('2026-10-31T10:59:00Z')).toEqual([]);
    expect(await queuedAt('2026-10-31T11:01:00Z')).toEqual(['0']);
  });

  it('London, the night the clocks go back', async () => {
    const { queuedAt } = await dueOn('London Remind', 'Europe/London', '2026-10-25', [0]);
    // 22:59 UTC on 24 October is 23:59 BST; at 23:01 UTC it is 00:01 on the 25th.
    expect(await queuedAt('2026-10-24T22:59:00Z')).toEqual([]);
    expect(await queuedAt('2026-10-24T23:01:00Z')).toEqual(['0']);
  });

  it('Los Angeles, the day after the clocks go back', async () => {
    const { queuedAt } = await dueOn('LA Remind', 'America/Los_Angeles', '2026-11-02', [0]);
    // On 2 November Los Angeles is 8 hours behind: 07:59 UTC is still the 1st.
    expect(await queuedAt('2026-11-02T07:59:00Z')).toEqual([]);
    expect(await queuedAt('2026-11-02T08:01:00Z')).toEqual(['0']);
  });

  it('month ends and leap days: thirty days after 31 January is 2 March', async () => {
    const { queuedAt } = await dueOn('Month End Remind', 'Europe/London', '2027-01-31', [30]);
    expect(await queuedAt('2027-03-01T12:00:00Z')).toEqual([]);
    expect(await queuedAt('2027-03-02T12:00:00Z')).toEqual(['30']);
    const leap = await dueOn('Leap Remind', 'Europe/London', '2028-02-29', [-3, 0]);
    expect(await leap.queuedAt('2028-02-26T12:00:00Z')).toEqual(['-3']);
    expect(await leap.queuedAt('2028-02-29T12:00:00Z')).toEqual(['-3', '0']);
  });

  it('after days without a scan, only the latest reminder due goes, and nothing older than a week', async () => {
    const { queuedAt } = await dueOn('Missed Remind', 'Europe/London', '2026-11-10', [-3, 0, 7, 14, 30]);
    expect(await queuedAt('2026-11-20T12:00:00Z')).toEqual(['7']);
    // Fourteen days late is 24 November.
    expect(await queuedAt('2026-11-23T12:00:00Z')).toEqual(['7']);
    expect(await queuedAt('2026-11-25T12:00:00Z')).toEqual(['14', '7']);
    // Thirty days late is 10 December; a first scan on the 20th finds it more than a week old.
    expect(await queuedAt('2026-12-20T12:00:00Z')).toEqual(['14', '7']);
  });
});

describe('clients and names', () => {
  it('an archived client’s invoices stay listed, payable, creditable and reminded', async () => {
    const b = await business(t, 'Archived Client Office');
    await b.run((tx) =>
      updateReminderSettings(tx, b.actor, {
        remindersEnabled: true,
        reminderOffsets: [0],
        reminderWording: {},
      }),
    );
    const id = await issueOf(b, draft(b, { issueDate: '2026-10-01', dueDate: '2026-10-18' }));
    await b.run((tx) => setClientArchived(tx, b.actor, b.clientId, true));
    expect(
      (await b.run((tx) => listDocuments(tx, { kind: 'invoice', today: TODAY }))).map((d) => d.id),
    ).toEqual([id]);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 100, 'arch-pay-0001')));
    await queueDueReminders(t.db, t.worker.db, NOW);
    const keys = await b.run((tx) =>
      tx.select({ key: outbox.idempotencyKey }).from(outbox).where(eq(outbox.topic, 'document.reminder')),
    );
    expect(keys.map((k) => k.key)).toEqual([`reminder:${id}:0`]);
    const owed = (await detail(b, id)).balance;
    await b.run((tx) =>
      createCreditNote(
        tx,
        b.actor,
        { mode: 'balance', invoiceId: id, balance: owed, reason: 'Closed', idempotencyKey: 'arch-cn-01' },
        NOW,
      ),
    );
    expect((await detail(b, id)).state).toBe('settled');
  });

  it('names in any script, with symbols, are kept exactly and never break the document', async () => {
    const b = await business(t, 'Unicode Office');
    const name = 'Ọ̀ṣun & Kofi "Owusu" <Studio> Ltd 東京 مكتب';
    await b.run((tx) => tx.update(client).set({ name }).where(eq(client.id, b.clientId)));
    const id = await issueOf(b, draft(b, {}));
    expect((await snapshotOf(b, id)).buyer.name).toBe(name);
    expect((await b.run((tx) => listDocuments(tx, { today: TODAY })))[0]!.clientName).toBe(name);
  });
});
