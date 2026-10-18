import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  DomainError,
  addDays,
  checkPayment,
  computeDocument,
  deriveState,
  formatDocumentNumber,
  isOverdue,
  sumMinor,
  todayIn,
  transition,
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
import { getOrganisation, type Organisation } from './organisations';
import { toTaxCode } from './taxes';
import type { Actor } from './tenancy';
import { buildSnapshot } from './snapshot';

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
  total: number;
  applied: number;
  balance: number;
  createdAt: Date;
}

export type DocumentFilter = 'all' | 'draft' | 'open' | 'overdue' | 'paid' | 'void';

function summarise(
  row: DocumentRow & { clientName: string },
  applied: Applied,
  today: BusinessDate,
): DocumentSummary {
  const appliedTotal = applied.paid + applied.credited;
  const balance = row.lifecycle === 'void' ? 0 : row.total - appliedTotal;
  return {
    id: row.id,
    kind: row.kind,
    number: row.number,
    lifecycle: row.lifecycle,
    state: deriveState({ lifecycle: row.lifecycle, total: row.total, paid: appliedTotal }),
    overdue: isOverdue({ lifecycle: row.lifecycle, balance, dueDate: row.dueDate, today }),
    clientId: row.clientId,
    clientName: row.clientName,
    currency: row.currency,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    title: row.title,
    total: row.total,
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
    .select({ doc: document, clientName: client.name })
    .from(document)
    .innerJoin(client, eq(client.id, document.clientId))
    .where(and(...conditions))
    .orderBy(
      desc(sql`coalesce(${document.issueDate}, ${document.createdAt}::date)`),
      desc(document.createdAt),
    );
  const applied = await appliedAmounts(
    tx,
    rows.map((r) => r.doc.id),
  );
  let out = rows.map((r) =>
    summarise({ ...r.doc, clientName: r.clientName }, applied.get(r.doc.id)!, options.today),
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
      out = out.filter((d) => d.state === 'paid');
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
  const summary = summarise({ ...doc, clientName: owner!.name }, a, today);
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

async function lockDocument(tx: Tx, id: string): Promise<DocumentRow> {
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
  const org = await getOrganisation(tx, actor);
  if (org.taxRegistered && !org.taxNumber) {
    throw new DomainError(
      'tax_number_missing',
      'Add your tax registration number in Settings before issuing.',
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
  const applied = (await appliedAmounts(tx, [id])).get(id)!;
  transition(doc.lifecycle, 'void', { paid: applied.paid + applied.credited });
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
  const [existing] = await tx
    .select({ id: payment.id })
    .from(payment)
    .where(eq(payment.idempotencyKey, input.idempotencyKey));
  if (existing) return { id: existing.id, duplicate: true };
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

/**
 * Issues a credit note against an invoice: either for the whole invoice (only while nothing is paid or credited)
 * or for the lines given. The credit note gets its own number and reduces the invoice's balance.
 */
export async function createCreditNote(
  tx: Tx,
  actor: Actor,
  input: CreditNoteInput,
  now: Date,
): Promise<{ id: string; number: string; duplicate: boolean }> {
  const invoice = await lockDocument(tx, input.invoiceId);
  const [existing] = await tx
    .select({ id: document.id, number: document.number })
    .from(document)
    .where(eq(document.idempotencyKey, input.idempotencyKey));
  if (existing) return { id: existing.id, number: existing.number ?? '', duplicate: true };
  if (invoice.kind !== 'invoice' || (invoice.lifecycle !== 'issued' && invoice.lifecycle !== 'sent')) {
    throw new DomainError('credit_wrong_state', 'Credit notes can only be issued against issued invoices.');
  }
  const applied = (await appliedAmounts(tx, [invoice.id])).get(invoice.id)!;
  const balance = invoice.total - applied.paid - applied.credited;
  const snapshot = invoice.snapshot as unknown as DocumentSnapshot;

  let lineValues: {
    title: string;
    description: string | null;
    quantity: number;
    unit: string | null;
    unitPrice: number;
    serviceDate: string | null;
    taxCodeId: string | null;
    tax: TaxCode | null;
    itemId: string | null;
  }[];
  let discounts = invoice.discounts;
  if (input.lines && input.lines.length > 0) {
    const codes = await resolveTaxCodes(
      tx,
      input.lines.map((l) => l.taxCodeId),
    );
    lineValues = input.lines.map((l) => ({ ...l, tax: l.taxCodeId ? codes.get(l.taxCodeId)! : null }));
    discounts = [];
  } else {
    if (applied.paid + applied.credited > 0) {
      throw new DomainError(
        'credit_full_after_payment',
        'This invoice has payments or credits, so credit specific lines instead.',
      );
    }
    const lines = await tx
      .select()
      .from(documentLine)
      .where(eq(documentLine.documentId, invoice.id))
      .orderBy(asc(documentLine.position));
    lineValues = lines.map((l) => ({
      title: l.title,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      serviceDate: l.serviceDate,
      taxCodeId: l.taxCodeId,
      tax: l.tax,
      itemId: l.itemId,
    }));
  }
  const totals = computeDocument({
    currency: invoice.currency,
    pricesIncludeTax: invoice.pricesIncludeTax,
    taxLevel: invoice.taxLevel,
    rounding: invoice.rounding,
    lines: lineValues,
    discounts,
  });
  if (totals.total <= 0)
    throw new DomainError('credit_not_positive', 'A credit note must be for more than zero.');
  if (totals.total > balance) {
    throw new DomainError(
      'credit_exceeds_balance',
      'A credit note cannot be more than the balance still owed.',
    );
  }

  const org = await getOrganisation(tx, actor);
  const today = todayIn(org.timeZone, now);
  const [created] = await tx
    .insert(document)
    .values({
      organisationId: actor.organisationId,
      kind: 'credit_note',
      clientId: invoice.clientId,
      creditedDocumentId: invoice.id,
      currency: invoice.currency,
      lineStyle: invoice.lineStyle,
      pricesIncludeTax: invoice.pricesIncludeTax,
      taxLevel: invoice.taxLevel,
      rounding: invoice.rounding,
      discounts,
      template: invoice.template,
      options: invoice.options,
      idempotencyKey: input.idempotencyKey,
      createdBy: actor.userId,
    })
    .returning();
  const creditNote = created!;
  const lineRows = lineValues.map((l, position) => ({
    ...l,
    organisationId: actor.organisationId,
    documentId: creditNote.id,
    position,
  }));
  await tx.insert(documentLine).values(lineRows);
  const sequence = await nextSequence(tx, 'credit_note');
  const number = formatDocumentNumber({ prefix: org.creditNotePrefix, padding: org.numberPadding }, sequence);
  const { client: buyer, fields } = await loadClientWithFields(tx, invoice.clientId);
  const creditSnapshot = buildSnapshot({
    org,
    client: buyer,
    fields,
    doc: { ...creditNote, issueDate: today, dueDate: null, supplyDate: snapshot.supplyDate },
    number,
    lines: lineRows.map((l) => ({ ...l, id: '' })),
    totals,
    credits: { number: invoice.number ?? '', issueDate: invoice.issueDate ?? today, reason: input.reason },
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
    total: totals.total,
    reason: input.reason,
  });
  await enqueue(tx, actor, 'document.render_pdf', { documentId: creditNote.id }, `pdf:${creditNote.id}`);
  return { id: creditNote.id, number, duplicate: false };
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

/** Clients with the details an invoice shows, for the editor. */
export async function clientsForEditor(tx: Tx) {
  const rows = await tx.select().from(client).where(isNull(client.archivedAt)).orderBy(asc(client.name));
  const fields = await tx
    .select()
    .from(clientField)
    .where(eq(clientField.showOnDocuments, true))
    .orderBy(asc(clientField.sort));
  return rows.map((c) => ({
    row: c,
    fields: fields.filter((f) => f.clientId === c.id).map((f) => ({ label: f.label, value: f.value })),
  }));
}
