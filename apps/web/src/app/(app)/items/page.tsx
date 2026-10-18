import type { Metadata } from 'next';
import { listItems, listTaxCodes } from '@invoica/db';
import { ItemsList } from '@/components/item-editor';
import { PageHeader } from '@/components/ui';
import { inWorkspace } from '@/lib/workspace';

export const metadata: Metadata = { title: 'Items' };

export default async function ItemsPage() {
  const data = await inWorkspace(async (tx, ws) => ({
    items: await listItems(tx),
    taxCodes: await listTaxCodes(tx),
    currency: ws.organisation.baseCurrency,
  }));
  return (
    <div className="max-w-[860px]">
      <PageHeader
        title="Items"
        description="The services and products you bill often. Pick one on an invoice and its description, price and tax fill in."
      />
      <ItemsList
        items={data.items}
        currency={data.currency}
        taxCodes={data.taxCodes.map((t) => ({ id: t.id, label: t.label }))}
      />
    </div>
  );
}
