'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, Home, Package, Plus, Settings, Users } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { setThemeAction } from '@/lib/actions/preferences';
import { ButtonLink, Wordmark, cx } from './ui';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/items', label: 'Items', icon: Package },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  organisationName,
  userName,
  theme,
  children,
}: {
  organisationName: string;
  userName: string;
  theme: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push('/sign-in');
    router.refresh();
  }

  const initial = organisationName.trim().charAt(0).toUpperCase() || 'I';

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="Invoica dashboard" className="shrink-0">
            <Wordmark className="text-[22px]" />
          </Link>
          <nav aria-label="Main" className="hidden h-full items-stretch gap-1 md:flex">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'relative flex items-center px-3 text-[14px] font-medium transition-colors',
                    active ? 'text-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {item.label}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-brand-bright"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:block">
              <ButtonLink href="/invoices/new" size="sm">
                <Plus className="size-4" aria-hidden />
                New invoice
              </ButtonLink>
            </div>
            <details className="group relative">
              <summary
                className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 hover:bg-sunk [&::-webkit-details-marker]:hidden"
                aria-label="Account and settings"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-ink font-display text-[13px] font-semibold text-surface">
                  {initial}
                </span>
                <span className="hidden max-w-[16ch] truncate text-[13px] font-medium sm:inline">
                  {organisationName}
                </span>
              </summary>
              <div className="absolute right-0 z-40 mt-2 w-64 rounded-[14px] border border-line bg-surface p-2 shadow-lift">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium">{organisationName}</p>
                  <p className="truncate text-[13px] text-muted">{userName}</p>
                </div>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-sunk"
                >
                  <Settings className="size-4 text-muted" aria-hidden /> Settings
                </Link>
                <div className="my-1 border-t border-line" />
                <p className="px-3 pt-2 pb-1 text-[12px] text-muted">Appearance</p>
                <div className="grid grid-cols-3 gap-1 px-2 pb-2" role="group" aria-label="Appearance">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={theme === t}
                      onClick={() => setThemeAction(t)}
                      className={cx(
                        'h-8 rounded-lg text-[13px] capitalize',
                        theme === t ? 'bg-ink text-surface' : 'text-ink-soft hover:bg-sunk',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="my-1 border-t border-line" />
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sunk"
                >
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-[480px] grid-cols-5 items-center">
          {[NAV[0]!, NAV[1]!, null, NAV[2]!, { href: '/settings', label: 'Settings', icon: Settings }].map(
            (item) =>
              item === null ? (
                <li key="new" className="flex justify-center">
                  <Link
                    href="/invoices/new"
                    aria-label="New invoice"
                    className="-mt-7 flex size-14 items-center justify-center rounded-full bg-brand-bright text-[#06170e] shadow-lift ring-4 ring-canvas"
                  >
                    <Plus className="size-6" aria-hidden strokeWidth={2.4} />
                  </Link>
                </li>
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                    className={cx(
                      'flex flex-col items-center gap-1 text-[11px] font-medium',
                      isActive(pathname, item.href) ? 'text-ink' : 'text-muted',
                    )}
                  >
                    <item.icon
                      className="size-5"
                      aria-hidden
                      strokeWidth={isActive(pathname, item.href) ? 2.2 : 1.8}
                    />
                    {item.label}
                  </Link>
                </li>
              ),
          )}
        </ul>
      </nav>
    </div>
  );
}
