import { redirect } from 'next/navigation';
import { AppSheet } from '@/components/site/app-sheet';
import { Clients } from '@/components/site/clients';
import { Hero } from '@/components/site/hero';
import { Itemised } from '@/components/site/itemised';
import { Phones } from '@/components/site/phones';
import { Pillars } from '@/components/site/pillars';
import { Steps } from '@/components/site/steps';
import { Templates } from '@/components/site/templates';
import { isSignedIn } from '@/lib/session';

/**
 * The public home page. Its story, in order: look established from the first invoice (hero), the app itself (its
 * dashboard), what Invoica does for a business (why), how one invoice gets paid (how), the clients behind the
 * invoices, how it looks to clients (templates), on the move (phones), and everything else with the sign-up as an
 * invoice's tear-off slip (pricing).
 */
export default async function HomePage() {
  if (await isSignedIn()) redirect('/dashboard');
  return (
    <main>
      <Hero />
      <AppSheet />
      <Pillars />
      <Steps />
      <Clients />
      <Templates />
      <Phones />
      <Itemised />
    </main>
  );
}
