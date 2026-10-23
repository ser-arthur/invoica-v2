import Link from 'next/link';
import { Logo } from '@/components/logo';
import s from './site.module.css';

export function SiteHeader() {
  return (
    <div className={s.headerBar}>
      <header className={`${s.wrap} ${s.header}`}>
        <Link href="/" className={s.brand}>
          <Logo shaded />
        </Link>
        <nav className={s.nav} aria-label="Site">
          <a href="#why">Why Invoica</a>
          <a href="#how">How it works</a>
          <a href="#templates">Templates</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className={s.account}>
          <Link href="/sign-in" className={s.signIn}>
            Sign in
          </Link>
          <Link href="/sign-up" className={`${s.button} ${s.headerButton}`}>
            Create free account
          </Link>
        </div>
      </header>
    </div>
  );
}
