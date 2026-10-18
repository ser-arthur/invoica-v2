import { eq } from 'drizzle-orm';
import type { Tx } from './client';
import { document, storedFile } from './schema';
import { audit } from './audit';
import type { Actor } from './tenancy';

export type StoredFileRow = typeof storedFile.$inferSelect;

export async function recordFile(
  tx: Tx,
  actor: Actor,
  file: {
    purpose: 'logo' | 'document_pdf';
    contentType: string;
    byteSize: number;
    sha256: string;
    storageKey: string;
  },
): Promise<string> {
  const [row] = await tx
    .insert(storedFile)
    .values({ organisationId: actor.organisationId, ...file })
    .returning({ id: storedFile.id });
  return row!.id;
}

export async function getFile(tx: Tx, id: string): Promise<StoredFileRow | null> {
  const [row] = await tx.select().from(storedFile).where(eq(storedFile.id, id));
  return row ?? null;
}

/** Keeps the PDF of an issued document. A document's first kept PDF can never be replaced. */
export async function attachPdf(tx: Tx, actor: Actor, documentId: string, fileId: string): Promise<void> {
  await tx.update(document).set({ pdfFileId: fileId }).where(eq(document.id, documentId));
  await audit(tx, actor, 'document.pdf_kept', 'document', documentId, { fileId });
}

export async function documentPdfState(tx: Tx, documentId: string) {
  const [row] = await tx
    .select({ lifecycle: document.lifecycle, snapshot: document.snapshot, pdfFileId: document.pdfFileId })
    .from(document)
    .where(eq(document.id, documentId));
  return row ?? null;
}

/**
 * Keeps a rendered PDF for a document unless one was kept meanwhile. Returns the id of the file that is kept,
 * which is the earlier one if another request got there first.
 */
export async function keepPdfIfMissing(
  tx: Tx,
  actor: Actor,
  documentId: string,
  file: { contentType: string; byteSize: number; sha256: string; storageKey: string },
): Promise<string> {
  const [fresh] = await tx
    .select({ pdfFileId: document.pdfFileId })
    .from(document)
    .where(eq(document.id, documentId))
    .for('update');
  if (fresh?.pdfFileId) return fresh.pdfFileId;
  const fileId = await recordFile(tx, actor, { purpose: 'document_pdf', ...file });
  await attachPdf(tx, actor, documentId, fileId);
  return fileId;
}
