import Link from 'next/link';
import { Crease } from './crease';
import { MoneyIn } from './money-in';
import s from './site.module.css';

/**
 * The hero: the headline crossed by one crease, words past it fading to slate grey; two facts beside it;
 * one sentence and the main button beneath; then the money-in slabs.
 */
export function Hero() {
  return (
    <section className={s.hero}>
      <div className={`${s.wrap} ${s.heroGrid}`}>
        <div className={s.heroHead}>
          <Crease
            lines={['Every invoice,', 'all the way', 'to paid.']}
            typeClass={s.heroType}
            pastClass={s.slate}
          />
        </div>
        <div className={s.heroFacts}>
          <p className={s.fact}>
            <span className={s.label}>For new businesses</span>
            Freelancers, studios and small firms starting out.
          </p>
          <p className={s.fact}>
            <span className={s.label}>Free for 30 days</span>
            No card needed. Three clients stay free after.
          </p>
        </div>
        <p className={s.heroStatement}>Look established from day one, and always know who owes you what.</p>
        <div className={s.heroActions}>
          <Link href="/sign-up" className={s.button}>
            Create your free account
          </Link>
          <a href="#how" className={s.textLink}>
            How it works
          </a>
        </div>
      </div>
      <div className={s.wrap}>
        <MoneyIn />
      </div>
    </section>
  );
}
