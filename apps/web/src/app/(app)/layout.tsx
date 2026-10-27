import { AppShell } from '@/components/app-shell';
import { ThemeSync } from '@/components/theme-sync';
import { requireWorkspace } from '@/lib/session';
import { pageTheme } from '@/lib/theme';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { organisation, user } = await requireWorkspace();
  const { theme, deviceBehind } = await pageTheme();
  return (
    <AppShell
      organisationName={organisation.name}
      userName={user.email}
      theme={theme}
      timeZone={organisation.timeZone}
    >
      <ThemeSync theme={theme} remember={deviceBehind} />
      {children}
    </AppShell>
  );
}
