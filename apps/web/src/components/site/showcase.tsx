'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { renderDocumentHtml, SHOWCASE, showcaseSnapshot } from '@invoica/documents';
import { Paper } from '@/components/paper';
import s from './site.module.css';
import { fontUrl, nameOf, TryIt, useVisitor } from './try-it';

/** Whether the page is as narrow as a phone, where the shelf becomes a row to swipe. */
function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return narrow;
}

type Card = { template: string; name: string; maker: string; forWhom: string; html: string };

/**
 * The templates shelf: six templates as they were designed, each made out by its own business, one in front. A business
 * name or a colour redraws all six as the visitor's; "See all sixteen" leads to the Templates page, which holds the
 * whole range. On a wide screen the six overlap like a hand of cards. On a phone the name and colours come first, so
 * the card stays in sight while typing, and the cards sit in a row seen one at a time. The same code renders real
 * invoices. Without the page's script it shows the six as designed.
 */
export function Showcase() {
  const visitor = useVisitor();
  const { typed, colour, chosen } = visitor;
  // Billboard, third on the shelf, stands in front.
  const [front, setFront] = useState(2);
  const narrow = useNarrow();
  const shelfRef = useRef<HTMLFieldSetElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const six = useMemo<Card[]>(() => {
    const yours = { name: typed || undefined, colour: colour ?? undefined };
    return SHOWCASE.map((entry) => ({
      template: entry.template,
      name: nameOf(entry.template),
      maker: chosen && typed ? typed : entry.business,
      forWhom: entry.forWhom,
      html: renderDocumentHtml(showcaseSnapshot(entry.template, yours), {
        fontUrl,
        logoUrl: chosen ? null : entry.logo,
      }),
    }));
  }, [typed, colour, chosen]);

  const row = six;
  const shown = Math.min(front, row.length - 1);
  const inFront = row[shown]!;

  // Where the shelf scrolls sideways (phones), it opens on the card in front.
  useEffect(() => {
    const shelf = shelfRef.current;
    const card = shelf?.querySelector<HTMLElement>('[data-front]');
    if (shelf && card && shelf.scrollWidth > shelf.clientWidth) shelf.scrollLeft = card.offsetLeft - 20;
  }, [narrow]);

  // On a phone, the card in view is the one in front: swiping the row moves the caption with it.
  useEffect(() => {
    const shelf = shelfRef.current;
    if (!narrow || !shelf) return;
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = Number((entry.target as HTMLElement).dataset.index);
          setFront(i);
        }
      },
      { root: shelf, threshold: 0.6 },
    );
    shelf.querySelectorAll('[data-index]').forEach((card) => seen.observe(card));
    return () => seen.disconnect();
  }, [narrow, row.length]);

  /** Chosen by tap or keyboard: on a phone the row brings the card into view. */
  const choose = (i: number) => {
    setFront(i);
    if (!narrow) return;
    shelfRef.current
      ?.querySelector<HTMLElement>(`[data-index="${i}"]`)
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  };

  /** On a phone, typing brings the controls to the top, so the card under them stays in sight above the keyboard. */
  const keepInSight = () => {
    if (!narrow) return;
    window.setTimeout(() => formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250);
  };

  return (
    <div className={`${s.wrap} ${s.showcase}`}>
      <TryIt visitor={visitor} formRef={formRef} onFocus={keepInSight} />

      <div className={s.shelfArea}>
        <fieldset ref={shelfRef} className={s.shelf}>
          <legend className={s.srOnly}>Templates</legend>
          {row.map((t, i) => {
            const away = Math.abs(i - shown);
            return (
              <label
                key={t.template}
                className={s.shelfCard}
                data-index={i}
                data-front={i === shown ? '' : undefined}
                style={
                  {
                    '--i': i,
                    '--away': away,
                    '--turn': `${(i - (six.length - 1) / 2) * 2.2}deg`,
                    zIndex: i === shown ? 20 : 10 - away,
                  } as React.CSSProperties
                }
              >
                <input
                  type="radio"
                  name="showcase-template"
                  value={t.template}
                  checked={i === shown}
                  onChange={() => choose(i)}
                />
                <span className={s.srOnly}>
                  {t.name}, made out by {t.maker}
                </span>
                <Paper
                  html={t.html}
                  width={narrow ? 300 : 260}
                  title={`${t.name} template`}
                  className={s.shelfPaper}
                />
              </label>
            );
          })}
        </fieldset>
        <div className={s.shelfFoot}>
          <p className={s.shelfCaption} aria-live="polite">
            <strong>{inFront.name}</strong> {inFront.forWhom}{' '}
            <span className={s.shelfCount}>
              {shown + 1} of {row.length}
            </span>
          </p>
          <Link href="/templates" className={s.textLink}>
            See all sixteen
          </Link>
        </div>
      </div>
    </div>
  );
}
