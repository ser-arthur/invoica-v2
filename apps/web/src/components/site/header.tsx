import Link from 'next/link';
import { Logo } from '@/components/logo';
import s from './site.module.css';

const LINKS = [
  { label: 'Why Invoica', href: '/#why' },
  { label: 'How it works', href: '/#how' },
  { label: 'Templates', href: '/#templates' },
  { label: 'Pricing', href: '/pricing' },
];

/** The site's header: it stays at the top while the page scrolls under it. On narrow screens the links fold into a menu. */
export function SiteHeader() {
  return (
    <div className={s.headerBar}>
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
          <Link href="/sign-in" className={s.signIn}>
            Sign in
          </Link>
          <Link href="/sign-up" className={`${s.button} ${s.headerButton}`}>
            Create free account
          </Link>
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
              <Link href="/sign-in">Sign in</Link>
            </nav>
          </details>
        </div>
      </header>
    </div>
  );
}
