import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { draftVersion, getDocument } from '@invoica/db';
import { InvoiceEditor } from '@/components/invoice-editor';
import { PageHeader } from '@/components/ui';
import { draftState, loadEditorData } from '@/lib/editor-data';
import { inWorkspace } from '@/lib/workspace';
import { isUuid } from '@/lib/ids';
import { DeleteDraftButton } from '@/components/document-actions';

export const metadata: Metadata = { title: 'Edit draft' };

export default async function EditInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!isUuid(id)) notFound();
  const result = await inWorkspace(async (tx, ws) => {
    const detail = await getDocument(tx, id, ws.today);
    if (!detail) return null;
    if (detail.document.lifecycle !== 'draft') return { issued: true as const };
    return {
      issued: false as const,
      data: await loadEditorData(tx, ws),
      initial: draftState(detail),
      version: await draftVersion(tx, id),
    };
  });
  if (!result) notFound();
  if (result.issued) redirect(`/invoices/${id}`);
  return (
    <div>
      <PageHeader
        title="Draft invoice"
        back={{ href: '/invoices', label: 'Invoices' }}
        actions={<DeleteDraftButton id={id} />}
      />
      <InvoiceEditor
        id={id}
        initial={result.initial}
        version={result.version}
        notice={saved === '1' ? 'Draft saved.' : undefined}
        {...result.data}
      />
    </div>
  );
}
