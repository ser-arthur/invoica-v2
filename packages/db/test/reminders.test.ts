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
  updateReminderSettings,
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
  issued(
    b,
    [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }],
    { issueDate: '2026-09-10', dueDate: '2026-10-10' },
    at('2026-09-10'),
  );

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

describe('one business’s time zone never stops the scan for the others', () => {
  it('a time zone the database does not know, or a bare offset, cannot be saved', async () => {
    const b = await business(t, 'Zone Office');
    const setZone = (timeZone: string) =>
      b.run((tx) =>
        tx.update(organisation).set({ timeZone }).where(eq(organisation.id, b.actor.organisationId)),
      );
    for (const zone of ['Asia/Calcutta', '+05:30', '-03', 'Mars/Base']) {
      expect(await failure(setZone(zone)), zone).toMatch(/Choose a time zone from the list/);
    }
    await setZone('Asia/Kolkata');
    const [org] = await b.run((tx) => tx.select().from(organisation));
    expect(org!.timeZone).toBe('Asia/Kolkata');
  });

  it('a business whose time zone the database stops knowing is left out, and the others are reminded', async () => {
    const broken = await remindingBusiness('Broken Zone Office');
    const brokenInvoice = await dueOn10October(broken);
    const { Client } = await import('pg');
    const admin = new Client({ connectionString: t.ownerUrl });
    await admin.connect();
    try {
      // As after an upgrade of the time zone data: the name was saved when the database knew it.
      await admin.query('alter table organisation disable trigger guard_time_zone');
      await admin.query('update organisation set time_zone = $1 where id = $2', [
        'Mars/Base',
        broken.actor.organisationId,
      ]);
      await admin.query('alter table organisation enable trigger guard_time_zone');
    } finally {
      await admin.end();
    }
    const fine = await remindingBusiness('Fine Zone Office');
    const fineInvoice = await dueOn10October(fine);
    await queueDueReminders(t.db, t.worker.db, at('2026-10-17'));
    expect(await queued(fine, fineInvoice)).toEqual([7]);
    expect(await queued(broken, brokenInvoice)).toEqual([]);
  });
});

describe('a reminder never goes for a day before the invoice was issued', () => {
  it('an invoice with two days to pay gets no "three days before" reminder', async () => {
    const b = await remindingBusiness('Short Terms Office');
    const id = await issued(
      b,
      [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }],
      { issueDate: '2026-10-18', dueDate: '2026-10-20' },
      at('2026-10-18'),
    );
    await queueDueReminders(t.db, t.worker.db, at('2026-10-18'));
    expect(await queued(b, id)).toEqual([]);
    await queueDueReminders(t.db, t.worker.db, at('2026-10-20'));
    expect(await queued(b, id)).toEqual([0]);
  });

  it('an invoice dated earlier and issued after its due date waits for the next reminder after issue', async () => {
    const b = await remindingBusiness('Backdated Office');
    const id = await issued(
      b,
      [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }],
      { issueDate: '2026-10-01', dueDate: '2026-10-15' },
      at('2026-10-18'),
    );
    await queueDueReminders(t.db, t.worker.db, at('2026-10-18'));
    await queueDueReminders(t.db, t.worker.db, at('2026-10-21'));
    expect(await queued(b, id)).toEqual([]);
    await queueDueReminders(t.db, t.worker.db, at('2026-10-22'));
    expect(await queued(b, id)).toEqual([7]);
  });
});

/** Reminder jobs of every business, read as the database's administrator. */
async function allReminderJobs() {
  const { Client } = await import('pg');
  const url = new URL(process.env.TEST_DATABASE_ADMIN_URL!);
  url.pathname = `/${t.name}`;
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const r = await admin.query(`select count(*)::int as n from outbox where topic = 'document.reminder'`);
    return r.rows[0].n as number;
  } finally {
    await admin.end();
  }
}

describe('the scan’s count and its failures', () => {
  it('two scans at once count, between them, exactly the reminders they queued', async () => {
    const b = await remindingBusiness('Count Office');
    await dueOn10October(b);
    const before = await allReminderJobs();
    const counts = await Promise.all([
      queueDueReminders(t.db, t.worker.db, at('2026-10-17')),
      queueDueReminders(t.db, t.worker.db, at('2026-10-17')),
    ]);
    const added = (await allReminderJobs()) - before;
    expect(added).toBeGreaterThanOrEqual(1);
    expect(counts[0]! + counts[1]!).toBe(added);
    expect(await queueDueReminders(t.db, t.worker.db, at('2026-10-17'))).toBe(0);
  });

  it('a reminder that cannot be queued is left for the next scan, and the rest are queued', async () => {
    const first = await remindingBusiness('First Failing Office');
    const a = await dueOn10October(first);
    const second = await remindingBusiness('Second Fine Office');
    const c = await dueOn10October(second);
    let calls = 0;
    const flaky = new Proxy(t.db, {
      get(target, prop, receiver) {
        if (prop !== 'transaction') return Reflect.get(target, prop, receiver);
        return (...args: Parameters<typeof target.transaction>) => {
          calls += 1;
          if (calls === 1) return Promise.reject(new Error('connection lost'));
          return target.transaction(...args);
        };
      },
    });
    const before = await allReminderJobs();
    // The first reminder of the scan fails to queue; the scan carries on with the rest.
    const counted = await queueDueReminders(flaky, t.worker.db, at('2026-10-24'));
    expect(calls).toBeGreaterThanOrEqual(2);
    expect(counted).toBe((await allReminderJobs()) - before);
    expect(await queueDueReminders(t.db, t.worker.db, at('2026-10-24'))).toBe(1);
    expect([await queued(first, a), await queued(second, c)]).toEqual([[14], [14]]);
  });
});

describe('the plan', () => {
  it('reminders can be turned on only on a plan that has them, and off on any', async () => {
    process.env.INVOICA_PLANS = 'enforced';
    const b = await business(t, 'Plan Switch Office');
    await b.run((tx) =>
      tx
        .update(organisation)
        .set({ trialEndsAt: new Date('2026-09-01T00:00:00Z') })
        .where(eq(organisation.id, b.actor.organisationId)),
    );
    const settings = { reminderOffsets: [-3, 0, 7] as const, reminderWording: {} };
    expect(
      await failure(
        b.run((tx) =>
          updateReminderSettings(
            tx,
            b.actor,
            { ...settings, reminderOffsets: [-3, 0, 7], remindersEnabled: true },
            at('2026-10-17'),
          ),
        ),
      ),
    ).toMatch(/Reminders are part of the Pro and Studio plans/);
    await b.run((tx) =>
      updateReminderSettings(
        tx,
        b.actor,
        { ...settings, reminderOffsets: [-3, 0, 7], remindersEnabled: false },
        at('2026-10-17'),
      ),
    );
    const [org] = await b.run((tx) => tx.select().from(organisation));
    expect([org!.remindersEnabled, org!.reminderOffsets]).toEqual([false, [-3, 0, 7]]);
  });
});

describe('what a reminder says, and what the invoice page says comes next', () => {
  it('a due-date reminder caught up three days late reads as late', async () => {
    const b = await remindingBusiness('Late Wording Office');
    const id = await dueOn10October(b);
    expect(await b.run((tx) => reminderContext(tx, id, 0, at('2026-10-13')))).toMatchObject({
      kind: 'late',
      today: '2026-10-13',
    });
    expect((await b.run((tx) => reminderContext(tx, id, -3, at('2026-10-10'))))?.kind).toBe('due');
  });

  it('the page names the reminder the scan sends today, before the ones to come', async () => {
    const b = await remindingBusiness('Next Today Office');
    const id = await issued(
      b,
      [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }],
      { issueDate: '2026-09-16', dueDate: '2026-10-16' },
      at('2026-09-16'),
    );
    expect((await b.run((tx) => reminderStatus(tx, id, '2026-10-18'))).next).toEqual({
      offset: 0,
      date: '2026-10-18',
    });
    await queueDueReminders(t.db, t.worker.db, at('2026-10-18'));
    expect(await queued(b, id)).toEqual([0]);
    expect((await b.run((tx) => reminderStatus(tx, id, '2026-10-18'))).next).toEqual({
      offset: 7,
      date: '2026-10-23',
    });
  });

  it('the page never names a reminder for a day before the invoice was issued', async () => {
    const b = await remindingBusiness('Next Issued Office');
    const id = await issued(
      b,
      [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }],
      { issueDate: '2026-10-18', dueDate: '2026-10-20' },
      at('2026-10-18'),
    );
    expect((await b.run((tx) => reminderStatus(tx, id, '2026-10-18'))).next).toEqual({
      offset: 0,
      date: '2026-10-20',
    });
  });
});
