import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import {
  DomainError,
  NO_TAX,
  allowedRounding,
  formatDocumentNumber,
  presetFor,
  roundingDefaultFor,
} from '@invoica/core';
import type { OnboardingInput, OrganisationProfileInput } from '@invoica/schemas';
import type { Database, Tx } from './client';
import { document, numberCounter, organisation, taxCode } from './schema';
import { audit } from './audit';
import { withUser, type Actor } from './tenancy';

export const TRIAL_DAYS = 30;

export type Organisation = typeof organisation.$inferSelect;

export interface MyOrganisation {
  id: string;
  name: string;
  role: string;
}

export async function myOrganisations(db: Database, userId: string): Promise<MyOrganisation[]> {
  return withUser(db, userId, async (tx) => {
    const r = await tx.execute<{ id: string; name: string; role: string }>(
      sql`select id, name, role from app.my_organisations()`,
    );
    return r.rows;
  });
}

/** Creates an organisation owned by the user, with "No tax" and the country's tax preset loaded. */
export async function createOrganisation(
  db: Database,
  userId: string,
  input: OnboardingInput,
): Promise<string> {
  return withUser(db, userId, async (tx) => {
    const r = await tx.execute<{ id: string }>(
      sql`select app.create_organisation(${input.name}, ${input.countryCode}, ${input.baseCurrency}, ${input.timeZone}, ${TRIAL_DAYS}) as id`,
    );
    const id = r.rows[0]!.id;
    const actor: Actor = { userId, organisationId: id };
    await tx
      .update(organisation)
      .set({
        businessType: input.businessType,
        taxRegistered: input.taxRegistered,
        taxNumber: input.taxRegistered ? input.taxNumber : null,
        locale: input.countryCode === 'US' ? 'en-US' : 'en-GB',
        ...roundingDefaultFor(input.countryCode),
      })
      .where(eq(organisation.id, id));

    const preset = presetFor(input.countryCode);
    const codes = [NO_TAX, ...(preset?.codes ?? [])];
    const defaultKey =
      input.taxRegistered && preset
        ? (preset.codes.find((c) => c.treatment === 'standard')?.key ?? NO_TAX.key)
        : NO_TAX.key;
    await tx.insert(taxCode).values(
      codes.map((c, i) => ({
        organisationId: id,
        presetKey: c.key,
        label: c.label,
        treatment: c.treatment,
        components: c.components,
        isDefault: c.key === defaultKey,
        sort: i,
      })),
    );
    await audit(tx, actor, 'organisation.onboarded', 'organisation', id, {
      countryCode: input.countryCode,
      preset: preset?.country ?? null,
    });
    return id;
  });
}

export async function getOrganisation(tx: Tx, actor: Actor): Promise<Organisation> {
  const [row] = await tx.select().from(organisation).where(eq(organisation.id, actor.organisationId));
  if (!row) throw new Error('Organisation not found.');
  return row;
}

/**
 * The organisation, held for the rest of the transaction so its settings cannot change underneath it. Issuing uses
 * this, so a settings save in progress finishes first and the number is formatted with the settings that are saved.
 */
export async function getOrganisationForIssue(tx: Tx, actor: Actor): Promise<Organisation> {
  const [row] = await tx
    .select()
    .from(organisation)
    .where(eq(organisation.id, actor.organisationId))
    .for('share');
  if (!row) throw new Error('Organisation not found.');
  return row;
}

/**
 * Refuses numbering settings whose next numbers, in either series, would repeat a number already used: shortening a
 * prefix that ends in a digit can do that (Q1 then Q: sequence 11 would print Q11 again).
 */
async function assertNumbersDoNotRepeat(tx: Tx, input: OrganisationProfileInput): Promise<void> {
  for (const [kind, prefix] of [
    ['invoice', input.invoicePrefix],
    ['credit_note', input.creditNotePrefix],
  ] as const) {
    const [counter] = await tx
      .select({ next: numberCounter.nextValue })
      .from(numberCounter)
      .where(eq(numberCounter.kind, kind));
    const next = counter?.next ?? 1;
    const used = await tx
      .select({ number: document.number })
      .from(document)
      .where(and(eq(document.kind, kind), sql`starts_with(${document.number}, ${prefix})`));
    for (const { number } of used) {
      const digits = number!.slice(prefix.length);
      if (!/^\d+$/.test(digits) || Number(digits) < next) continue;
      if (formatDocumentNumber({ prefix, padding: input.numberPadding }, Number(digits)) === number) {
        throw new DomainError(
          'numbering_repeats',
          `${number} is already used, and this prefix would number a later ${kind === 'invoice' ? 'invoice' : 'credit note'} the same. Choose another prefix.`,
        );
      }
    }
  }
}

export async function updateOrganisationProfile(
  tx: Tx,
  actor: Actor,
  input: OrganisationProfileInput,
): Promise<void> {
  const allowed = allowedRounding(input.countryCode);
  if (!allowed.some((c) => c.taxLevel === input.taxLevel && c.rounding === input.rounding)) {
    throw new DomainError(
      'rounding_not_allowed',
      'Choose one of the rounding options offered for your country.',
    );
  }
  await assertNumbersDoNotRepeat(tx, input);
  await tx
    .update(organisation)
    .set({
      ...input,
      taxNumber: input.taxRegistered ? input.taxNumber : null,
      paymentDetails: input.paymentDetails as Organisation['paymentDetails'],
    })
    .where(eq(organisation.id, actor.organisationId));
  await audit(tx, actor, 'organisation.updated', 'organisation', actor.organisationId, {
    fields: Object.keys(input),
  });
}

export async function setLogo(tx: Tx, actor: Actor, fileId: string | null): Promise<void> {
  await tx.update(organisation).set({ logoFileId: fileId }).where(eq(organisation.id, actor.organisationId));
  await audit(
    tx,
    actor,
    fileId ? 'organisation.logo_set' : 'organisation.logo_removed',
    'organisation',
    actor.organisationId,
  );
}

export async function activeTaxCodes(tx: Tx) {
  return tx
    .select()
    .from(taxCode)
    .where(isNull(taxCode.archivedAt))
    .orderBy(asc(taxCode.sort), asc(taxCode.label));
}

export async function defaultTaxCode(tx: Tx) {
  const [row] = await tx
    .select()
    .from(taxCode)
    .where(and(eq(taxCode.isDefault, true), isNull(taxCode.archivedAt)));
  return row ?? null;
}
