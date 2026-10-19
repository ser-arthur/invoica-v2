import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { DomainError, assertTaxCode, presetFor, type TaxCode } from '@invoica/core';
import type { TaxCodeInput } from '@invoica/schemas';
import type { Tx } from './client';
import { taxCode } from './schema';
import { audit } from './audit';
import type { Actor } from './tenancy';

export type TaxCodeRow = typeof taxCode.$inferSelect;

export function toTaxCode(row: Pick<TaxCodeRow, 'label' | 'treatment' | 'components'>): TaxCode {
  return { label: row.label, treatment: row.treatment, components: row.components };
}

export async function listTaxCodes(
  tx: Tx,
  options: { includeArchived?: boolean } = {},
): Promise<TaxCodeRow[]> {
  const q = tx.select().from(taxCode);
  const rows = options.includeArchived ? await q : await q.where(isNull(taxCode.archivedAt));
  return rows.sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label));
}

async function clearDefault(tx: Tx, exceptId: string | null) {
  await tx
    .update(taxCode)
    .set({ isDefault: false })
    .where(
      exceptId ? and(eq(taxCode.isDefault, true), ne(taxCode.id, exceptId)) : eq(taxCode.isDefault, true),
    );
}

export async function createTaxCode(tx: Tx, actor: Actor, input: TaxCodeInput): Promise<string> {
  assertTaxCode(input);
  if (input.isDefault) await clearDefault(tx, null);
  const existing = await tx.select({ sort: taxCode.sort }).from(taxCode).orderBy(asc(taxCode.sort));
  const [row] = await tx
    .insert(taxCode)
    .values({
      organisationId: actor.organisationId,
      label: input.label,
      treatment: input.treatment,
      components: input.components,
      isDefault: input.isDefault,
      sort: (existing.at(-1)?.sort ?? 0) + 1,
    })
    .returning({ id: taxCode.id });
  await audit(tx, actor, 'tax_code.created', 'tax_code', row!.id, {
    label: input.label,
    components: input.components,
  });
  return row!.id;
}

/**
 * Changes a tax code. Lines already on documents keep the tax they were saved with, so this only
 * affects lines added or edited afterwards.
 */
export async function updateTaxCode(tx: Tx, actor: Actor, id: string, input: TaxCodeInput): Promise<void> {
  assertTaxCode(input);
  if (input.isDefault) await clearDefault(tx, id);
  const updated = await tx
    .update(taxCode)
    .set({
      label: input.label,
      treatment: input.treatment,
      components: input.components,
      isDefault: input.isDefault,
    })
    .where(eq(taxCode.id, id))
    .returning({ id: taxCode.id });
  if (updated.length === 0) throw new Error('Tax code not found.');
  await audit(tx, actor, 'tax_code.updated', 'tax_code', id, {
    label: input.label,
    components: input.components,
  });
}

export async function archiveTaxCode(tx: Tx, actor: Actor, id: string): Promise<void> {
  const archived = await tx
    .update(taxCode)
    .set({ archivedAt: new Date(), isDefault: false })
    .where(and(eq(taxCode.id, id), isNull(taxCode.archivedAt)))
    .returning({ id: taxCode.id });
  if (archived.length === 0) {
    throw new DomainError('tax_code_not_found', 'This tax code does not exist, or is already archived.');
  }
  await audit(tx, actor, 'tax_code.archived', 'tax_code', id);
}

/** Adds any codes from the country's preset that the organisation does not have yet. Returns how many were added. */
export async function loadPreset(tx: Tx, actor: Actor, country: string): Promise<number> {
  const preset = presetFor(country);
  if (!preset) return 0;
  const have = new Set((await tx.select({ key: taxCode.presetKey }).from(taxCode)).map((r) => r.key));
  const missing = preset.codes.filter((c) => !have.has(c.key));
  if (missing.length === 0) return 0;
  await tx.insert(taxCode).values(
    missing.map((c, i) => ({
      organisationId: actor.organisationId,
      presetKey: c.key,
      label: c.label,
      treatment: c.treatment,
      components: c.components,
      sort: 100 + i,
    })),
  );
  await audit(tx, actor, 'tax_code.preset_loaded', 'tax_code', null, {
    country,
    added: missing.map((c) => c.key),
  });
  return missing.length;
}
