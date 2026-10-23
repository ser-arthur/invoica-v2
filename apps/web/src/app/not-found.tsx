import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Envelope } from '@/components/site/envelope';
import { SiteFooter } from '@/components/site/footer';
import { SiteHeader } from '@/components/site/header';
import n from '@/components/site/not-found.module.css';
import { plannedPage } from '@/components/site/planned-pages';
import s from '@/components/site/site.module.css';
import { PATH_HEADER } from '@/lib/request-path';
import { isSignedIn } from '@/lib/session';

export const metadata: Metadata = { title: 'Page not found' };

/**
 * Any address with no page (docs/specs/not-found-page.md), answered with status 404. A planned page not written yet
 * gets its own notice; any other address gets one message. The address itself is never shown.
 */
export default async function NotFound() {
  const planned = plannedPage((await headers()).get(PATH_HEADER));
  const signedIn = await isSignedIn();
  return (
    <div className={s.site}>
      <SiteHeader signedIn={signedIn} />
      <main id="main" className={`${s.wrap} ${n.lost}`}>
        <div>
          <span className={s.label}>{planned ? 'Coming soon' : 'Error 404'}</span>
          <h1 className={`${s.display} ${n.title}`}>
            {planned?.heading ?? 'There is no page at this address.'}
          </h1>
          <p className={s.lead}>
            {planned
              ? `${planned.about} Until it is ready, carry on from here.`
              : 'The link may be mistyped or out of date. Check the address, or carry on from here.'}
          </p>
          <div className={n.ways}>
            <Link href={signedIn ? '/dashboard' : '/'} className={s.button}>
              {signedIn ? 'Go to your dashboard' : 'Go to the home page'}
            </Link>
            <Link href="/pricing" className={s.textLink}>
              See plans and prices
            </Link>
            {signedIn ? null : (
              <Link href="/sign-in" className={s.textLink}>
                Sign in
              </Link>
            )}
          </div>
        </div>
        <Envelope kind={planned ? 'planned' : 'unknown'} />
      </main>
      <SiteFooter />
    </div>
  );
}
