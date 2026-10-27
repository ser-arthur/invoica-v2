import Image from 'next/image';
import dashboard from './images/app-dashboard.webp';
import s from './site.module.css';

/**
 * The app below the hero, large and flat: the dashboard of the studio whose money in the hero charts. Scrolling to it,
 * it lands: it starts tipped back, as a sheet lying on a desk, and stands up to face the reader.
 */
export function AppSheet() {
  return (
    <section aria-label="The app" className={`${s.wrap} ${s.appStage}`}>
      <figure className={s.appFigure}>
        <div className={s.appWindow}>
          <Image
            src={dashboard}
            alt="The Invoica dashboard for Linden & Rowe Studio: £6,420.00 owed across five invoices, £2,240.00 of it overdue, the two late invoices to chase, and money in for the last six months."
            unoptimized
            className={s.appShot}
          />
        </div>
        <figcaption className={s.caption}>
          The same studio&rsquo;s dashboard
          <span className={s.captionMore}>: what is owed, what is late and what has come in.</span>
        </figcaption>
      </figure>
    </section>
  );
}
