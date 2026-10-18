import { cookies } from 'next/headers';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { organisation, user } = await requireWorkspace();
  const theme = (await cookies()).get('invoica_theme')?.value ?? 'light';
  return (
    <AppShell organisationName={organisation.name} userName={user.email} theme={theme}>
      {children}
    </AppShell>
  );
}
