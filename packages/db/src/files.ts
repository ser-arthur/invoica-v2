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
