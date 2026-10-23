import Link from 'next/link';
import { Logo } from '@/components/logo';
import s from './site.module.css';

/** Links to pages that are planned but not built yet go to their future addresses; plain links, so nothing is fetched ahead. */
const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Why Invoica', href: '#why' },
      { label: 'How it works', href: '#how' },
      { label: 'Templates', href: '#templates' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Help centre', href: '/help' },
      { label: 'Getting started', href: '/help/getting-started' },
      { label: 'Sign in', href: '/sign-in' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={`${s.wrap} ${s.grid} ${s.footerTop}`}>
        <div className={s.footerBrand}>
          <Link href="/" className={s.footerLogo}>
            <Logo shaded />
          </Link>
          <p className={s.footerLine}>The business side of your business, in order.</p>
          <Link href="/sign-up" className={`${s.button} ${s.limeButton}`}>
            Create free account
          </Link>
        </div>
        <nav className={s.footerNav} aria-label="Footer">
          {COLUMNS.map((column) => (
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
      <div className={`${s.wrap} ${s.footerMark}`} aria-hidden="true">
        <Logo shaded label="" />
      </div>
    </footer>
  );
}
