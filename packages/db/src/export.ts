import { asc } from 'drizzle-orm';
import type { Tx } from './client';
import {
  auditLog,
  client,
  clientField,
  document,
  documentLine,
  item,
  organisation,
  payment,
  taxCode,
} from './schema';

/** Every record the organisation owns, for its own export. Row-level security limits it to one organisation. */
export async function exportOrganisation(tx: Tx) {
  return {
    exportedAt: new Date().toISOString(),
    organisation: await tx.select().from(organisation),
    taxCodes: await tx.select().from(taxCode).orderBy(asc(taxCode.sort)),
    clients: await tx.select().from(client).orderBy(asc(client.name)),
    clientFields: await tx.select().from(clientField),
    items: await tx.select().from(item).orderBy(asc(item.name)),
    documents: await tx.select().from(document).orderBy(asc(document.createdAt)),
    documentLines: await tx
      .select()
      .from(documentLine)
      .orderBy(asc(documentLine.documentId), asc(documentLine.position)),
    payments: await tx.select().from(payment).orderBy(asc(payment.paidOn)),
    auditLog: await tx.select().from(auditLog).orderBy(asc(auditLog.id)),
  };
}

export type OrganisationExport = Awaited<ReturnType<typeof exportOrganisation>>;
