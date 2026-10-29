import Link from 'next/link';
import { FooterLight } from './footer-light';
import { FooterMark } from './footer-mark';
import { BUSINESS_EMAIL, FOOTER_LINKS, FOOTER_SMALL_PRINT, TRADER } from './links';
import s from './site.module.css';

/**
 * The site's footer (docs/specs/website-footer.md): the line and the way in, one row of the product's links, then the
 * small print, who is behind Invoica, its email, Privacy and Terms. Plain links, so nothing is fetched ahead, including
 * the planned pages that are not written yet.
 */
export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={`${s.wrap} ${s.grid} ${s.footerTop}`}>
        <div className={s.footerBrand}>
          <p className={s.footerLine}>The business side of your business, in order.</p>
          <Link href="/sign-up" className={`${s.button} ${s.limeButton}`}>
            Create free account
          </Link>
        </div>
        <nav className={s.footerNav} aria-label="Footer">
          <ul>
            {FOOTER_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={s.wrap}>
        <div className={s.footerBase}>
          <p>
            &copy; 2026 Invoica. Invoica is a trading name of <span className={s.keep}>{TRADER}.</span>
          </p>
          <ul className={s.footerSmall}>
            <li>
              <a href={`mailto:${BUSINESS_EMAIL}`}>{BUSINESS_EMAIL}</a>
            </li>
            {FOOTER_SMALL_PRINT.map((link) => (
              <li key={link.label}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <FooterLight className={`${s.wrap} ${s.footerMark}`}>
        <FooterMark />
      </FooterLight>
    </footer>
  );
}
