import { eq } from 'drizzle-orm';
import { draftInput, type DraftInput } from '@invoica/schemas';
import { createClient } from '../src/clients';
import { createDraft, issueDocument } from '../src/documents';
import { createTaxCode } from '../src/taxes';
import { documentLine, organisation } from '../src/schema';
import { withOrganisation, type Actor } from '../src/tenancy';
import { createUserWithOrganisation, type TestDatabase } from './helpers';

/** Businesses with a client and UK tax codes, and the steps the review tests repeat. */

export const NOW = new Date('2026-10-18T10:00:00Z');
export const TODAY = '2026-10-18';

export async function failure(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    const e = error as Error & { cause?: Error };
    return e.cause?.message ?? e.message;
  }
  return 'did not fail';
}

export interface Business {
  actor: Actor;
  clientId: string;
  codes: Record<'vat20' | 'zero' | 'none', string>;
  run: <T>(fn: Parameters<typeof withOrganisation<T>>[2]) => Promise<T>;
}

export async function business(t: TestDatabase, name: string, registered = true): Promise<Business> {
  const actor = await createUserWithOrganisation(t, name);
  const run = <T>(fn: Parameters<typeof withOrganisation<T>>[2]) => withOrganisation(t.db, actor, fn);
  return run(async (tx) => {
    await tx
      .update(organisation)
      .set({ taxRegistered: registered, taxNumber: registered ? 'GB000000000' : null })
      .where(eq(organisation.id, actor.organisationId));
    const clientId = await createClient(tx, actor, {
      name: 'Northlane Ltd',
      contactName: null,
      email: 'accounts@northlane.example',
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
    });
    const vat20 = await createTaxCode(tx, actor, {
      label: 'Standard rate',
      treatment: 'standard',
      components: [{ name: 'VAT', ratePpm: 200_000, compound: false }],
      isDefault: true,
    });
    const zero = await createTaxCode(tx, actor, {
      label: 'Zero-rated',
      treatment: 'zero',
      components: [{ name: 'VAT', ratePpm: 0, compound: false }],
      isDefault: false,
    });
    const none = await createTaxCode(tx, actor, {
      label: 'No VAT',
      treatment: 'outside_scope',
      components: [],
      isDefault: false,
    });
    return { actor, clientId, codes: { vat20, zero, none }, run };
  });
}

export function draftFor(
  b: Business,
  lines: { quantity: number; unitPrice: number; code: string | null }[],
  over: Partial<DraftInput> = {},
) {
  return draftInput.parse({
    clientId: b.clientId,
    currency: 'GBP',
    lineStyle: 'quantity',
    pricesIncludeTax: false,
    template: 'signature',
    lines: lines.map((l, i) => ({
      title: `Line ${i + 1}`,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxCodeId: l.code,
    })),
    ...over,
  });
}

export async function issued(
  b: Business,
  lines: { quantity: number; unitPrice: number; code: string | null }[],
) {
  const id = await b.run((tx) => createDraft(tx, b.actor, draftFor(b, lines)));
  await b.run((tx) => issueDocument(tx, b.actor, id, NOW));
  return id;
}

export async function lineIds(b: Business, documentId: string) {
  const rows = await b.run((tx) =>
    tx
      .select({ id: documentLine.id })
      .from(documentLine)
      .where(eq(documentLine.documentId, documentId))
      .orderBy(documentLine.position),
  );
  return rows.map((r) => r.id);
}

export const pay = (documentId: string, amount: number, idempotencyKey: string) => ({
  documentId,
  amount,
  paidOn: TODAY,
  method: 'bank_transfer' as const,
  reference: null,
  note: null,
  idempotencyKey,
});
