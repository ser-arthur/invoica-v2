import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { and, eq, sql } from 'drizzle-orm';
import {
  addDays,
  planAmountCredit,
  planBalanceCredit,
  planLineCredit,
  refundFor,
  todayIn,
  type DocumentSnapshot,
  type DocumentState,
} from '@invoica/core';
import {
  draftInput,
  organisationProfileInput,
  type PaymentInput,
  type ReminderSettingsInput,
} from '@invoica/schemas';
import { getDashboard } from '../src/dashboard';
import {
  createCreditNote,
  creditPosition,
  createDraft,
  getDocument,
  issueDocument,
  listDocuments,
  markSent,
  recordPayment,
  removePayment,
  voidDocument,
} from '../src/documents';
import { exportOrganisation } from '../src/export';
import { getOrganisation, updateOrganisationProfile } from '../src/organisations';
import {
  queueDueReminders,
  reminderContext,
  sendReminderNow,
  setRemindersPaused,
  updateReminderSettings,
} from '../src/reminders';
import { client, document, documentLine, outbox, payment, refund } from '../src/schema';
import { createTaxCode } from '../src/taxes';
import { createTestDatabase, type TestDatabase } from './helpers';
import { NOW, TODAY, business, type Business } from './business';

/**
 * Journeys: random sequences of the operations people really do, one business at a time, checked against a model
 * kept here and written apart from the app's own code. After every step, every figure the business can see must
 * agree with the model and with every other place it is shown; an operation that is refused must change nothing.
 *
 * Covered together: issuing in pounds and euros (VAT in sterling), prices with and without tax, deposits, payments
 * and their removal, credit notes of every kind with refunds when they go above the balance, voiding, marking as
 * sent, pausing reminders and the reminder scan on later days.
 */

let t: TestDatabase;

beforeAll(async () => {
  t = await createTestDatabase();
});

afterAll(async () => {
  await t?.close();
});

// ---------------------------------------------------------------------------------------------------------------
// Operations

type CodeName = 'vat20' | 'vat5' | 'zero' | 'none' | 'reverse';

interface LineSpec {
  quantity: number;
  unitPrice: number;
  code: CodeName;
}

type Op =
  | {
      kind: 'issue';
      currency: 'GBP' | 'EUR';
      rate: string;
      pricesIncludeTax: boolean;
      lines: LineSpec[];
      deposit: number;
    }
  | { kind: 'pay'; target: number; share: number; extra: number }
  | { kind: 'removePayment'; target: number; which: number }
  | { kind: 'creditWhole'; target: number; refundPolicy: 'right' | 'never' | 'always' }
  | { kind: 'creditLines'; target: number; share: number }
  | { kind: 'creditAmount'; target: number; share: number }
  | { kind: 'creditBalance'; target: number }
  | { kind: 'void'; target: number }
  | { kind: 'send'; target: number }
  | { kind: 'pause'; target: number; paused: boolean }
  | { kind: 'scan'; days: number }
  | { kind: 'remindNow'; target: number }
  | { kind: 'deliver'; target: number; days: number }
  | { kind: 'clientReminders'; on: boolean; email: boolean }
  | { kind: 'orgReminders'; on: boolean; offsets: number[] }
  | { kind: 'settings'; prefix: number; method: 'hmrc_period' | 'market' }
  | { kind: 'repeatPay'; changed: boolean }
  | { kind: 'draft' };

const lineArb: fc.Arbitrary<LineSpec> = fc.record({
  quantity: fc.oneof(fc.constantFrom(1000, 2000, 3000), fc.integer({ min: 1, max: 5000 })),
  unitPrice: fc.oneof(fc.integer({ min: 1, max: 300 }), fc.integer({ min: 300, max: 80_000 })),
  code: fc.constantFrom<CodeName>('vat20', 'vat20', 'vat5', 'zero', 'none', 'reverse'),
});

const target = fc.nat({ max: 7 });
const share = fc.integer({ min: 0, max: 1000 });

const opArb: fc.Arbitrary<Op> = fc.oneof(
  {
    weight: 4,
    arbitrary: fc.record({
      kind: fc.constant('issue' as const),
      currency: fc.constantFrom<'GBP' | 'EUR'>('GBP', 'GBP', 'EUR'),
      rate: fc.constantFrom('1.1500', '0.8650', '1.000001', '100'),
      pricesIncludeTax: fc.boolean(),
      lines: fc.array(lineArb, { minLength: 1, maxLength: 3 }),
      deposit: fc.oneof(fc.constant(0), fc.integer({ min: 1, max: 5000 })),
    }),
  },
  {
    weight: 5,
    arbitrary: fc.record({
      kind: fc.constant('pay' as const),
      target,
      share,
      extra: fc.integer({ min: -1, max: 2 }),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({ kind: fc.constant('removePayment' as const), target, which: fc.nat({ max: 5 }) }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant('creditWhole' as const),
      target,
      refundPolicy: fc.constantFrom<'right' | 'never' | 'always'>('right', 'right', 'never', 'always'),
    }),
  },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant('creditLines' as const), target, share }) },
  { weight: 3, arbitrary: fc.record({ kind: fc.constant('creditAmount' as const), target, share }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant('creditBalance' as const), target }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('void' as const), target }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('send' as const), target }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('pause' as const), target, paused: fc.boolean() }) },
  {
    weight: 2,
    arbitrary: fc.record({ kind: fc.constant('scan' as const), days: fc.integer({ min: 0, max: 50 }) }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('remindNow' as const), target }) },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant('deliver' as const),
      target,
      days: fc.integer({ min: 0, max: 50 }),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('clientReminders' as const),
      on: fc.boolean(),
      email: fc.boolean(),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('orgReminders' as const),
      on: fc.boolean(),
      offsets: fc.subarray([-3, 0, 7, 14, 30]),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant('settings' as const),
      prefix: fc.nat({ max: 3 }),
      method: fc.constantFrom<'hmrc_period' | 'market'>('hmrc_period', 'market'),
    }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('repeatPay' as const), changed: fc.boolean() }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('draft' as const) }) },
);

// ---------------------------------------------------------------------------------------------------------------
// The model

interface ModelPayment {
  id: string;
  amount: number;
  removed: boolean;
}

interface ModelInvoice {
  id: string;
  number: string;
  currency: string;
  total: number;
  dueDate: string;
  lifecycle: 'issued' | 'sent' | 'void';
  payments: ModelPayment[];
  refunds: number[];
  credits: { id: string; total: number }[];
  paused: boolean;
  /** The snapshot as issued, which must never change. */
  snapshot: string;
}

interface Model {
  invoices: ModelInvoice[];
  creditNotes: number;
  drafts: number;
  /** Reminder keys queued for this business. */
  reminders: Set<string>;
  keys: number;
  remindersOn: boolean;
  offsets: number[];
  clientOn: boolean;
  clientEmail: boolean;
  method: 'hmrc_period' | 'market';
  prefix: string;
  lastPayment: PaymentInput | null;
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const activePaid = (i: ModelInvoice) => sum(i.payments.filter((p) => !p.removed).map((p) => p.amount));
const received = (i: ModelInvoice) => activePaid(i) - sum(i.refunds);
const credited = (i: ModelInvoice) => sum(i.credits.map((c) => c.total));
const balanceOf = (i: ModelInvoice) => (i.lifecycle === 'void' ? 0 : i.total - received(i) - credited(i));
const isOpen = (i: ModelInvoice) => i.lifecycle !== 'void' && balanceOf(i) > 0;

function expectedState(i: ModelInvoice): DocumentState {
  if (i.lifecycle === 'void') return 'void';
  const r = received(i);
  const c = credited(i);
  if (r + c >= i.total) return c === 0 ? 'paid' : r === 0 ? 'credited' : 'settled';
  return r > 0 ? 'part_paid' : i.lifecycle;
}

const OFFSETS = [-3, 0, 7, 14, 30];

/** The reminder due on `today`, worked out here on its own: the latest offset in the week up to today. */
/** Every invoice of a journey is issued on TODAY, and no reminder goes for a day before that. */
function expectedOffset(dueDate: string, today: string, offsets: readonly number[]): number | null {
  for (const o of [...offsets].sort((a, b) => b - a)) {
    const date = addDays(dueDate, o);
    const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000;
    if (age >= 0 && age < 7 && date >= TODAY) return o;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Running

const pick = <T>(xs: readonly T[], n: number): T | undefined => (xs.length ? xs[n % xs.length] : undefined);

async function setUp(name: string) {
  const b = await business(t, name);
  const extra = await b.run(async (tx) => ({
    vat5: await createTaxCode(tx, b.actor, {
      label: 'Reduced rate',
      treatment: 'reduced',
      components: [{ name: 'VAT', ratePpm: 50_000, compound: false }],
      isDefault: false,
    }),
    reverse: await createTaxCode(tx, b.actor, {
      label: 'Reverse charge',
      treatment: 'reverse_charge',
      components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
      isDefault: false,
    }),
  }));
  await b.run((tx) =>
    updateReminderSettings(tx, b.actor, {
      remindersEnabled: true,
      reminderOffsets: OFFSETS as ReminderSettingsInput['reminderOffsets'],
      reminderWording: {},
    }),
  );
  const codes: Record<CodeName, string> = { ...b.codes, ...extra };
  return { b, codes };
}

/** Everything a refused operation could have touched, for this business. */
async function digest(b: Business) {
  return b.run(async (tx) => {
    const r = await tx.execute<{ d: string }>(sql`
      select concat_ws('|',
        (select count(*) || ':' || coalesce(sum(total), 0) || ':' || string_agg(lifecycle, ',' order by id) from document),
        (select count(*) from document_line),
        (select count(*) || ':' || count(removed_at) || ':' || coalesce(sum(amount), 0) from payment),
        (select count(*) || ':' || coalesce(sum(amount), 0) from refund),
        (select count(*) from outbox),
        (select count(*) from reminder_pause),
        (select string_agg(kind || next_value, ',' order by kind) from number_counter)
      ) as d`);
    return r.rows[0]!.d;
  });
}

function errorText(error: unknown) {
  const e = error as Error & { cause?: Error; code?: string };
  return `${e.code ?? ''} ${e.message} ${e.cause?.message ?? ''}`;
}

/** Runs an operation that may be refused; a refusal must leave the business exactly as it was. */
async function attempt<T>(
  b: Business,
  run: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const before = await digest(b);
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    expect(await digest(b), `refused, and changed something: ${errorText(error)}`).toBe(before);
    return { ok: false, error: errorText(error) };
  }
}

async function step(b: Business, codes: Record<CodeName, string>, m: Model, op: Op, log: string[]) {
  const inv = 'target' in op ? pick(m.invoices, op.target) : undefined;
  const key = () => `journey-${m.keys++}-${b.actor.organisationId.slice(0, 8)}`;
  switch (op.kind) {
    case 'issue': {
      const input = draftInput.parse({
        clientId: b.clientId,
        currency: op.currency,
        lineStyle: 'quantity',
        pricesIncludeTax: op.pricesIncludeTax,
        template: 'signature',
        sterlingRate: op.currency === 'EUR' ? op.rate : null,
        prepayments: op.deposit
          ? [{ label: 'Deposit', amount: op.deposit, paidOn: TODAY, method: 'bank_transfer' }]
          : [],
        lines: op.lines.map((l, i) => ({
          title: `Line ${i + 1}`,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxCodeId: codes[l.code],
        })),
      });
      const r = await attempt(b, async () => {
        const id = await b.run((tx) => createDraft(tx, b.actor, input, NOW));
        try {
          await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
        } catch (error) {
          // A draft that cannot be issued stays a draft: remove it, so only issued invoices are in the model.
          await b.run((tx) => tx.delete(documentLine).where(eq(documentLine.documentId, id)));
          await b.run((tx) => tx.delete(document).where(eq(document.id, id)));
          throw error;
        }
        return id;
      });
      log.push(
        `issue ${op.currency} ${JSON.stringify(op.lines)} deposit ${op.deposit}: ${r.ok ? 'ok' : r.error}`,
      );
      if (!r.ok) {
        // Only figures that cannot be invoiced are refused: a deposit above the total, a total of nothing, or taxes
        // rounded above a price including them.
        expect(r.error).toMatch(
          /prepayments_exceed_total|total_not_positive|tax_exceeds_price|more than zero/,
        );
        return;
      }
      const d = (await b.run((tx) => getDocument(tx, r.value, TODAY)))!;
      const snap = d.document.snapshot as unknown as DocumentSnapshot;
      const deposits = d.payments.map((p) => ({ id: p.id, amount: p.amount, removed: false }));
      m.invoices.push({
        id: r.value,
        number: d.document.number!,
        currency: op.currency,
        total: d.document.total,
        dueDate: d.document.dueDate!,
        lifecycle: 'issued',
        payments: deposits,
        refunds: [],
        credits: [],
        paused: false,
        snapshot: JSON.stringify(d.document.snapshot),
      });
      expect(sum(deposits.map((p) => p.amount))).toBe(op.deposit);
      expect(d.document.number!.startsWith(m.prefix), `${d.document.number} has the prefix ${m.prefix}`).toBe(
        true,
      );
      // VAT in sterling: a euro invoice from a UK VAT business keeps it, converted here on its own.
      const vatRows = snap.totals.taxes.filter((x) => x.ratePpm > 0);
      if (op.currency === 'EUR' && vatRows.length) {
        const [whole, fraction = ''] = op.rate.split('.');
        const rate = BigInt(`${whole}${fraction.padEnd(6, '0')}`);
        const convert = (cents: number) => {
          const n = BigInt(cents) * 1_000_000n;
          const q = n / rate;
          return Number((n % rate) * 2n >= rate ? q + 1n : q);
        };
        const charged = sum(vatRows.filter((x) => x.charged).map((x) => x.amount));
        const reverse = sum(vatRows.filter((x) => !x.charged).map((x) => x.amount));
        expect(snap.sterlingVat).toMatchObject({
          charged: convert(charged),
          reverseCharge: convert(reverse),
          method: m.method,
          rateDate: m.method === 'hmrc_period' ? `${snap.supplyDate!.slice(0, 7)}-01` : snap.supplyDate,
        });
      } else {
        expect(snap.sterlingVat).toBeUndefined();
      }
      return;
    }
    case 'pay': {
      if (!inv) return;
      const balance = balanceOf(inv);
      const amount =
        op.extra === 2
          ? balance + 1
          : Math.max(op.extra === -1 ? 0 : 1, Math.floor((balance * op.share) / 1000));
      const input: PaymentInput = {
        documentId: inv.id,
        amount,
        paidOn: TODAY,
        method: 'bank_transfer',
        reference: null,
        note: null,
        idempotencyKey: key(),
      };
      const r = await attempt(b, () => b.run((tx) => recordPayment(tx, b.actor, input)));
      log.push(`pay ${inv.number} ${amount} of ${balance}: ${r.ok ? 'ok' : r.error}`);
      const allowed = inv.lifecycle !== 'void' && amount >= 1 && amount <= balance;
      expect(r.ok, `pay ${amount} with ${balance} owed`).toBe(allowed);
      if (r.ok) {
        expect(r.value.duplicate).toBe(false);
        inv.payments.push({ id: r.value.id, amount, removed: false });
        m.lastPayment = input;
      }
      return;
    }
    case 'removePayment': {
      if (!inv) return;
      const p = pick(
        inv.payments.filter((x) => !x.removed),
        op.which,
      );
      if (!p) return;
      const r = await attempt(b, () => b.run((tx) => removePayment(tx, b.actor, p.id, 'Bounced')));
      log.push(`remove ${p.amount} from ${inv.number}: ${r.ok ? 'ok' : r.error}`);
      const allowed = sum(inv.refunds) <= activePaid(inv) - p.amount;
      expect(r.ok, `remove ${p.amount}, refunds ${sum(inv.refunds)}, paid ${activePaid(inv)}`).toBe(allowed);
      if (r.ok) p.removed = true;
      return;
    }
    case 'creditWhole':
    case 'creditLines':
    case 'creditAmount':
    case 'creditBalance': {
      if (!inv) return;
      const before = balanceOf(inv);
      const refundDetails = { refundedOn: TODAY, method: 'bank_transfer' as const, reference: null };
      const lines =
        op.kind === 'creditLines'
          ? (
              await b.run((tx) =>
                tx
                  .select()
                  .from(documentLine)
                  .where(eq(documentLine.documentId, inv.id))
                  .orderBy(documentLine.position),
              )
            ).map((l) => ({ lineId: l.id, quantity: Math.floor((l.quantity * op.share) / 1000) }))
          : [];
      const base = { invoiceId: inv.id, reason: 'Journey', idempotencyKey: key() };
      const input =
        op.kind === 'creditWhole'
          ? { ...base, mode: 'whole' as const }
          : op.kind === 'creditLines'
            ? { ...base, mode: 'lines' as const, lines: lines.filter((l) => l.quantity > 0) }
            : op.kind === 'creditAmount'
              ? {
                  ...base,
                  mode: 'amount' as const,
                  amount: Math.max(1, Math.floor((inv.total * op.share) / 1000)),
                }
              : { ...base, mode: 'balance' as const };
      if (input.mode === 'lines' && input.lines.length === 0) return;
      const withRefund =
        op.kind === 'creditWhole'
          ? op.refundPolicy === 'always' ||
            (op.refundPolicy === 'right' && credited(inv) === 0 && inv.total > before)
          : false;
      // The refund the dialog shows, worked out from the invoice page's figures as the dialog does.
      const shown = await b.run(async (tx) => {
        const [row] = await tx.select().from(document).where(eq(document.id, inv.id));
        const position = await creditPosition(tx, row!);
        if (!position.ok) return 1;
        const { source, state } = position;
        const ids = (
          await tx
            .select({ id: documentLine.id })
            .from(documentLine)
            .where(eq(documentLine.documentId, inv.id))
            .orderBy(documentLine.position)
        ).map((l) => l.id);
        try {
          const plan =
            input.mode === 'whole'
              ? planLineCredit(
                  source,
                  state,
                  source.lines.map((l, index) => ({ index, quantity: l.quantity })),
                )
              : input.mode === 'lines'
                ? planLineCredit(
                    source,
                    state,
                    input.lines.map((r) => ({ index: ids.indexOf(r.lineId), quantity: r.quantity })),
                  )
                : input.mode === 'amount'
                  ? planAmountCredit(source, state, input.amount)
                  : planBalanceCredit(source, state, before);
          return Math.max(1, refundFor(plan.totals.total, before));
        } catch {
          return 1;
        }
      });
      const run = (refund: boolean) =>
        attempt(b, () =>
          b.run((tx) =>
            createCreditNote(
              tx,
              b.actor,
              { ...input, ...(refund ? { refund: { ...refundDetails, amount: shown } } : {}) },
              NOW,
            ),
          ),
        );
      let r = await run(withRefund);
      let refunded = withRefund;
      if (!r.ok && op.kind !== 'creditWhole' && /credit_exceeds_balance/.test(r.error)) {
        // Above the balance owed: issue it again, recording the refund of the difference.
        r = await run(true);
        refunded = true;
      }
      log.push(
        `${input.mode} credit on ${inv.number} (owed ${before}, refund ${refunded}): ${r.ok ? 'ok' : r.error}`,
      );
      if (inv.lifecycle === 'void') {
        expect(r.ok).toBe(false);
        return;
      }
      if (op.kind === 'creditWhole') {
        const fresh = credited(inv) === 0;
        const needs = inv.total > before;
        expect(r.ok, `whole credit, fresh ${fresh}, needs refund ${needs}, refund ${withRefund}`).toBe(
          fresh && needs === withRefund,
        );
      }
      if (op.kind === 'creditBalance' && before === 0) expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error).toMatch(
          /credit_|refund_|more than|nothing left|too small|cannot be credited|Choose at least one line/,
        );
        // Nothing changed between the page and the request, so the refund shown is always the right one.
        expect(r.error).not.toMatch(/refund_changed|owed changed/);
        return;
      }
      if (r.value.duplicate) throw new Error('A fresh key came back as a repeat.');
      const [cn] = await b.run((tx) => tx.select().from(document).where(eq(document.id, r.value.id)));
      const [row] = await b.run((tx) => tx.select().from(refund).where(eq(refund.creditNoteId, r.value.id)));
      expect(cn!.total).toBeGreaterThan(0);
      if (refunded) {
        expect(row?.amount, 'the refund is the part above the balance').toBe(cn!.total - before);
        inv.refunds.push(row!.amount);
      } else {
        expect(row).toBeUndefined();
        expect(cn!.total).toBeLessThanOrEqual(before);
      }
      if (op.kind === 'creditBalance') expect(cn!.total).toBe(before);
      inv.credits.push({ id: cn!.id, total: cn!.total });
      m.creditNotes += 1;
      return;
    }
    case 'void': {
      if (!inv) return;
      const r = await attempt(b, () =>
        b.run((tx) => voidDocument(tx, b.actor, inv.id, 'Raised in error', NOW)),
      );
      log.push(`void ${inv.number}: ${r.ok ? 'ok' : r.error}`);
      // Voiding again is done already; otherwise only with nothing paid or credited.
      const allowed = inv.lifecycle === 'void' || (activePaid(inv) === 0 && inv.credits.length === 0);
      expect(r.ok).toBe(allowed);
      if (r.ok) inv.lifecycle = 'void';
      return;
    }
    case 'send': {
      if (!inv) return;
      const r = await attempt(b, () => b.run((tx) => markSent(tx, b.actor, inv.id, NOW)));
      log.push(`send ${inv.number}: ${r.ok ? 'ok' : r.error}`);
      expect(r.ok).toBe(inv.lifecycle !== 'void');
      if (r.ok) inv.lifecycle = 'sent';
      return;
    }
    case 'pause': {
      if (!inv) return;
      await b.run((tx) => setRemindersPaused(tx, b.actor, inv.id, op.paused));
      inv.paused = op.paused;
      log.push(`${op.paused ? 'pause' : 'resume'} ${inv.number}: ok`);
      return;
    }
    case 'scan': {
      const now = new Date(NOW.getTime() + op.days * 86_400_000);
      const today = todayIn('Europe/London', now);
      const expected = new Set<string>();
      for (const i of m.invoices) {
        if (!m.remindersOn || !m.clientOn || !m.clientEmail || !isOpen(i) || i.paused) continue;
        const offset = expectedOffset(i.dueDate, today, m.offsets);
        if (offset === null) continue;
        const k = `reminder:${i.id}:${offset}`;
        if (!m.reminders.has(k)) expected.add(k);
      }
      await queueDueReminders(t.db, t.worker.db, now);
      const rows = await b.run((tx) =>
        tx.select({ key: outbox.idempotencyKey }).from(outbox).where(eq(outbox.topic, 'document.reminder')),
      );
      // Scheduled reminders only: one sent with "Send a reminder now" has a key of its own.
      const queued = new Set(
        rows.map((r) => r.key).filter((k) => /^reminder:[^:]+:-?\d+$/.test(k) && !m.reminders.has(k)),
      );
      log.push(`scan on ${today}: ${[...queued].length} queued`);
      expect([...queued].sort()).toEqual([...expected].sort());
      for (const k of queued) m.reminders.add(k);
      return;
    }
    case 'remindNow': {
      if (!inv) return;
      const r = await attempt(b, () => b.run((tx) => sendReminderNow(tx, b.actor, inv.id, key(), NOW)));
      log.push(`remind now ${inv.number}: ${r.ok ? 'ok' : r.error}`);
      // Sent at once whatever the schedule, pause or settings: only something owed and an email address count.
      expect(r.ok).toBe(isOpen(inv) && m.clientEmail);
      return;
    }
    case 'deliver': {
      if (!inv) return;
      // A queued reminder checks the invoice again when it is sent, and says what is owed then.
      const offset = pick(OFFSETS, op.days);
      const ctx = await b.run((tx) =>
        reminderContext(tx, inv.id, offset ?? 0, new Date(NOW.getTime() + op.days * 86_400_000)),
      );
      const goes = isOpen(inv) && !inv.paused && m.remindersOn && m.clientOn && m.clientEmail;
      log.push(`deliver ${inv.number}: ${ctx ? 'ok' : 'nothing to send'}`);
      expect(!!ctx, `reminder for ${inv.number}`).toBe(goes);
      if (ctx) expect(ctx.balance).toBe(balanceOf(inv));
      const now = await b.run((tx) => reminderContext(tx, inv.id, null, NOW));
      expect(!!now, `reminder now for ${inv.number}`).toBe(isOpen(inv) && m.clientEmail);
      return;
    }
    case 'clientReminders': {
      await b.run((tx) =>
        tx
          .update(client)
          .set({ remindersEnabled: op.on, email: op.email ? 'accounts@northlane.example' : null })
          .where(eq(client.id, b.clientId)),
      );
      m.clientOn = op.on;
      m.clientEmail = op.email;
      log.push(`client reminders ${op.on}, email ${op.email}: ok`);
      return;
    }
    case 'orgReminders': {
      await b.run((tx) =>
        updateReminderSettings(tx, b.actor, {
          remindersEnabled: op.on,
          reminderOffsets: [...op.offsets].sort((x, y) => x - y) as ReminderSettingsInput['reminderOffsets'],
          reminderWording: {},
        }),
      );
      m.remindersOn = op.on;
      m.offsets = op.offsets;
      log.push(`reminders ${op.on} at ${op.offsets.join(',')}: ok`);
      return;
    }
    case 'settings': {
      const prefix = ['INV-', 'J-', 'ACME/', 'INV-'][op.prefix]!;
      const org = await b.run((tx) => getOrganisation(tx, b.actor));
      const input = organisationProfileInput.parse({
        ...org,
        invoicePrefix: prefix,
        sterlingRateMethod: op.method,
      });
      const r = await attempt(b, () => b.run((tx) => updateOrganisationProfile(tx, b.actor, input)));
      log.push(`settings prefix ${prefix} method ${op.method}: ${r.ok ? 'ok' : r.error}`);
      // A prefix may be refused when its numbers would repeat ones used; nothing else here can be.
      if (!r.ok) expect(r.error).toMatch(/already used|repeat/);
      else {
        m.prefix = prefix;
        m.method = op.method;
      }
      return;
    }
    case 'repeatPay': {
      const last = m.lastPayment;
      if (!last) return;
      const input = op.changed ? { ...last, amount: last.amount + 1 } : last;
      const before = await digest(b);
      const r = await attempt(b, () => b.run((tx) => recordPayment(tx, b.actor, input)));
      expect(await digest(b), 'a repeated request changes nothing').toBe(before);
      log.push(`repeat payment ${op.changed ? 'changed' : 'same'}: ${r.ok ? 'ok' : r.error}`);
      // The same request again returns the first result and changes nothing; the same key for another is refused.
      if (op.changed) expect(r.ok).toBe(false);
      else {
        expect(r.ok && r.value.duplicate).toBe(true);
      }
      return;
    }
    case 'draft': {
      const r = await attempt(b, () =>
        b.run((tx) =>
          createDraft(
            tx,
            b.actor,
            draftInput.parse({
              clientId: b.clientId,
              currency: 'GBP',
              lineStyle: 'quantity',
              pricesIncludeTax: false,
              template: 'signature',
              lines: [{ title: 'Later', quantity: 1000, unitPrice: 5000, taxCodeId: codes.vat20 }],
            }),
          ),
        ),
      );
      log.push(`draft: ${r.ok ? 'ok' : r.error}`);
      expect(r.ok).toBe(true);
      m.drafts += 1;
      return;
    }
  }
}

/** Every figure the business can see, against the model and against each other. */
async function check(b: Business, m: Model) {
  const list = await b.run((tx) => listDocuments(tx, { kind: 'invoice', today: TODAY }));
  const dash = await b.run((tx) => getDashboard(tx, TODAY, 'GBP'));
  for (const i of m.invoices) {
    const d = (await b.run((tx) => getDocument(tx, i.id, TODAY)))!;
    const row = list.find((x) => x.id === i.id)!;
    const where = `${i.number}`;
    expect(d.balance, `${where} balance`).toBe(balanceOf(i));
    expect(row.balance, `${where} listed balance`).toBe(balanceOf(i));
    expect(balanceOf(i), `${where} never below zero`).toBeGreaterThanOrEqual(0);
    expect(d.state, `${where} state`).toBe(expectedState(i));
    expect(row.state, `${where} listed state`).toBe(expectedState(i));
    expect(d.applied.paid, `${where} received`).toBe(received(i));
    expect(row.paid, `${where} listed received`).toBe(received(i));
    expect(d.applied.credited, `${where} credited`).toBe(credited(i));
    expect(sum(d.refunds.map((r) => r.amount)), `${where} refunds`).toBe(sum(i.refunds));
    expect(sum(i.refunds), `${where} refunds within payments`).toBeLessThanOrEqual(activePaid(i));
    expect(credited(i), `${where} credits within the total`).toBeLessThanOrEqual(i.total);
    expect(JSON.stringify(d.document.snapshot), `${where} snapshot unchanged`).toBe(i.snapshot);
    // Once credited in full, the credit notes add up to the invoice's tax, row by row.
    if (credited(i) === i.total) {
      const invoiceTaxes = (JSON.parse(i.snapshot) as DocumentSnapshot).totals.taxes;
      const notes = d.creditNotes.map((c) => (c.snapshot as unknown as DocumentSnapshot).totals.taxes);
      for (const row of invoiceTaxes) {
        const taken = notes.flat().filter((x) => x.key === row.key);
        expect(sum(taken.map((x) => x.amount)), `${where} ${row.key} tax credited`).toBe(row.amount);
        expect(sum(taken.map((x) => x.base)), `${where} ${row.key} base credited`).toBe(row.base);
      }
    }
  }
  for (const currency of ['GBP', 'EUR']) {
    const open = m.invoices.filter((i) => i.currency === currency && isOpen(i));
    const r = dash.receivables.find((x) => x.currency === currency);
    expect(r?.outstanding ?? 0, `${currency} outstanding`).toBe(sum(open.map(balanceOf)));
    expect(r?.openCount ?? 0, `${currency} open invoices`).toBe(open.length);
    const net = sum(m.invoices.filter((i) => i.currency === currency).map(received));
    expect(
      dash.paidLast30Days.find((x) => x.currency === currency)?.amount ?? 0,
      `${currency} received`,
    ).toBe(net);
  }
  // Numbers run from 1 with no gaps.
  const numbers = await b.run((tx) =>
    tx
      .select({ kind: document.kind, sequence: document.sequence })
      .from(document)
      .where(sql`${document.lifecycle} <> 'draft'`),
  );
  for (const kind of ['invoice', 'credit_note'] as const) {
    const seqs = numbers
      .filter((n) => n.kind === kind)
      .map((n) => n.sequence!)
      .sort((a, b) => a - b);
    expect(seqs, `${kind} numbers`).toEqual(seqs.map((_, i) => i + 1));
  }
  expect(numbers.filter((n) => n.kind === 'credit_note')).toHaveLength(m.creditNotes);
  const printed = await b.run((tx) =>
    tx
      .select({ number: document.number })
      .from(document)
      .where(sql`${document.number} is not null`),
  );
  expect(new Set(printed.map((p) => p.number)).size, 'no number printed twice').toBe(printed.length);
  expect(dash.draftCount, 'drafts').toBe(m.drafts);
  const exported = await b.run((tx) => exportOrganisation(tx));
  expect(exported.refunds).toHaveLength(sum(m.invoices.map((i) => i.refunds.length)));
  expect(exported.payments.filter((p) => !p.removedAt)).toHaveLength(
    sum(m.invoices.map((i) => i.payments.filter((p) => !p.removed).length)),
  );
}

let runs = 0;
/** What the journeys did, so a run that exercised nothing fails. */
const tally = new Map<string, number>();
const count = (what: string) => tally.set(what, (tally.get(what) ?? 0) + 1);

describe('journeys', () => {
  it('every step agrees with the model and with every other place a figure is shown', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(opArb, { minLength: 6, maxLength: 30 }), async (ops) => {
        runs += 1;
        const { b, codes } = await setUp(`Journey Office ${runs}`);
        const m: Model = {
          invoices: [],
          creditNotes: 0,
          drafts: 0,
          reminders: new Set(),
          keys: 0,
          remindersOn: true,
          offsets: OFFSETS,
          clientOn: true,
          clientEmail: true,
          method: 'hmrc_period',
          prefix: 'INV-',
          lastPayment: null,
        };
        const log: string[] = [];
        // Every journey starts with an invoice, as every real one does.
        const first: Op = {
          kind: 'issue',
          currency: 'GBP',
          rate: '1.1500',
          pricesIncludeTax: false,
          lines: [{ quantity: 1000, unitPrice: 10_000, code: 'vat20' }],
          deposit: 0,
        };
        try {
          for (const op of [first, ...ops]) {
            const before = log.length;
            await step(b, codes, m, op, log);
            await check(b, m);
            for (const line of log.slice(before)) {
              const ok = /: ok$/.test(line) ? 'ok' : /: [0-9]+ queued$/.test(line) ? 'scan' : 'refused';
              count(`${op.kind} ${ok}`);
              if (/refund true\): ok$/.test(line)) count('refund');
              const queued = /: ([0-9]+) queued$/.exec(line);
              if (queued)
                tally.set('reminders queued', (tally.get('reminders queued') ?? 0) + Number(queued[1]));
            }
          }
        } catch (error) {
          throw new Error(`${(error as Error).message}\nSteps:\n${log.join('\n')}`);
        }
      }),
      { numRuns: Number(process.env.JOURNEY_RUNS ?? 40), endOnFailure: true },
    );
  }, 1_800_000);

  it('the journeys covered every operation, accepted and refused', () => {
    process.stdout.write(
      `${[...tally.entries()]
        .sort()
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')}\n`,
    );
    for (const what of [
      'issue ok',
      'pay ok',
      'pay refused',
      'removePayment ok',
      'creditWhole ok',
      'creditWhole refused',
      'creditLines ok',
      'creditAmount ok',
      'creditBalance ok',
      'void ok',
      'send ok',
      'refund',
      'remindNow ok',
      'remindNow refused',
      'deliver ok',
      'settings ok',
      'repeatPay ok',
      'repeatPay refused',
      'draft ok',
    ]) {
      expect(tally.get(what) ?? 0, what).toBeGreaterThan(0);
    }
    expect(tally.get('reminders queued') ?? 0).toBeGreaterThan(0);
  });

  it('the scan never queues a reminder twice for one offset, whatever the order of days', async () => {
    const { b } = await setUp('Scan Twice Office');
    const id = await b.run(async (tx) => {
      const draft = await createDraft(
        tx,
        b.actor,
        draftInput.parse({
          clientId: b.clientId,
          currency: 'GBP',
          lineStyle: 'quantity',
          pricesIncludeTax: false,
          template: 'signature',
          lines: [{ title: 'Work', quantity: 1000, unitPrice: 10_000, taxCodeId: b.codes.vat20 }],
        }),
      );
      await issueDocument(tx, b.actor, draft, NOW);
      return draft;
    });
    for (const days of [20, 20, 3, 40, 14, 14, 0, 60, 21]) {
      await queueDueReminders(t.db, t.worker.db, new Date(NOW.getTime() + days * 86_400_000));
    }
    const keys = await b.run((tx) =>
      tx
        .select({ key: outbox.idempotencyKey })
        .from(outbox)
        .where(and(eq(outbox.topic, 'document.reminder'))),
    );
    const mine = keys.map((k) => k.key).filter((k) => k.includes(id));
    expect(new Set(mine).size).toBe(mine.length);
    const [p] = await b.run((tx) => tx.select().from(payment).where(eq(payment.documentId, id)));
    expect(p).toBeUndefined();
  });
});
