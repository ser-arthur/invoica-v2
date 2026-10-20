import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { DomainError, assertTaxCode, presetFor, type TaxCode } from '@invoica/core';
import type { TaxCodeInput } from '@invoica/schemas';
import type { Tx } from './client';
import { taxCode } from './schema';
import { audit } from './audit';
import { CHANGED_ELSEWHERE, saveAgainst, taxCodeVersion } from './versions';
import { fingerprint } from './fingerprint';
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

/** Makes a tax code. A repeated request key behaves as for clients (`createClient`). */
export async function createTaxCode(tx: Tx, actor: Actor, input: TaxCodeInput): Promise<string> {
  const key = input.idempotencyKey ?? null;
  const { idempotencyKey: _key, ...request } = input;
  const digest = fingerprint(request);
  const repeat = async () => {
    if (!key) return undefined;
    const [row] = await tx
      .select({
        id: taxCode.id,
        requestFingerprint: taxCode.requestFingerprint,
        changed: sql<boolean>`${taxCode.updatedAt} <> ${taxCode.createdAt}`,
      })
      .from(taxCode)
      .where(eq(taxCode.idempotencyKey, key));
    if (!row) return undefined;
    // A correction is applied only to the record as its first request made it: an edit made since, or a correction
    // already applied, is never replaced by an older request arriving late.
    if (row.requestFingerprint !== digest && !row.changed) {
      await updateTaxCode(tx, actor, row.id, input);
      await tx.update(taxCode).set({ requestFingerprint: digest }).where(eq(taxCode.id, row.id));
    }
    return row.id;
  };
  const earlier = await repeat();
  if (earlier) return earlier;
  assertTaxCode(input);
  if (input.isDefault) await clearDefault(tx, null);
  const sorted = await tx.select({ sort: taxCode.sort }).from(taxCode).orderBy(asc(taxCode.sort));
  const [row] = await tx
    .insert(taxCode)
    .values({
      organisationId: actor.organisationId,
      label: input.label,
      treatment: input.treatment,
      components: input.components,
      isDefault: input.isDefault,
      sort: (sorted.at(-1)?.sort ?? 0) + 1,
      idempotencyKey: key,
      requestFingerprint: key ? digest : null,
    })
    .onConflictDoNothing({
      target: [taxCode.organisationId, taxCode.idempotencyKey],
      where: sql`${taxCode.idempotencyKey} is not null`,
    })
    .returning({ id: taxCode.id });
  // Saved at the same moment by another request with the same key: that one is the code.
  if (!row) return (await repeat())!;
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
export async function updateTaxCode(
  tx: Tx,
  actor: Actor,
  id: string,
  input: TaxCodeInput,
  base?: string | null,
): Promise<string> {
  assertTaxCode(input);
  return saveAgainst(
    base,
    () => taxCodeVersion(tx, id),
    async () => {
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
    },
    CHANGED_ELSEWHERE.taxCode,
  );
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

/**
 * Gives the organisation every code of its country's preset: adds those it never had and brings back those it
 * archived. Codes in use that it has edited stay as they are. An archived code that was edited stays archived as it
 * was, for the documents that used it, and the standard code is added afresh. Returns how many codes were added or
 * brought back.
 */
export async function loadPreset(tx: Tx, actor: Actor, country: string): Promise<number> {
  const preset = presetFor(country);
  if (!preset) return 0;
  const rows = await tx
    .select({
      id: taxCode.id,
      key: taxCode.presetKey,
      archivedAt: taxCode.archivedAt,
      treatment: taxCode.treatment,
      components: taxCode.components,
    })
    .from(taxCode);
  const byKey = new Map(preset.codes.map((c) => [c.key, c]));
  const standardAgain = (r: (typeof rows)[number]) => {
    const c = byKey.get(r.key ?? '')!;
    return (
      r.treatment === c.treatment &&
      r.components.length === c.components.length &&
      r.components.every(
        (x, i) =>
          x.name === c.components[i]!.name &&
          x.ratePpm === c.components[i]!.ratePpm &&
          x.compound === c.components[i]!.compound,
      )
    );
  };
  const archivedOfPreset = rows.filter((r) => r.key && byKey.has(r.key) && r.archivedAt);
  const archived = archivedOfPreset.filter(standardAgain);
  const replaced = archivedOfPreset.filter((r) => !standardAgain(r));
  const have = new Set(rows.filter((r) => !replaced.includes(r)).map((r) => r.key));
  const missing = preset.codes.filter((c) => !have.has(c.key));
  if (missing.length === 0 && archived.length === 0) return 0;
  if (replaced.length > 0) {
    await tx
      .update(taxCode)
      .set({ presetKey: null })
      .where(
        inArray(
          taxCode.id,
          replaced.map((r) => r.id),
        ),
      );
  }
  if (missing.length > 0) {
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
  }
  if (archived.length > 0) {
    await tx
      .update(taxCode)
      .set({ archivedAt: null })
      .where(
        inArray(
          taxCode.id,
          archived.map((r) => r.id),
        ),
      );
  }
  await audit(tx, actor, 'tax_code.preset_loaded', 'tax_code', null, {
    country,
    added: missing.map((c) => c.key),
    restored: archived.map((r) => r.key),
  });
  return missing.length + archived.length;
}
