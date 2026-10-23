import type { Metadata } from 'next';
import { Pricing } from '@/components/site/pricing';
import { SiteFooter } from '@/components/site/footer';
import { SiteHeader } from '@/components/site/header';
import s from '@/components/site/site.module.css';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Every account starts with 30 days of Pro, free, with no card. Then stay on Free, or choose a plan.',
};

export default function PricingPage() {
  return (
    <div className={s.site}>
      <SiteHeader />
      <main>
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  );
}
