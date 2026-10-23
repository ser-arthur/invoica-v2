import { redirect } from 'next/navigation';
import { AppSheet } from '@/components/site/app-sheet';
import { SiteFooter } from '@/components/site/footer';
import { SiteHeader } from '@/components/site/header';
import { Hero } from '@/components/site/hero';
import { Itemised } from '@/components/site/itemised';
import { Phones } from '@/components/site/phones';
import { Pillars } from '@/components/site/pillars';
import { Steps } from '@/components/site/steps';
import { Templates } from '@/components/site/templates';
import s from '@/components/site/site.module.css';
import { isSignedIn } from '@/lib/session';

/**
 * The public home page. Its story, in order: look established from the first invoice (hero), what Invoica
 * does for a business (why), how one invoice gets paid (how), how it looks to clients (templates), on the
 * move (phones), and everything else with the sign-up as an invoice's tear-off slip (pricing).
 */
export default async function HomePage() {
  if (await isSignedIn()) redirect('/dashboard');
  return (
    <div className={s.site}>
      <SiteHeader />
      <main>
        <Hero />
        <AppSheet />
        <Pillars />
        <Steps />
        <Templates />
        <Phones />
        <Itemised />
      </main>
      <SiteFooter />
    </div>
  );
}
