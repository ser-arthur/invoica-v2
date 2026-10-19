import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { asc, eq, sql } from 'drizzle-orm';
import { recordPayment } from '../src/documents';
import { client, organisation, outbox } from '../src/schema';
import {
  queueDueReminders,
  reminderContext,
  reminderStatus,
  sendReminderNow,
  setRemindersPaused,
} from '../src/reminders';
import { withOrganisation } from '../src/tenancy';
import { createTestDatabase, type TestDatabase } from './helpers';
import { business, failure, issued, pay, type Business } from './business';

/** docs/specs/reminders.md, acceptance criteria 1 to 4, and the scan's narrow view across organisations. */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

afterEach(() => {
  delete process.env.INVOICA_PLANS;
});

/** 9am in London on a day of October or November 2026. */
const at = (day: string) => new Date(`${day}T08:00:00Z`);

const days = (from: string, to: string) => {
  const out: string[] = [];
  for (
    let d = new Date(`${from}T00:00:00Z`);
    d <= new Date(`${to}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1)
  )
    out.push(d.toISOString().slice(0, 10));
  return out;
};

async function remindingBusiness(name: string) {
  const b = await business(t, name);
  await b.run((tx) =>
    tx
      .update(organisation)
      .set({ remindersEnabled: true })
      .where(eq(organisation.id, b.actor.organisationId)),
  );
  return b;
}

/** £100.00 plus VAT, issued on 10 September and due on 10 October. */
const dueOn10October = (b: Business) =>
  issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }], {
    issueDate: '2026-09-10',
    dueDate: '2026-10-10',
  });

const queued = (b: Business, documentId: string) =>
  b.run(async (tx) =>
    (
      await tx
        .select()
        .from(outbox)
        .where(eq(outbox.topic, 'document.reminder'))
        .orderBy(asc(outbox.createdAt))
    )
      .filter((j) => j.payload.documentId === documentId)
      .map((j) => j.payload.offset as number | null),
  );

describe('criterion 1: the schedule', () => {
  it('an invoice due on 10 October gets reminders on 7, 10, 17 and 24 October and 9 November, and none once paid', async () => {
    const b = await remindingBusiness('Schedule Office');
    const id = await dueOn10October(b);
    const paidLater = await dueOn10October(b);
    const seen: [string, number | null][] = [];
    for (const day of days('2026-10-01', '2026-11-20')) {
      if (day === '2026-10-20') {
        await b.run((tx) => recordPayment(tx, b.actor, pay(paidLater, 12_000, 'reminder-paid-01')));
      }
      await queueDueReminders(t.db, t.worker.db, at(day));
      for (const offset of await queued(b, id)) {
        if (!seen.some(([, o]) => o === offset)) seen.push([day, offset]);
      }
    }
    expect(seen).toEqual([
      ['2026-10-07', -3],
      ['2026-10-10', 0],
      ['2026-10-17', 7],
      ['2026-10-24', 14],
      ['2026-11-09', 30],
    ]);
    expect(await queued(b, paidLater)).toEqual([-3, 0, 7]);
  });
});

describe('criterion 2: two scans on the same day', () => {
  it('queue one reminder', async () => {
    const b = await remindingBusiness('Twice Office');
    const id = await dueOn10October(b);
    await Promise.all([
      queueDueReminders(t.db, t.worker.db, at('2026-10-17')),
      queueDueReminders(t.db, t.worker.db, at('2026-10-17')),
    ]);
    await queueDueReminders(t.db, t.worker.db, at('2026-10-17'));
    expect(await queued(b, id)).toEqual([7]);
  });
});

describe('criterion 3: who gets none', () => {
  it('a paused invoice, a client with reminders off or without an email, and the free plan', async () => {
    const b = await remindingBusiness('None Office');
    const paused = await dueOn10October(b);
    await b.run((tx) => setRemindersPaused(tx, b.actor, paused, true));
    const resumed = await dueOn10October(b);
    await b.run((tx) => setRemindersPaused(tx, b.actor, resumed, true));
    await b.run((tx) => setRemindersPaused(tx, b.actor, resumed, false));
    await queueDueReminders(t.db, t.worker.db, at('2026-10-17'));
    expect(await queued(b, paused)).toEqual([]);
    expect(await queued(b, resumed)).toEqual([7]);

    const quiet = await remindingBusiness('Quiet Client Office');
    await quiet.run((tx) => tx.update(client).set({ remindersEnabled: false }));
    const toQuiet = await dueOn10October(quiet);
    const noEmail = await remindingBusiness('No Email Office');
    await noEmail.run((tx) => tx.update(client).set({ email: null }));
    const toNobody = await dueOn10October(noEmail);
    await queueDueReminders(t.db, t.worker.db, at('2026-10-17'));
    expect(await queued(quiet, toQuiet)).toEqual([]);
    expect(await queued(noEmail, toNobody)).toEqual([]);

    process.env.INVOICA_PLANS = 'enforced';
    const free = await remindingBusiness('Free Office');
    await free.run((tx) =>
      tx
        .update(organisation)
        .set({ trialEndsAt: new Date('2026-09-01T00:00:00Z') })
        .where(eq(organisation.id, free.actor.organisationId)),
    );
    const onFree = await dueOn10October(free);
    await queueDueReminders(t.db, t.worker.db, at('2026-10-17'));
    expect(await queued(free, onFree)).toEqual([]);
    expect(
      await failure(
        free.run((tx) => sendReminderNow(tx, free.actor, onFree, 'now-free-0001', at('2026-10-17'))),
      ),
    ).toMatch(/plan/);
  });

  it('an organisation with reminders off gets none', async () => {
    const b = await business(t, 'Off Office');
    const id = await dueOn10October(b);
    await queueDueReminders(t.db, t.worker.db, at('2026-10-17'));
    expect(await queued(b, id)).toEqual([]);
  });
});

describe('criterion 4: missed days', () => {
  it('a scan after missed days sends only the latest reminder that was due', async () => {
    const b = await remindingBusiness('Missed Office');
    const id = await dueOn10October(b);
    await queueDueReminders(t.db, t.worker.db, at('2026-10-18'));
    expect(await queued(b, id)).toEqual([7]);
  });
});

describe('sending', () => {
  it('when the job runs, it is skipped for an invoice paid since, and carries the balance owed then', async () => {
    const b = await remindingBusiness('Send Office');
    const id = await dueOn10October(b);
    const before = await b.run((tx) => reminderContext(tx, id, 7, at('2026-10-17')));
    expect(before).toMatchObject({
      to: 'accounts@northlane.example',
      kind: 'late',
      balance: 12_000,
      dueDate: '2026-10-10',
      today: '2026-10-17',
    });
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 2000, 'reminder-part-01')));
    expect((await b.run((tx) => reminderContext(tx, id, 7, at('2026-10-17'))))?.balance).toBe(10_000);
    await b.run((tx) => recordPayment(tx, b.actor, pay(id, 10_000, 'reminder-rest-01')));
    expect(await b.run((tx) => reminderContext(tx, id, 7, at('2026-10-17')))).toBeNull();
  });

  it('"Send a reminder now" queues one at once and leaves the schedule alone', async () => {
    const b = await remindingBusiness('Now Office');
    const id = await dueOn10October(b);
    await b.run((tx) => sendReminderNow(tx, b.actor, id, 'now-key-000001', at('2026-10-12')));
    await b.run((tx) => sendReminderNow(tx, b.actor, id, 'now-key-000001', at('2026-10-12')));
    expect(await queued(b, id)).toEqual([null]);
    await queueDueReminders(t.db, t.worker.db, at('2026-10-17'));
    expect(await queued(b, id)).toEqual([null, 7]);
    const status = await b.run((tx) => reminderStatus(tx, id, '2026-10-18'));
    expect(status).toMatchObject({ on: true, paused: false, next: { offset: 14, date: '2026-10-24' } });
  });
});

describe('the scan’s view across organisations', () => {
  it('only the worker can run it, and it returns ids only', async () => {
    expect(await failure(t.db.execute(sql`select * from app.due_reminders(now())`))).toMatch(
      /permission denied/,
    );
    const rows = await t.worker.db.execute(sql`select * from app.due_reminders(${at('2026-10-17')})`);
    expect(rows.fields.map((f) => f.name)).toEqual([
      'organisation_id',
      'document_id',
      'offset_days',
      'owner_user_id',
    ]);
  });

  it('setting the scan flag gives the app role nothing more', async () => {
    const a = await remindingBusiness('Flag Office A');
    const other = await remindingBusiness('Flag Office B');
    await dueOn10October(other);
    const seen = await withOrganisation(t.db, a.actor, async (tx) => {
      await tx.execute(sql`select set_config('app.reminder_scan', 'on', true)`);
      return (await tx.execute(sql`select count(*)::int as n from document`)).rows[0] as { n: number };
    });
    expect(seen.n).toBe(0);
  });
});
