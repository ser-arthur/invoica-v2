import Link from 'next/link';
import { Logo } from '@/components/logo';
import s from './site.module.css';

const LINKS = [
  { label: 'Why Invoica', href: '/#why' },
  { label: 'How it works', href: '/#how' },
  { label: 'Templates', href: '/#templates' },
  { label: 'Pricing', href: '/pricing' },
];

/**
 * The site's header: it stays at the top while the page scrolls under it. On narrow screens the links fold into a menu,
 * and on phones the way in moves into it too. Signed in, the way in is the dashboard. `arrive` lets it settle in as
 * the home page loads.
 */
export function SiteHeader({ signedIn = false, arrive = false }: { signedIn?: boolean; arrive?: boolean }) {
  return (
    <div className={arrive ? `${s.headerBar} ${s.arrive}` : s.headerBar}>
      <header className={`${s.wrap} ${s.header}`}>
        <Link href="/" className={s.brand}>
          <Logo shaded />
        </Link>
        <nav className={s.nav} aria-label="Site">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={s.account}>
          {signedIn ? (
            <Link href="/dashboard" className={`${s.button} ${s.headerButton}`}>
              Your dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className={s.signIn}>
                Sign in
              </Link>
              <Link href="/sign-up" className={`${s.button} ${s.headerButton}`}>
                Create free account
              </Link>
            </>
          )}
          <details className={s.menu}>
            <summary className={s.menuButton}>
              <span className={s.menuIcon} aria-hidden="true" />
              <span className={s.srOnly}>Menu</span>
            </summary>
            <nav className={s.menuPanel} aria-label="Menu">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              {signedIn ? (
                <Link href="/dashboard" className={s.menuWayIn}>
                  Your dashboard
                </Link>
              ) : (
                <>
                  <Link href="/sign-in">Sign in</Link>
                  <Link href="/sign-up" className={s.menuWayIn}>
                    Create free account
                  </Link>
                </>
              )}
            </nav>
          </details>
        </div>
      </header>
    </div>
  );
}
