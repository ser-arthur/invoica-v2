import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drainOutbox, emailDeliveries, enqueue, type JobHandler } from '../src/outbox';
import { createTestDatabase, type TestDatabase } from './helpers';
import { business, issued, type Business } from './business';

/** docs/specs/email-status.md: what the invoice page says about emails and reminders that have not gone. */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

const refused = Object.assign(new Error('The address cannot receive email.'), { retry: false });
const busy = Object.assign(new Error('The provider is busy.'), { retry: true });

/** Runs every due job, with emails and reminders answered by `send`. */
const drain = (send: JobHandler) =>
  drainOutbox(t.worker.db, {
    'document.render_pdf': async () => undefined,
    'document.email': send,
    'document.reminder': send,
  });

const email = (b: Business, id: string, to: string, key: string) =>
  b.run((tx) =>
    enqueue(tx, b.actor, 'document.email', { documentId: id, to, subject: 'Invoice', message: 'Hello' }, key),
  );

const deliveries = (b: Business, id: string) => b.run((tx) => emailDeliveries(tx, id));

const anInvoice = (b: Business) => issued(b, [{ quantity: 1000, unitPrice: 10_000, code: b.codes.vat20 }]);

describe('emails and reminders that have not gone', () => {
  it('an email waiting to go, then being tried again, then refused, and then sent after all', async () => {
    const b = await business(t, 'Delivery Office');
    const id = await anInvoice(b);
    expect(await deliveries(b, id)).toEqual([]);

    await email(b, id, 'accounts@wrong.example', 'deliver-email-01');
    expect(await deliveries(b, id)).toEqual([
      { kind: 'email', to: 'accounts@wrong.example', status: 'sending' },
    ]);

    await drain(async () => {
      throw busy;
    });
    expect(await deliveries(b, id)).toEqual([
      { kind: 'email', to: 'accounts@wrong.example', status: 'retrying' },
    ]);

    // The next try is due now, as it would be after the delay.
    const { Client } = await import('pg');
    const owner = new Client({ connectionString: t.ownerUrl });
    await owner.connect();
    try {
      await owner.query('update outbox set run_after = now() where organisation_id = $1', [
        b.actor.organisationId,
      ]);
    } finally {
      await owner.end();
    }
    await drain(async () => {
      throw refused;
    });
    expect(await deliveries(b, id)).toEqual([
      { kind: 'email', to: 'accounts@wrong.example', status: 'failed' },
    ]);

    // A later email that goes clears it.
    await email(b, id, 'accounts@right.example', 'deliver-email-02');
    expect(await deliveries(b, id)).toEqual([
      { kind: 'email', to: 'accounts@right.example', status: 'sending' },
    ]);
    await drain(async () => undefined);
    expect(await deliveries(b, id)).toEqual([]);
  });

  it('a reminder that could not be sent is shown apart from the invoice email', async () => {
    const b = await business(t, 'Reminder Delivery Office');
    const id = await anInvoice(b);
    await b.run((tx) =>
      enqueue(tx, b.actor, 'document.reminder', { documentId: id, offset: null }, 'deliver-reminder-01'),
    );
    await drain(async () => {
      throw refused;
    });
    expect(await deliveries(b, id)).toEqual([{ kind: 'reminder', to: null, status: 'failed' }]);
  });

  it('another business sees none of them', async () => {
    const a = await business(t, 'Own Delivery Office');
    const other = await business(t, 'Other Delivery Office');
    const id = await anInvoice(a);
    await email(a, id, 'accounts@own.example', 'deliver-email-03');
    expect(await deliveries(other, id)).toEqual([]);
    expect(await deliveries(a, id)).toHaveLength(1);
  });
});
