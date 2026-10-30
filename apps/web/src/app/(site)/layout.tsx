import { SiteFooter } from '@/components/site/footer';
import { SiteHeader } from '@/components/site/header';
import s from '@/components/site/site.module.css';
import { isSignedIn } from '@/lib/session';

/**
 * The public pages share one header and footer, so moving between them keeps the header where it is: it settles in
 * once, when the first of them loads, and each page's own content lands as it opens.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isSignedIn();
  return (
    <div className={s.site} data-site="">
      <SiteHeader signedIn={signedIn} arrive />
      {children}
      <SiteFooter />
    </div>
  );
}
