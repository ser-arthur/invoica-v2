import Link from 'next/link';
import { FooterLight } from './footer-light';
import { FooterMark } from './footer-mark';
import { FOOTER_COLUMNS } from './links';
import s from './site.module.css';

/** Plain links, so nothing is fetched ahead, including the planned pages that are not written yet. */
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
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className={s.footerTitle}>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className={s.wrap}>
        <div className={s.footerBase}>
          <p>&copy; 2026 Invoica</p>
          <p>Made for freelancers, studios and small firms.</p>
        </div>
      </div>
      <FooterLight className={`${s.wrap} ${s.footerMark}`}>
        <FooterMark />
      </FooterLight>
    </footer>
  );
}
