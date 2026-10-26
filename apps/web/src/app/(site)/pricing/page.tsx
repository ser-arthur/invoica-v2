import type { Metadata } from 'next';
import { Pricing } from '@/components/site/pricing';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Every account starts with 30 days of Pro, free, with no card. Then stay on Free, or choose a plan.',
};

export default function PricingPage() {
  return (
    <main>
      <Pricing />
    </main>
  );
}
