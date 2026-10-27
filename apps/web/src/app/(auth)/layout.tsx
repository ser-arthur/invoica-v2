import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Crease } from '@/components/site/crease';
import { FooterLight } from '@/components/site/footer-light';
import { FooterMark } from '@/components/site/footer-mark';
import site from '@/components/site/site.module.css';
import a from './auth.module.css';

/**
 * Sign in, sign up and the email pages: the form on the right in the site's light palette, and on wide screens a
 * Night panel on the left with the crease, the first Invoica's line, and what an account brings. The crease is silver
 * there, so it stands apart from the green words past it, and the panel past it is a shade lighter, as if folded
 * there. The panel lands once, as the first of these pages opens (auth.module.css).
 *
 * On a phone there is no panel: the line opens the page, then the form, then the small print and the website's footer
 * mark, which leads home. The page is light with the mark on a Night foot, or Night all through when the visitor chose
 * Dark in the app on this device (or System, with the device dark); the root layout sets the theme from that choice.
 */
const LINE = ['The smarter way', 'to bill, track', 'and get paid.'];

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
            lines={LINE}
            typeClass={a.panelType}
            pastClass={a.mint}
            dark
            line="silver"
            tone="#0F2427"
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
        {/* On a phone: the line opens the page, light or Night with the theme (auth.module.css). */}
        <div className={a.line} data-testid="auth-line">
          <div className={a.lineLight} data-line="light">
            <Crease as="p" lines={LINE} typeClass={a.lineType} pastClass={site.slate} line="green" />
          </div>
          <div className={a.lineNight} data-line="night">
            <Crease as="p" lines={LINE} typeClass={a.lineType} pastClass={a.mint} dark line="silver" />
          </div>
        </div>
        <main className={a.formArea}>
          <div className={a.formBox}>{children}</div>
        </main>
        {/* On a phone: the small print, then the website's footer mark, which leads home. */}
        <footer className={a.foot} data-testid="auth-foot">
          <div className={a.small}>
            <span>&copy; 2026 Invoica</span>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/help">Help</a>
          </div>
          <Link href="/" aria-label="Invoica home" className={a.markLink}>
            <FooterLight className={`${site.footerMark} ${a.mark}`}>
              <FooterMark />
            </FooterLight>
          </Link>
        </footer>
      </div>
    </div>
  );
}
