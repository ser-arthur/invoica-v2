import { asc, eq, getTableColumns } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { DomainError } from '@invoica/core';
import { clientInput, itemInput, organisationProfileInput, taxCodeInput } from '@invoica/schemas';
import type { Tx } from './client';
import { fingerprint } from './fingerprint';
import { client, clientField, item, organisation, taxCode } from './schema';

/**
 * docs/specs/changes-elsewhere.md: the version of what a form edits is a digest of those fields as stored, so a change
 * elsewhere to anything else (reminder settings, the logo, archiving) leaves it as it was. Each read holds the row
 * for the rest of the transaction.
 */

const NOT_EDITED = new Set(['idempotencyKey', 'fields']);

/** The fields of a form's input it saves into its table, each of which must be a column. */
function editedKeys(table: PgTable, fields: string[]): string[] {
  const columns = getTableColumns(table);
  return fields
    .filter((f) => !NOT_EDITED.has(f))
    .map((f) => {
      if (!(f in columns)) throw new Error(`The form field ${f} is not a column.`);
      return f;
    });
}

const PROFILE = editedKeys(organisation, Object.keys(organisationProfileInput.shape));
const CLIENT = editedKeys(client, Object.keys(clientInput.shape));
const ITEM = editedKeys(item, Object.keys(itemInput.shape));
const TAX_CODE = editedKeys(taxCode, Object.keys(taxCodeInput.shape));

const pick = (row: object, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, (row as Record<string, unknown>)[k] ?? null]));

/** The versions of rows a page has loaded, for its forms. */
export const profileVersionOf = (row: typeof organisation.$inferSelect) => fingerprint(pick(row, PROFILE));
export const itemVersionOf = (row: typeof item.$inferSelect) => fingerprint(pick(row, ITEM));
export const taxCodeVersionOf = (row: typeof taxCode.$inferSelect) => fingerprint(pick(row, TAX_CODE));
export const clientVersionOf = (
  row: typeof client.$inferSelect,
  fields: { label: string; value: string; showOnDocuments: boolean; sort: number }[],
) =>
  fingerprint({
    row: pick(row, CLIENT),
    fields: [...fields]
      .sort((x, y) => x.sort - y.sort)
      .map((f) => ({ label: f.label, value: f.value, showOnDocuments: f.showOnDocuments })),
  });

/** The versions as stored now, each read holding its row for the rest of the transaction. */
export async function profileVersion(tx: Tx, organisationId: string): Promise<string | null> {
  const [row] = await tx.select().from(organisation).where(eq(organisation.id, organisationId)).for('update');
  return row ? profileVersionOf(row) : null;
}

/** A client's version includes its extra fields. */
export async function clientVersion(tx: Tx, id: string): Promise<string | null> {
  const [row] = await tx.select().from(client).where(eq(client.id, id)).for('update');
  if (!row) return null;
  const fields = await tx
    .select()
    .from(clientField)
    .where(eq(clientField.clientId, id))
    .orderBy(asc(clientField.sort));
  return clientVersionOf(row, fields);
}

export async function itemVersion(tx: Tx, id: string): Promise<string | null> {
  const [row] = await tx.select().from(item).where(eq(item.id, id)).for('update');
  return row ? itemVersionOf(row) : null;
}

export async function taxCodeVersion(tx: Tx, id: string): Promise<string | null> {
  const [row] = await tx.select().from(taxCode).where(eq(taxCode.id, id)).for('update');
  return row ? taxCodeVersionOf(row) : null;
}

/** The refusals, with what the owner reads. */
export const CHANGED_ELSEWHERE = {
  settings: {
    code: 'settings_changed',
    message:
      'These settings were changed in another tab or on another device after this page opened. The page now shows those changes, except in the fields you changed here. Check them, then save yours anyway.',
  },
  client: {
    code: 'client_changed',
    message:
      'This client was changed in another tab or on another device after this page opened. The form now shows those changes, except in the fields you changed here. Check them, then save yours anyway.',
  },
  item: {
    code: 'item_changed',
    message:
      'This item was changed in another tab or on another device after this page opened. The form now shows those changes, except in the fields you changed here. Check them, then save yours anyway.',
  },
  taxCode: {
    code: 'tax_code_changed',
    message:
      'This tax code was changed in another tab or on another device after this page opened. Save yours anyway to replace the changes, or close this and open it again to see them.',
  },
} as const;

/**
 * Runs a save from a form that showed version `base`, and answers with the version after it. The save is refused
 * (and, with the transaction, undone) when the record changed since the form's version and the save changes it
 * again; a save that changes nothing stored is accepted. Without `base` (an older page) it is applied as before.
 */
export async function saveAgainst(
  base: string | null | undefined,
  version: () => Promise<string | null>,
  save: () => Promise<void>,
  refusal: { code: string; message: string },
): Promise<string> {
  const before = await version();
  await save();
  const after = (await version())!;
  if (base && before !== base && after !== before) {
    throw new DomainError(refusal.code, refusal.message);
  }
  return after;
}
