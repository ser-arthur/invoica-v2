import type { Metadata } from 'next';
import { itemVersionOf, listItems, listTaxCodes } from '@invoica/db';
import { ItemsList } from '@/components/item-editor';
import { PageHeader } from '@/components/ui';
import { inWorkspace } from '@/lib/workspace';

export const metadata: Metadata = { title: 'Items' };

export default async function ItemsPage() {
  const data = await inWorkspace(async (tx, ws) => ({
    items: await listItems(tx),
    // Archived ones too, for the items that still use them.
    taxCodes: await listTaxCodes(tx, { includeArchived: true }),
    currency: ws.organisation.baseCurrency,
  }));
  return (
    <div className="max-w-[860px]">
      <PageHeader
        title="Items"
        description="The services and products you bill often. Pick one on an invoice and its description, price and tax fill in."
      />
      <ItemsList
        items={data.items.map((i) => ({ ...i, version: itemVersionOf(i) }))}
        currency={data.currency}
        taxCodes={data.taxCodes.map((t) => ({ id: t.id, label: t.label, archived: t.archivedAt !== null }))}
      />
    </div>
  );
}
