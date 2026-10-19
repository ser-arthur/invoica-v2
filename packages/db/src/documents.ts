import { createHash } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, isNotNull, sql } from 'drizzle-orm';
import {
  DomainError,
  addDays,
  checkCredit,
  checkPayment,
  computeDocument,
  creditSlots,
  creditSourceOf,
  creditState,
  deriveState,
  formatDocumentNumber,
  isOverdue,
  planAmountCredit,
  planBalanceCredit,
  planLineCredit,
  sumMinor,
  todayIn,
  transition,
  type CreditPlan,
  type CreditSource,
  type CreditState,
  type CreditTaken,
  type BusinessDate,
  type DocumentSnapshot,
  type DocumentState,
  type DocumentTotals,
  type Lifecycle,
  type TaxCode,
} from '@invoica/core';
import type { CreditNoteInput, DraftInput, PaymentInput } from '@invoica/schemas';
import type { Tx } from './client';
import { client, clientField, document, documentLine, payment, numberCounter, taxCode } from './schema';
import type { DocumentKind, PaymentMethod } from './schema';
import { audit } from './audit';
import { enqueue } from './outbox';
import { getOrganisation, getOrganisationForIssue, type Organisation } from './organisations';
import { toTaxCode } from './taxes';
import type { Actor } from './tenancy';
import { buildSnapshot } from './snapshot';
import { organisationEntitlements } from './plans';

export type DocumentRow = typeof document.$inferSelect;
export type LineRow = typeof documentLine.$inferSelect;
export type PaymentRow = typeof payment.$inferSelect;

export interface Applied {
  /** Payments recorded, not removed. */
  paid: number;
  /** Credit notes issued against the document, not void. */
  credited: number;
}

/** Payments and credit notes applied to each document. */
function safeAmount(value: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error('Applied amount out of range.');
  return n;
}

export async function appliedAmounts(tx: Tx, ids: string[]): Promise<Map<string, Applied>> {
  const out = new Map<string, Applied>(ids.map((id) => [id, { paid: 0, credited: 0 }]));
  if (ids.length === 0) return out;
  const paid = await tx
    .select({ id: payment.documentId, amount: sql<string>`sum(${payment.amount})` })
    .from(payment)
    .where(and(inArray(payment.documentId, ids), isNull(payment.removedAt)))
    .groupBy(payment.documentId);
  for (const r of paid) out.get(r.id)!.paid = Number(r.amount);
  const credited = await tx
    .select({ id: document.creditedDocumentId, amount: sql<string>`sum(${document.total})` })
    .from(document)
    .where(
      and(
        inArray(document.creditedDocumentId, ids),
        eq(document.kind, 'credit_note'),
        inArray(document.lifecycle, ['issued', 'sent']),
      ),
    )
    .groupBy(document.creditedDocumentId);
  for (const r of credited) if (r.id) out.get(r.id)!.credited = Number(r.amount);
  for (const v of out.values()) {
    if (!Number.isSafeInteger(v.paid) || !Number.isSafeInteger(v.credited))
      throw new Error('Applied amount out of range.');
  }
  return out;
}

export interface DocumentSummary {
  id: string;
  kind: DocumentKind;
  number: string | null;
  lifecycle: Lifecycle;
  state: DocumentState;
  overdue: boolean;
  clientId: string;
  clientName: string;
  currency: string;
  issueDate: string | null;
  dueDate: string | null;
  title: string | null;
  /** For a credit note: the number of the invoice it credits. */
  credits: string | null;
  total: number;
  /** Payments received. */
  paid: number;
  /** Credit notes issued against the document. */
  credited: number;
  /** Payments and credits together: what has been taken off the total. */
  applied: number;
  balance: number;
  createdAt: Date;
}

export type DocumentFilter = 'all' | 'draft' | 'open' | 'overdue' | 'paid' | 'void';

/** The columns a summary needs: lists read these and never a document's lines or snapshot. */
type SummaryRow = Pick<
  DocumentRow,
  | 'id'
  | 'kind'
  | 'number'
  | 'lifecycle'
  | 'total'
  | 'clientId'
  | 'currency'
  | 'issueDate'
  | 'dueDate'
  | 'title'
  | 'createdAt'
> & { clientName: string; credits: string | null };

function summarise(row: SummaryRow, applied: Applied, today: BusinessDate): DocumentSummary {
  const appliedTotal = applied.paid + applied.credited;
  const balance = row.lifecycle === 'void' ? 0 : row.total - appliedTotal;
  return {
    id: row.id,
    kind: row.kind,
    number: row.number,
    lifecycle: row.lifecycle,
    state: deriveState({
      lifecycle: row.lifecycle,
      total: row.total,
      paid: applied.paid,
      credited: applied.credited,
    }),
    overdue: isOverdue({ lifecycle: row.lifecycle, balance, dueDate: row.dueDate, today }),
    clientId: row.clientId,
    clientName: row.clientName,
    currency: row.currency,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    title: row.title,
    credits: row.kind === 'credit_note' ? row.credits : null,
    total: row.total,
    paid: applied.paid,
    credited: applied.credited,
    applied: appliedTotal,
    balance,
    createdAt: row.createdAt,
  };
}

export async function listDocuments(
  tx: Tx,
  options: {
    kind?: DocumentKind;
    filter?: DocumentFilter;
    clientId?: string;
    search?: string;
    today: BusinessDate;
    limit?: number;
  },
): Promise<DocumentSummary[]> {
  const conditions = [eq(document.kind, options.kind ?? 'invoice')];
  if (options.clientId) conditions.push(eq(document.clientId, options.clientId));
  const rows = await tx
    .select({
      id: document.id,
      kind: document.kind,
      number: document.number,
      lifecycle: document.lifecycle,
      total: document.total,
      clientId: document.clientId,
      currency: document.currency,
      issueDate: document.issueDate,
      dueDate: document.dueDate,
      title: document.title,
      createdAt: document.createdAt,
      clientName: client.name,
      credits: sql<string | null>`${document.snapshot} #>> '{credits,number}'`,
      paid: sql<string>`(select coalesce(sum(p.amount), 0) from payment p where p.organisation_id = ${document.organisationId} and p.document_id = ${document.id} and p.removed_at is null)`,
      credited: sql<string>`(select coalesce(sum(c.total), 0) from document c where c.organisation_id = ${document.organisationId} and c.credited_document_id = ${document.id} and c.kind = 'credit_note' and c.lifecycle in ('issued', 'sent'))`,
    })
    .from(document)
    .innerJoin(client, eq(client.id, document.clientId))
    .where(and(...conditions))
    .orderBy(
      desc(sql`coalesce(${document.issueDate}, ${document.createdAt}::date)`),
      desc(document.createdAt),
    );
  let out = rows.map((r) =>
    summarise(r, { paid: safeAmount(r.paid), credited: safeAmount(r.credited) }, options.today),
  );
  const term = options.search?.trim().toLowerCase();
  if (term) {
    out = out.filter(
      (d) =>
        d.clientName.toLowerCase().includes(term) ||
        (d.number ?? '').toLowerCase().includes(term) ||
        (d.title ?? '').toLowerCase().includes(term),
    );
  }
  switch (options.filter ?? 'all') {
    case 'draft':
      out = out.filter((d) => d.state === 'draft');
      break;
    case 'open':
      out = out.filter(
        (d) => (d.state === 'issued' || d.state === 'sent' || d.state === 'part_paid') && d.balance > 0,
      );
      break;
    case 'overdue':
      out = out.filter((d) => d.overdue);
      break;
    case 'paid':
      out = out.filter((d) => d.state === 'paid' || d.state === 'settled');
      break;
    case 'void':
      out = out.filter((d) => d.state === 'void');
      break;
  }
  return options.limit ? out.slice(0, options.limit) : out;
}

export interface DocumentDetail {
  document: DocumentRow;
  lines: LineRow[];
  client: typeof client.$inferSelect;
  payments: PaymentRow[];
  creditNotes: DocumentRow[];
  applied: Applied;
  totals: DocumentTotals;
  state: DocumentState;
  overdue: boolean;
  balance: number;
}

function draftTotals(doc: DocumentRow, lines: LineRow[]): DocumentTotals {
  return computeDocument({
    currency: doc.currency,
    pricesIncludeTax: doc.pricesIncludeTax,
    taxLevel: doc.taxLevel,
    rounding: doc.rounding,
    lines: lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, tax: l.tax })),
    discounts: doc.discounts,
    paid: sumMinor(doc.prepayments.map((p) => p.amount)),
  });
}

export async function getDocument(tx: Tx, id: string, today: BusinessDate): Promise<DocumentDetail | null> {
  const [doc] = await tx.select().from(document).where(eq(document.id, id));
  if (!doc) return null;
  // One connection serves the whole transaction, so these run one after another.
  const lines = await tx
    .select()
    .from(documentLine)
    .where(eq(documentLine.documentId, id))
    .orderBy(asc(documentLine.position));
  const [owner] = await tx.select().from(client).where(eq(client.id, doc.clientId));
  const payments = await tx
    .select()
    .from(payment)
    .where(eq(payment.documentId, id))
    .orderBy(asc(payment.paidOn), asc(payment.createdAt));
  const creditNotes = await tx
    .select()
    .from(document)
    .where(eq(document.creditedDocumentId, id))
    .orderBy(asc(document.issuedAt));
  const applied = await appliedAmounts(tx, [id]);
  const a = applied.get(id)!;
  const totals =
    doc.lifecycle === 'draft'
      ? draftTotals(doc, lines)
      : (doc.snapshot as unknown as DocumentSnapshot).totals;
  const summary = summarise(
    {
      ...doc,
      clientName: owner!.name,
      credits: (doc.snapshot as unknown as DocumentSnapshot | null)?.credits?.number ?? null,
    },
    a,
    today,
  );
  return {
    document: doc,
    lines,
    client: owner!,
    payments,
    creditNotes,
    applied: a,
    totals,
    state: summary.state,
    overdue: summary.overdue,
    balance: doc.lifecycle === 'draft' ? totals.balance : summary.balance,
  };
}

async function resolveTaxCodes(tx: Tx, ids: (string | null)[]): Promise<Map<string, TaxCode>> {
  const wanted = [...new Set(ids.filter((v): v is string => !!v))];
  if (wanted.length === 0) return new Map();
  const rows = await tx.select().from(taxCode).where(inArray(taxCode.id, wanted));
  if (rows.length !== wanted.length)
    throw new DomainError('tax_code_not_found', 'A tax code on this invoice no longer exists.');
  return new Map(rows.map((r) => [r.id, toTaxCode(r)]));
}

async function assertClient(tx: Tx, clientId: string) {
  const [row] = await tx.select({ id: client.id }).from(client).where(eq(client.id, clientId));
  if (!row) throw new DomainError('client_not_found', 'Choose a client.');
}

/** Lines ready to store, with the tax each one uses resolved from its code. */
async function prepareLines(tx: Tx, actor: Actor, documentId: string, input: DraftInput['lines']) {
  const codes = await resolveTaxCodes(
    tx,
    input.map((l) => l.taxCodeId),
  );
  return input.map((l, position) => ({
    organisationId: actor.organisationId,
    documentId,
    position,
    title: l.title,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    serviceDate: l.serviceDate,
    taxCodeId: l.taxCodeId,
    tax: l.taxCodeId ? codes.get(l.taxCodeId)! : null,
    itemId: l.itemId,
  }));
}

function draftColumns(input: DraftInput, org: Organisation, totals: DocumentTotals) {
  return {
    clientId: input.clientId,
    currency: input.currency,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    supplyDate: input.supplyDate,
    servicePeriodStart: input.servicePeriodStart,
    servicePeriodEnd: input.servicePeriodEnd,
    reference: input.reference,
    title: input.title,
    summary: input.summary,
    lineStyle: input.lineStyle,
    pricesIncludeTax: input.pricesIncludeTax,
    taxLevel: org.taxLevel,
    rounding: org.rounding,
    discounts: input.discounts,
    prepayments: input.prepayments,
    notes: input.notes,
    terms: input.terms,
    template: input.template,
    options: input.options,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
  };
}

function totalsFor(
  input: DraftInput,
  org: Organisation,
  lines: { quantity: number; unitPrice: number; tax: TaxCode | null }[],
) {
  const totals = computeDocument({
    currency: input.currency,
    pricesIncludeTax: input.pricesIncludeTax,
    taxLevel: org.taxLevel,
    rounding: org.rounding,
    lines,
    discounts: input.discounts,
    paid: sumMinor(input.prepayments.map((p) => p.amount)),
  });
  if (totals.balance < 0) {
    throw new DomainError(
      'prepayments_exceed_total',
      'Payments already received are more than the invoice total.',
    );
  }
  return totals;
}

export async function createDraft(tx: Tx, actor: Actor, input: DraftInput): Promise<string> {
  await assertClient(tx, input.clientId);
  const org = await getOrganisation(tx, actor);
  const [created] = await tx
    .insert(document)
    .values({
      organisationId: actor.organisationId,
      kind: 'invoice',
      clientId: input.clientId,
      currency: input.currency,
      idempotencyKey: input.idempotencyKey ?? null,
      createdBy: actor.userId,
    })
    .returning({ id: document.id });
  const id = created!.id;
  const lines = await prepareLines(tx, actor, id, input.lines);
  const totals = totalsFor(input, org, lines);
  await tx
    .update(document)
    .set(draftColumns(input, org, totals))
    .where(eq(document.id, id));
  if (lines.length) await tx.insert(documentLine).values(lines);
  await audit(tx, actor, 'document.draft_created', 'document', id);
  return id;
}

/** The document a request key created, if any, so a repeated save returns it. */
export async function documentForKey(
  tx: Tx,
  key: string,
): Promise<{ id: string; kind: DocumentKind; lifecycle: Lifecycle; number: string | null } | null> {
  const [row] = await tx
    .select({ id: document.id, kind: document.kind, lifecycle: document.lifecycle, number: document.number })
    .from(document)
    .where(eq(document.idempotencyKey, key));
  return row ?? null;
}

/** A short digest of what a request asked for, stored with its key. */
function fingerprint(request: unknown): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}

function keyReused(): DomainError {
  return new DomainError(
    'idempotency_conflict',
    'This request was already used for something else. Reload the page and try again.',
  );
}

export async function lockDocument(tx: Tx, id: string): Promise<DocumentRow> {
  const [doc] = await tx.select().from(document).where(eq(document.id, id)).for('update');
  if (!doc) throw new DomainError('document_not_found', 'This document does not exist.');
  return doc;
}

export async function updateDraft(tx: Tx, actor: Actor, id: string, input: DraftInput): Promise<void> {
  const doc = await lockDocument(tx, id);
  if (doc.lifecycle !== 'draft') throw new DomainError('document_not_draft', 'Only drafts can be edited.');
  await assertClient(tx, input.clientId);
  const org = await getOrganisation(tx, actor);
  const lines = await prepareLines(tx, actor, id, input.lines);
  const totals = totalsFor(input, org, lines);
  await tx.delete(documentLine).where(eq(documentLine.documentId, id));
  if (lines.length) await tx.insert(documentLine).values(lines);
  await tx
    .update(document)
    .set(draftColumns(input, org, totals))
    .where(eq(document.id, id));
  await audit(tx, actor, 'document.draft_updated', 'document', id);
}

export async function deleteDraft(tx: Tx, actor: Actor, id: string): Promise<void> {
  const doc = await lockDocument(tx, id);
  if (doc.lifecycle !== 'draft') throw new DomainError('document_not_draft', 'Only drafts can be deleted.');
  await tx.delete(document).where(eq(document.id, id));
  await audit(tx, actor, 'document.draft_deleted', 'document', id);
}

/** Takes the next number for a kind of document. The counter row is locked until the transaction ends. */
async function nextSequence(tx: Tx, kind: DocumentKind): Promise<number> {
  const [row] = await tx
    .update(numberCounter)
    .set({ nextValue: sql`${numberCounter.nextValue} + 1` })
    .where(eq(numberCounter.kind, kind))
    .returning({ next: numberCounter.nextValue });
  if (!row) throw new Error('Number counter missing.');
  return row.next - 1;
}

async function loadClientWithFields(tx: Tx, clientId: string) {
  const [row] = await tx.select().from(client).where(eq(client.id, clientId));
  const fields = await tx
    .select()
    .from(clientField)
    .where(and(eq(clientField.clientId, clientId), eq(clientField.showOnDocuments, true)))
    .orderBy(asc(clientField.sort));
  return { client: row!, fields };
}

/**
 * Issues a draft: assigns the next number without gaps, freezes a snapshot of everything the document shows,
 * records any deposits as payments, and queues its PDF. Everything happens in the caller's transaction.
 */
export async function issueDocument(
  tx: Tx,
  actor: Actor,
  id: string,
  now: Date,
): Promise<{ number: string }> {
  const doc = await lockDocument(tx, id);
  transition(doc.lifecycle, 'issue', { paid: 0 });
  const lines = await tx
    .select()
    .from(documentLine)
    .where(eq(documentLine.documentId, id))
    .orderBy(asc(documentLine.position));
  if (lines.length === 0) throw new DomainError('no_lines', 'Add at least one line before issuing.');
  const org = await getOrganisationForIssue(tx, actor);
  if (org.taxRegistered && !org.taxNumber) {
    throw new DomainError(
      'tax_number_missing',
      'Add your tax registration number in Settings before issuing.',
    );
  }
  if (!org.taxRegistered && lines.some((l) => (l.tax?.components.length ?? 0) > 0)) {
    throw new DomainError(
      'tax_not_registered',
      'You are not registered for tax, so an invoice cannot show a tax rate. Change the tax on each line, or add your registration in Settings.',
    );
  }
  const { client: buyer, fields } = await loadClientWithFields(tx, doc.clientId);
  const today = todayIn(org.timeZone, now);
  const issueDate = doc.issueDate ?? today;
  const dueDate = doc.dueDate ?? addDays(issueDate, buyer.paymentTermsDays ?? org.defaultPaymentTermsDays);
  if (dueDate < issueDate)
    throw new DomainError('due_before_issue', 'The due date cannot be before the issue date.');
  const supplyDate = doc.supplyDate ?? (doc.servicePeriodStart ? null : issueDate);
  const totals = draftTotals(doc, lines);
  if (totals.total <= 0)
    throw new DomainError('total_not_positive', 'An invoice must be for more than zero.');

  const sequence = await nextSequence(tx, doc.kind);
  const number = formatDocumentNumber(
    { prefix: doc.kind === 'invoice' ? org.invoicePrefix : org.creditNotePrefix, padding: org.numberPadding },
    sequence,
  );
  const snapshot = buildSnapshot({
    org,
    client: buyer,
    fields,
    doc: { ...doc, issueDate, dueDate, supplyDate },
    number,
    lines,
    totals,
    credits: null,
    entitlements: organisationEntitlements(org, now),
    slots:
      doc.kind === 'invoice'
        ? creditSlots(
            {
              currency: doc.currency,
              pricesIncludeTax: doc.pricesIncludeTax,
              taxLevel: doc.taxLevel,
              rounding: doc.rounding,
              lines: lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, tax: l.tax })),
            },
            totals,
          )
        : undefined,
  });
  await tx
    .update(document)
    .set({
      lifecycle: 'issued',
      sequence,
      number,
      issueDate,
      dueDate,
      supplyDate,
      snapshot: snapshot as unknown as Record<string, unknown>,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      issuedAt: now,
    })
    .where(eq(document.id, id));
  for (const [i, p] of doc.prepayments.entries()) {
    await tx.insert(payment).values({
      organisationId: actor.organisationId,
      documentId: id,
      amount: p.amount,
      currency: doc.currency,
      paidOn: p.paidOn,
      method: p.method,
      reference: p.label,
      idempotencyKey: `prepayment:${id}:${i}`,
      createdBy: actor.userId,
    });
  }
  await audit(tx, actor, 'document.issued', 'document', id, {
    number,
    total: totals.total,
    currency: doc.currency,
  });
  await enqueue(tx, actor, 'document.render_pdf', { documentId: id }, `pdf:${id}`);
  return { number };
}

export async function markSent(
  tx: Tx,
  actor: Actor,
  id: string,
  now: Date,
  channel = 'manual',
): Promise<void> {
  const doc = await lockDocument(tx, id);
  const next = transition(doc.lifecycle, 'mark_sent', { paid: 0 });
  await tx
    .update(document)
    .set({ lifecycle: next, sentAt: doc.sentAt ?? now })
    .where(eq(document.id, id));
  await audit(tx, actor, 'document.sent', 'document', id, { channel });
}

export async function voidDocument(
  tx: Tx,
  actor: Actor,
  id: string,
  reason: string,
  now: Date,
): Promise<void> {
  const doc = await lockDocument(tx, id);
  if (doc.kind === 'credit_note') {
    throw new DomainError(
      'void_credit_note',
      'A credit note cannot be voided. To undo it, issue a new invoice for the amount.',
    );
  }
  const applied = (await appliedAmounts(tx, [id])).get(id)!;
  if (applied.credited > 0) {
    throw new DomainError('void_has_credits', 'An invoice with credit notes cannot be voided.');
  }
  transition(doc.lifecycle, 'void', { paid: applied.paid });
  await tx
    .update(document)
    .set({ lifecycle: 'void', voidedAt: now, voidReason: reason })
    .where(eq(document.id, id));
  await audit(tx, actor, 'document.voided', 'document', id, { reason });
}

export async function recordPayment(
  tx: Tx,
  actor: Actor,
  input: PaymentInput,
): Promise<{ id: string; duplicate: boolean }> {
  const doc = await lockDocument(tx, input.documentId);
  const requestFingerprint = fingerprint({
    documentId: input.documentId,
    amount: input.amount,
    paidOn: input.paidOn,
    method: input.method,
  });
  const [existing] = await tx
    .select({ id: payment.id, requestFingerprint: payment.requestFingerprint })
    .from(payment)
    .where(eq(payment.idempotencyKey, input.idempotencyKey));
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) throw keyReused();
    return { id: existing.id, duplicate: true };
  }
  if (doc.kind !== 'invoice')
    throw new DomainError('payment_wrong_kind', 'Payments are recorded on invoices.');
  const applied = (await appliedAmounts(tx, [doc.id])).get(doc.id)!;
  checkPayment(doc.lifecycle, doc.total - applied.paid - applied.credited, input.amount);
  const [row] = await tx
    .insert(payment)
    .values({
      organisationId: actor.organisationId,
      documentId: doc.id,
      amount: input.amount,
      currency: doc.currency,
      paidOn: input.paidOn,
      method: input.method as PaymentMethod,
      reference: input.reference,
      note: input.note,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint,
      createdBy: actor.userId,
    })
    .returning({ id: payment.id });
  await audit(tx, actor, 'payment.recorded', 'payment', row!.id, {
    documentId: doc.id,
    amount: input.amount,
  });
  return { id: row!.id, duplicate: false };
}

export async function removePayment(tx: Tx, actor: Actor, paymentId: string, reason: string): Promise<void> {
  const [row] = await tx.select().from(payment).where(eq(payment.id, paymentId));
  if (!row) throw new DomainError('payment_not_found', 'This payment does not exist.');
  if (row.removedAt) return;
  await lockDocument(tx, row.documentId);
  await tx
    .update(payment)
    .set({ removedAt: new Date(), removedReason: reason })
    .where(eq(payment.id, paymentId));
  await audit(tx, actor, 'payment.removed', 'payment', paymentId, { documentId: row.documentId, reason });
}

/** An invoice's lines, with the quantity of each already credited by issued credit notes. */
export async function creditableLines(tx: Tx, invoiceId: string) {
  const lines = await tx
    .select()
    .from(documentLine)
    .where(eq(documentLine.documentId, invoiceId))
    .orderBy(asc(documentLine.position));
  const credited = new Map<string, number>();
  if (lines.length > 0) {
    const rows = await tx
      .select({ lineId: documentLine.creditedLineId, quantity: sql<string>`sum(${documentLine.quantity})` })
      .from(documentLine)
      .innerJoin(document, eq(document.id, documentLine.documentId))
      .where(
        and(
          isNotNull(documentLine.creditedLineId),
          inArray(
            documentLine.creditedLineId,
            lines.map((l) => l.id),
          ),
          eq(document.kind, 'credit_note'),
          inArray(document.lifecycle, ['issued', 'sent']),
        ),
      )
      .groupBy(documentLine.creditedLineId);
    for (const r of rows) if (r.lineId) credited.set(r.lineId, Number(r.quantity));
  }
  return lines.map((l) => ({
    id: l.id,
    title: l.title,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unitPrice,
    tax: l.tax,
    credited: credited.get(l.id) ?? 0,
  }));
}

/**
 * What earlier credit notes have taken from an invoice, as each keeps it in its snapshot, and their figures.
 * `complete` is false when a credit note from an earlier version kept nothing for the ledger.
 */
export async function creditLedger(
  tx: Tx,
  invoiceId: string,
): Promise<{ taken: CreditTaken[]; totals: DocumentTotals[]; complete: boolean }> {
  const notes = await tx
    .select({ snapshot: document.snapshot })
    .from(document)
    .where(
      and(
        eq(document.creditedDocumentId, invoiceId),
        eq(document.kind, 'credit_note'),
        inArray(document.lifecycle, ['issued', 'sent']),
      ),
    )
    .orderBy(asc(document.sequence));
  const snapshots = notes.map((n) => n.snapshot as unknown as DocumentSnapshot);
  return {
    taken: snapshots.flatMap((s) => (s.ledger ? [s.ledger] : [])),
    totals: snapshots.map((s) => s.totals),
    complete: snapshots.every((s) => !!s.ledger),
  };
}

/** The credit source for an issued invoice, from its snapshot. */
export function invoiceCreditSource(invoice: DocumentRow): CreditSource {
  return creditSourceOf(invoice.snapshot as unknown as DocumentSnapshot);
}

export type CreditPosition =
  | {
      ok: true;
      source: CreditSource;
      state: CreditState;
      ledger: { taken: CreditTaken[]; totals: DocumentTotals[] };
    }
  | { ok: false; reason: string };

/**
 * Where an issued invoice stands for crediting: what it can credit and what earlier credit notes took. An invoice
 * whose records came from an earlier version and cannot be read with certainty cannot be credited, and says why.
 */
export async function creditPosition(tx: Tx, invoice: DocumentRow): Promise<CreditPosition> {
  const ledger = await creditLedger(tx, invoice.id);
  if (!ledger.complete) {
    return {
      ok: false,
      reason:
        'Credit notes for this invoice were issued by an earlier version of Invoica, so further credits cannot be worked out here.',
    };
  }
  try {
    const source = invoiceCreditSource(invoice);
    return { ok: true, source, state: creditState(source, ledger.taken), ledger };
  } catch (error) {
    if (error instanceof DomainError && error.code === 'credit_source_mismatch') {
      return {
        ok: false,
        reason:
          'This invoice was issued by an earlier version of Invoica and its figures cannot be worked out again, so it cannot be credited here.',
      };
    }
    throw error;
  }
}

/** Invoice line positions, counted from one, as ranges: "1 to 3, 5 and 7 to 9". */
function lineRanges(indexes: readonly number[]): string {
  const ranges: string[] = [];
  for (let i = 0; i < indexes.length; i++) {
    let j = i;
    while (j + 1 < indexes.length && indexes[j + 1] === indexes[j]! + 1) j++;
    ranges.push(j > i ? `${indexes[i]! + 1} to ${indexes[j]! + 1}` : `${indexes[i]! + 1}`);
    i = j;
  }
  return ranges.length > 1 ? `${ranges.slice(0, -1).join(', ')} and ${ranges.at(-1)}` : (ranges[0] ?? '');
}

/**
 * Issues a credit note against an invoice: for the whole invoice (only while nothing is paid or credited), for
 * quantities of its lines, for an amount in the invoice's price basis, or for exactly the balance still owed. The
 * figures come from the credit ledger
 * (docs/specs/credit-notes.md), never from the tax codes as they stand now. The credit note gets its own number and
 * reduces the invoice's balance.
 */
export async function createCreditNote(
  tx: Tx,
  actor: Actor,
  input: CreditNoteInput,
  now: Date,
): Promise<{ id: string; number: string; duplicate: boolean }> {
  const invoice = await lockDocument(tx, input.invoiceId);
  const requestFingerprint = fingerprint({
    invoiceId: input.invoiceId,
    mode: input.mode,
    lines: input.mode === 'lines' ? input.lines : null,
    amount: input.mode === 'amount' ? input.amount : null,
  });
  const [existing] = await tx
    .select({ id: document.id, number: document.number, requestFingerprint: document.requestFingerprint })
    .from(document)
    .where(eq(document.idempotencyKey, input.idempotencyKey));
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) throw keyReused();
    return { id: existing.id, number: existing.number ?? '', duplicate: true };
  }
  if (invoice.kind !== 'invoice' || (invoice.lifecycle !== 'issued' && invoice.lifecycle !== 'sent')) {
    throw new DomainError('credit_wrong_state', 'Credit notes can only be issued against issued invoices.');
  }
  const applied = (await appliedAmounts(tx, [invoice.id])).get(invoice.id)!;
  const balance = invoice.total - applied.paid - applied.credited;
  const snapshot = invoice.snapshot as unknown as DocumentSnapshot;
  const invoiceLines = await tx
    .select()
    .from(documentLine)
    .where(eq(documentLine.documentId, invoice.id))
    .orderBy(asc(documentLine.position));
  const matches =
    invoiceLines.length === snapshot.lines.length &&
    invoiceLines.every(
      (l, i) => l.quantity === snapshot.lines[i]!.quantity && l.unitPrice === snapshot.lines[i]!.unitPrice,
    );
  if (!matches) throw new Error('The lines of this invoice do not match its issued snapshot.');

  const position = await creditPosition(tx, invoice);
  if (!position.ok) throw new DomainError('credit_ledger_unavailable', position.reason);
  const { source, state, ledger } = position;
  let plan: CreditPlan;
  if (input.mode === 'whole') {
    if (applied.paid + applied.credited > 0) {
      throw new DomainError(
        'credit_full_after_payment',
        'This invoice has payments or credits, so credit lines or an amount instead.',
      );
    }
    plan = planLineCredit(
      source,
      state,
      source.lines.map((l, index) => ({ index, quantity: l.quantity })),
    );
  } else if (input.mode === 'lines') {
    const position = new Map(invoiceLines.map((l, i) => [l.id, i]));
    plan = planLineCredit(
      source,
      state,
      input.lines.map((r) => {
        const index = position.get(r.lineId);
        if (index === undefined) {
          throw new DomainError('credit_line_not_found', 'A line to credit is not on this invoice.');
        }
        return { index, quantity: r.quantity };
      }),
    );
  } else if (input.mode === 'amount') {
    plan = planAmountCredit(source, state, input.amount);
  } else {
    plan = planBalanceCredit(source, state, balance);
  }
  checkCredit({ invoice: snapshot.totals, balance, earlier: ledger.totals, credit: plan.totals });

  const org = await getOrganisationForIssue(tx, actor);
  const today = todayIn(org.timeZone, now);
  const [created] = await tx
    .insert(document)
    .values({
      organisationId: actor.organisationId,
      kind: 'credit_note',
      clientId: invoice.clientId,
      creditedDocumentId: invoice.id,
      currency: invoice.currency,
      lineStyle: input.mode === 'amount' || input.mode === 'balance' ? 'amount' : invoice.lineStyle,
      pricesIncludeTax: plan.pricesIncludeTax,
      taxLevel: snapshot.taxLevel,
      rounding: snapshot.rounding,
      discounts: [],
      template: invoice.template,
      options: invoice.options,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint,
      createdBy: actor.userId,
    })
    .returning();
  const creditNote = created!;
  const lineRows = plan.lines.map((p, position) => {
    const base = { organisationId: actor.organisationId, documentId: creditNote.id, position };
    if (p.index !== null) {
      const l = invoiceLines[p.index]!;
      return {
        ...base,
        title: l.title,
        description: l.description,
        quantity: p.quantity,
        unit: l.unit,
        unitPrice: p.unitPrice,
        serviceDate: l.serviceDate,
        taxCodeId: l.taxCodeId,
        tax: p.tax,
        itemId: l.itemId,
        creditedLineId: l.id,
      };
    }
    // The lines the note reduces: those of the slots it takes value from that are not already credited in full.
    const reduced = p.from
      .filter((f) => f.value > 0)
      .flatMap((f) => source.slots.find((x) => x.key === f.slot)!.lines)
      .filter((i) => state.quantities[i]! < source.lines[i]!.quantity)
      .sort((x, y) => x - y);
    const titles = reduced.map((i) => invoiceLines[i]!.title).join(', ');
    const on = `Reduction on ${invoice.number ?? 'the invoice'}`;
    // A long list goes in the description, by position and, when it fits, by title, so every line reduced is named.
    const long = titles.length > 160;
    const positions = `Invoice lines ${lineRanges(reduced)}`;
    return {
      ...base,
      title: long ? `${on}: ${reduced.length} lines` : titles ? `${on}: ${titles}` : on,
      description: long
        ? `${positions}: ${titles}`.length <= 4000
          ? `${positions}: ${titles}`
          : `${positions}.`
        : null,
      quantity: p.quantity,
      unit: null,
      unitPrice: p.unitPrice,
      serviceDate: null,
      taxCodeId: reduced.length ? invoiceLines[reduced[0]!]!.taxCodeId : null,
      tax: p.tax,
      itemId: null,
      creditedLineId: null,
    };
  });
  await tx.insert(documentLine).values(lineRows);
  const sequence = await nextSequence(tx, 'credit_note');
  const number = formatDocumentNumber({ prefix: org.creditNotePrefix, padding: org.numberPadding }, sequence);
  const { client: buyer, fields } = await loadClientWithFields(tx, invoice.clientId);
  const totals = plan.totals;
  const creditSnapshot = buildSnapshot({
    org,
    client: buyer,
    fields,
    doc: { ...creditNote, issueDate: today, dueDate: null, supplyDate: snapshot.supplyDate },
    number,
    lines: lineRows.map((l) => ({ ...l, id: '' })),
    totals,
    credits: { number: invoice.number ?? '', issueDate: invoice.issueDate ?? today, reason: input.reason },
    entitlements: organisationEntitlements(org, now),
    ledger: plan.taken,
  });
  await tx
    .update(document)
    .set({
      lifecycle: 'issued',
      sequence,
      number,
      issueDate: today,
      supplyDate: snapshot.supplyDate,
      snapshot: creditSnapshot as unknown as Record<string, unknown>,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      issuedAt: now,
    })
    .where(eq(document.id, creditNote.id));
  await audit(tx, actor, 'credit_note.issued', 'document', creditNote.id, {
    number,
    invoiceId: invoice.id,
    mode: input.mode,
    total: totals.total,
    reason: input.reason,
  });
  await enqueue(tx, actor, 'document.render_pdf', { documentId: creditNote.id }, `pdf:${creditNote.id}`);
  return { id: creditNote.id, number, duplicate: false };
}

/** Holds a request key for the rest of the transaction, so two requests with the same key run one after the other. */
export async function lockRequestKey(tx: Tx, key: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
}

/** The sequence the next document of a kind will get when issued. Only a preview: numbers are assigned at issue. */
export async function peekNextSequence(tx: Tx, kind: DocumentKind): Promise<number> {
  const [row] = await tx
    .select({ next: numberCounter.nextValue })
    .from(numberCounter)
    .where(eq(numberCounter.kind, kind));
  return row?.next ?? 1;
}

/** The number the next document of a kind will get when issued. Only a preview: numbers are assigned at issue. */
export async function peekNextNumber(tx: Tx, kind: DocumentKind, org: Organisation): Promise<string> {
  const [row] = await tx
    .select({ next: numberCounter.nextValue })
    .from(numberCounter)
    .where(eq(numberCounter.kind, kind));
  return formatDocumentNumber(
    { prefix: kind === 'invoice' ? org.invoicePrefix : org.creditNotePrefix, padding: org.numberPadding },
    row?.next ?? 1,
  );
}

/**
 * Clients with the details an invoice shows, for the editor: active clients, then archived ones, which can still be
 * invoiced without being restored (docs/specs/plans.md: invoicing a client already in the account is never limited).
 */
export async function clientsForEditor(tx: Tx) {
  const rows = await tx
    .select()
    .from(client)
    .orderBy(sql`${client.archivedAt} is not null`, asc(client.name));
  const fields = await tx
    .select()
    .from(clientField)
    .where(eq(clientField.showOnDocuments, true))
    .orderBy(asc(clientField.sort));
  return rows.map((c) => ({
    row: c,
    archived: c.archivedAt !== null,
    fields: fields.filter((f) => f.clientId === c.id).map((f) => ({ label: f.label, value: f.value })),
  }));
}

/** A new draft with the same client, lines, discounts and wording as an existing invoice. Dates and deposits are left out. */
export async function duplicateDocument(tx: Tx, actor: Actor, id: string): Promise<string> {
  const [source] = await tx.select().from(document).where(eq(document.id, id));
  if (!source || source.kind !== 'invoice')
    throw new DomainError('document_not_found', 'This invoice does not exist.');
  const lines = await tx
    .select()
    .from(documentLine)
    .where(eq(documentLine.documentId, id))
    .orderBy(asc(documentLine.position));
  const org = await getOrganisation(tx, actor);
  const [created] = await tx
    .insert(document)
    .values({
      organisationId: actor.organisationId,
      kind: 'invoice',
      clientId: source.clientId,
      currency: source.currency,
      reference: null,
      title: source.title,
      summary: source.summary,
      lineStyle: source.lineStyle,
      pricesIncludeTax: source.pricesIncludeTax,
      taxLevel: org.taxLevel,
      rounding: org.rounding,
      discounts: source.discounts,
      notes: source.notes,
      terms: source.terms,
      template: source.template,
      options: source.options,
      createdBy: actor.userId,
    })
    .returning({ id: document.id });
  const newId = created!.id;
  if (lines.length) {
    await tx.insert(documentLine).values(
      lines.map((l) => ({
        organisationId: actor.organisationId,
        documentId: newId,
        position: l.position,
        title: l.title,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        serviceDate: null,
        taxCodeId: l.taxCodeId,
        tax: l.tax,
        itemId: l.itemId,
      })),
    );
  }
  const totals = draftTotals(
    { ...source, taxLevel: org.taxLevel, rounding: org.rounding, prepayments: [] },
    lines,
  );
  await tx
    .update(document)
    .set({
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
    })
    .where(eq(document.id, newId));
  await audit(tx, actor, 'document.duplicated', 'document', newId, { from: id });
  return newId;
}
