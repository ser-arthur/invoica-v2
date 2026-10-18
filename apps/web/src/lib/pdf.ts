import 'server-only';
import type { DocumentSnapshot } from '@invoica/core';
import { documentPdfState, getFile, keepPdfIfMissing, withOrganisation, type Actor } from '@invoica/db';
import { renderPdf } from '@invoica/pdf';
import { getDb } from './db';
import { env } from './env';
import { getObject, putObject } from './storage';

async function logoDataUrl(actor: Actor, fileId: string | null): Promise<string | null> {
  if (!fileId) return null;
  const file = await withOrganisation(getDb(), actor, (tx) => getFile(tx, fileId));
  if (!file) return null;
  const bytes = await getObject(file.storageKey);
  return `data:${file.contentType};base64,${Buffer.from(bytes).toString('base64')}`;
}

/** Renders a snapshot to PDF bytes, with the seller's logo embedded. */
export async function pdfForSnapshot(
  actor: Actor,
  snapshot: DocumentSnapshot,
  draft = false,
): Promise<Uint8Array> {
  return renderPdf(snapshot, {
    executablePath: env.chromiumPath,
    logoDataUrl: await logoDataUrl(actor, snapshot.seller.logoFileId),
    draft,
  });
}

/**
 * Returns the kept PDF of an issued document, rendering and keeping it first if that has not happened yet.
 * A document keeps the first PDF made for it; the database refuses to replace it.
 */
export async function keptPdf(
  actor: Actor,
  documentId: string,
): Promise<{ bytes: Uint8Array; number: string } | null> {
  const db = getDb();
  const state = await withOrganisation(db, actor, async (tx) => {
    const row = await documentPdfState(tx, documentId);
    if (!row || row.lifecycle === 'draft' || !row.snapshot) return null;
    return { row, file: row.pdfFileId ? await getFile(tx, row.pdfFileId) : null };
  });
  if (!state) return null;
  const snapshot = state.row.snapshot as unknown as DocumentSnapshot;
  if (state.file) return { bytes: await getObject(state.file.storageKey), number: snapshot.number };

  const bytes = await pdfForSnapshot(actor, snapshot);
  const stored = await putObject(actor.organisationId, 'documents', 'pdf', bytes);
  const keptId = await withOrganisation(db, actor, (tx) =>
    keepPdfIfMissing(tx, actor, documentId, { contentType: 'application/pdf', ...stored }),
  );
  const kept = await withOrganisation(db, actor, (tx) => getFile(tx, keptId));
  if (kept && kept.storageKey !== stored.storageKey)
    return { bytes: await getObject(kept.storageKey), number: snapshot.number };
  return { bytes, number: snapshot.number };
}
