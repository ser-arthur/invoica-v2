import type { Metadata } from 'next';
import { ClientFormPanel } from '@/components/client-form';
import { PageHeader } from '@/components/ui';
import { requireWorkspace } from '@/lib/session';

export const metadata: Metadata = { title: 'New client' };

export default async function NewClientPage() {
  const { organisation } = await requireWorkspace();
  return (
    <div className="max-w-[760px]">
      <PageHeader title="New client" back={{ href: '/clients', label: 'Clients' }} />
      <ClientFormPanel id={null} defaultCountry={organisation.countryCode} />
    </div>
  );
}
