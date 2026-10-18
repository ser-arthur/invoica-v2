import type { Metadata } from 'next';
import { InvoiceEditor } from '@/components/invoice-editor';
import { PageHeader } from '@/components/ui';
import { loadEditorData, newDraftState } from '@/lib/editor-data';
import { inWorkspace } from '@/lib/workspace';
import { isUuid } from '@/lib/ids';

export const metadata: Metadata = { title: 'New invoice' };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const { data, initial } = await inWorkspace(async (tx, ws) => {
    const data = await loadEditorData(tx, ws);
    return { data, initial: newDraftState(ws, data, client && isUuid(client) ? client : null) };
  });
  return (
    <div>
      <PageHeader title="New invoice" back={{ href: '/invoices', label: 'Invoices' }} />
      <InvoiceEditor id={null} initial={initial} {...data} />
    </div>
  );
}
