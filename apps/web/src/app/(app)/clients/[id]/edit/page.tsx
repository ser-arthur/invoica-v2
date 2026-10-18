import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClient } from '@invoica/db';
import { ClientFormPanel } from '@/components/client-form';
import { PageHeader } from '@/components/ui';
import { inWorkspace } from '@/lib/workspace';
import { isUuid } from '@/lib/ids';

export const metadata: Metadata = { title: 'Edit client' };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await inWorkspace(async (tx, ws) => ({
    found: await getClient(tx, id),
    country: ws.organisation.countryCode,
  }));
  if (!data.found) notFound();
  const { client, fields } = data.found;
  return (
    <div className="max-w-[760px]">
      <PageHeader title={`Edit ${client.name}`} back={{ href: `/clients/${id}`, label: client.name }} />
      <ClientFormPanel
        id={id}
        defaultCountry={data.country}
        initial={{
          ...client,
          fields: fields.map((f) => ({ label: f.label, value: f.value, showOnDocuments: f.showOnDocuments })),
        }}
      />
    </div>
  );
}
