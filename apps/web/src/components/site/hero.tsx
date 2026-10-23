import type { CSSProperties } from 'react';
import Link from 'next/link';
import { FOLD } from './fold';
import { MoneyIn } from './money-in';
import s from './site.module.css';

const LINES = ['Every invoice,', 'all the way', 'to paid.'];

/**
 * The hero, crossed by one fold that runs from the top right corner of the screen, just under the header,
 * down past the left edge. The fold always passes through the same point of the headline (just before
 * "way"), so it crosses the words the same way at every width. Words past it are grey.
 *
 * The layout is drawn twice: once as the page, and once as a copy that shows only the headline, clipped
 * to the far side of the fold. Both copies lay out identically, so the two headlines sit exactly together.
 */
export function Hero() {
  return (
    <section
      className={s.hero}
      style={
        {
          '--fold-x': FOLD.anchorX,
          '--fold-y': FOLD.anchorY,
          '--fold-reach': `${FOLD.reach}px`,
          '--fold-half': `${FOLD.halfContent}px`,
        } as CSSProperties
      }
    >
      <div className={s.heroTop}>
        <HeroGrid />
        <div className={s.heroPast} aria-hidden="true" inert>
          <HeroGrid copy />
        </div>
        <span className={s.heroLine} aria-hidden="true" />
        <span className={s.heroHairline} aria-hidden="true" />
      </div>
      <div className={s.wrap}>
        <MoneyIn />
      </div>
    </section>
  );
}

function HeroGrid({ copy = false }: { copy?: boolean }) {
  const words = LINES.flatMap((line, i) =>
    i === 0 ? [<span key={i}>{line}</span>] : [' ', <span key={i}>{line}</span>],
  );
  return (
    <div className={`${s.wrap} ${s.heroGrid}`}>
      {copy ? (
        <div className={`${s.heroHead} ${s.heroType} ${s.display} ${s.grey}`}>{words}</div>
      ) : (
        <h1 className={`${s.heroHead} ${s.heroType} ${s.display}`}>{words}</h1>
      )}
      <div className={`${s.heroFacts} ${copy ? s.hidden : ''}`}>
        <p className={s.fact}>
          <span className={s.label}>For new businesses</span>
          Freelancers, studios and small firms starting out.
        </p>
        <p className={s.fact}>
          <span className={s.label}>Free for 30 days</span>
          No card needed. Three clients stay free after.
        </p>
      </div>
      <p className={`${s.heroStatement} ${copy ? s.hidden : ''}`}>
        Look established from day one, and always know who owes you what.
      </p>
      <div className={`${s.heroActions} ${copy ? s.hidden : ''}`}>
        {copy ? (
          <span className={s.button}>Create your free account</span>
        ) : (
          <Link href="/sign-up" className={s.button}>
            Create your free account
          </Link>
        )}
        {copy ? (
          <span className={s.textLink}>How it works</span>
        ) : (
          <a href="#how" className={s.textLink}>
            How it works
          </a>
        )}
      </div>
    </div>
  );
}
