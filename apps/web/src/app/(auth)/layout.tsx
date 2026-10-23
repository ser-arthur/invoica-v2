import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Crease } from '@/components/site/crease';
import site from '@/components/site/site.module.css';
import a from './auth.module.css';

/**
 * Sign in, sign up and the email pages: the form on the right in the site's light palette, and on wide
 * screens a Night panel on the left with the crease and what an account brings. The crease is silver here, so it
 * stands apart from the green words past it.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={a.auth}>
      <aside className={a.panel}>
        <span className={a.flap} aria-hidden="true" />
        <Link href="/" className={a.panelLogo}>
          <Logo shaded label="Invoica home" />
        </Link>
        <div className={a.panelBody}>
          <Crease
            as="p"
            lines={['Every invoice,', 'all the way', 'to paid.']}
            typeClass={a.panelType}
            pastClass={a.mint}
            dark
            line="silver"
          />
          <ul className={a.facts}>
            <li>
              <span className={site.label}>Free for 30 days</span>
              Everything Invoica does, with no card needed.
            </li>
            <li>
              <span className={site.label}>Look established</span>
              Your logo and colours, numbered properly, kept as sent.
            </li>
            <li>
              <span className={site.label}>Know who owes you</span>
              Every invoice followed until it is paid.
            </li>
          </ul>
        </div>
        <p className={a.panelFoot}>&copy; 2026 Invoica</p>
      </aside>
      <div className={a.side}>
        <header className={a.mobileHeader}>
          <Link href="/" aria-label="Invoica home" className={a.mobileLogo}>
            <Logo shaded label="Invoica" />
          </Link>
        </header>
        <main className={a.formArea}>
          <div className={a.formBox}>{children}</div>
        </main>
      </div>
    </div>
  );
}
