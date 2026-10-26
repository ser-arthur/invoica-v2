import Link from 'next/link';
import { Logo } from '@/components/logo';
import { SectionLinks, type SectionLink } from './section-links';
import s from './site.module.css';

/** The header's links, each with the home page's section it leads to. */
const LINKS: SectionLink[] = [
  { label: 'Why Invoica', href: '/#why', section: 'why' },
  { label: 'How it works', href: '/#how', section: 'how' },
  { label: 'Templates', href: '/#templates', section: 'templates' },
  { label: 'Pricing', href: '/pricing', section: 'pricing' },
];

/**
 * The site's header: it stays at the top while the page scrolls under it, marking the section in view. On narrow screens
 * the links fold into a menu, and on phones the way in moves into it too. Signed in, the way in is the dashboard.
 * `arrive` lets it settle in as the home page loads.
 */
export function SiteHeader({ signedIn = false, arrive = false }: { signedIn?: boolean; arrive?: boolean }) {
  return (
    <div className={arrive ? `${s.headerBar} ${s.arrive}` : s.headerBar}>
      <header className={`${s.wrap} ${s.header}`}>
        <Link href="/" className={s.brand}>
          <Logo shaded />
        </Link>
        <nav className={s.nav} aria-label="Site">
          <SectionLinks links={LINKS} />
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
              <span className={s.menuLines} aria-hidden="true">
                <span data-line="" />
                <span data-line="" />
              </span>
              <span className={s.srOnly}>Menu</span>
            </summary>
            <nav className={s.menuPanel} aria-label="Menu">
              <SectionLinks links={LINKS} />
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
