import type { Metadata } from 'next';
import Link from 'next/link';
import p from '@/components/site/pricing.module.css';
import s from '@/components/site/site.module.css';
import { TemplatesRange } from '@/components/site/templates-range';

export const metadata: Metadata = {
  title: 'Templates',
  description:
    'Sixteen invoice layouts, each made out by a business of its own kind. Try them with your business name and colour.',
};

/**
 * The Templates page: the whole range of sixteen, which the home page's six lead to. It opens as the pricing page does
 * (pricing.module.css): the label, the heading's halves from opposite sides, then the words.
 */
export default function TemplatesPage() {
  return (
    <main>
      <section className={`${s.wrap} ${p.intro}`} aria-labelledby="templates-heading" data-lands="">
        <span className={s.label}>Templates</span>
        <h1 id="templates-heading" className={`${s.display} ${p.title}`}>
          <span className={s.keep}>Sixteen layouts.</span>{' '}
          <span className={s.keep}>Your logo, your colour.</span>
        </h1>
        <p className={s.lead}>
          Each layout is shown as a business of its kind would send it. Type your business name or choose a
          colour to see all sixteen as yours.
        </p>
      </section>
      <div className={`${s.templates} ${s.rangeBand}`}>
        <TemplatesRange />
      </div>
      <section className={`${s.wrap} ${s.rangeFoot}`} aria-labelledby="range-foot-heading">
        <h2 id="range-foot-heading" className={`${s.display} ${s.rangeFootHeading}`}>
          All sixteen come with Pro.
        </h2>
        <p className={s.lead}>
          Every account starts with 30 days of Pro, free, with no card. Choose a layout as you set up, and
          change it in settings whenever you like. Invoices already sent keep the look they were sent with.
        </p>
        <div className={s.rangeFootLinks}>
          <Link href="/sign-up" className={s.button}>
            Create free account
          </Link>
          <Link href="/pricing" className={s.buttonLine}>
            Compare plans and prices
          </Link>
        </div>
      </section>
    </main>
  );
}
