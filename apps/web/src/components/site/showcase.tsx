'use client';

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  renderDocumentHtml,
  sampleSnapshot,
  SHOWCASE,
  showcaseSnapshot,
  TEMPLATE_LIST,
} from '@invoica/documents';
import { Paper } from '@/components/paper';
import s from './site.module.css';

/** Eight colours to try, one of them pale, so the readable-text rule and Marquee's second colour show. */
const COLOURS = [
  { name: 'Forest', value: '#17795a' },
  { name: 'Orange', value: '#d9480f' },
  { name: 'Navy', value: '#1d3c5a' },
  { name: 'Plum', value: '#5b2a4e' },
  { name: 'Teal', value: '#138c86' },
  { name: 'Rose', value: '#c52a55' },
  { name: 'Lemon', value: '#f2d33b' },
  { name: 'Charcoal', value: '#2f3a3d' },
];

/** The website's example studio, which makes out the nine templates that have no business of their own. */
const STUDIO = 'Linden & Rowe Studio';

const fontUrl = (f: string) => `/doc-fonts/${f}`;
const nameOf = (template: string) => TEMPLATE_LIST.find((t) => t.id === template)?.name ?? template;

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
 * name or a colour redraws all six as the visitor's; "See all fifteen" opens the whole range. On a wide screen the six
 * overlap like a hand of cards and the fifteen open below them. On a phone the name and colours come first, so the
 * card stays in sight while typing, and the cards sit in a row seen one at a time, the fifteen joining the six in the
 * same row. The same code renders real invoices. Without the page's script it shows the six as designed.
 */
export function Showcase() {
  const [name, setName] = useState('');
  const [colour, setColour] = useState<string | null>(null);
  // Billboard, third on the shelf, stands in front.
  const [front, setFront] = useState(2);
  const [all, setAll] = useState(false);
  const narrow = useNarrow();
  const allId = useId();
  const shelfRef = useRef<HTMLFieldSetElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const typed = useDeferredValue(name.trim());
  const yours = typed !== '' || colour !== null;

  const six = useMemo<Card[]>(() => {
    const visitor = { name: typed || undefined, colour: colour ?? undefined };
    const mine = typed !== '' || colour !== null;
    return SHOWCASE.map((entry) => ({
      template: entry.template,
      name: nameOf(entry.template),
      maker: mine && typed ? typed : entry.business,
      forWhom: entry.forWhom,
      html: renderDocumentHtml(showcaseSnapshot(entry.template, visitor), {
        fontUrl,
        logoUrl: mine ? null : entry.logo,
      }),
    }));
  }, [typed, colour]);

  // The nine with no business of their own, made out by the example studio or the visitor.
  const nine = useMemo<Card[]>(() => {
    if (!all) return [];
    return TEMPLATE_LIST.filter((t) => !SHOWCASE.some((e) => e.template === t.id)).map((t) => ({
      template: t.id,
      name: t.name,
      maker: typed || STUDIO,
      forWhom: t.description,
      html: renderDocumentHtml(
        sampleSnapshot({
          template: t.id,
          seller: { name: typed || STUDIO, brandColour: colour ?? '#17795a' },
        }),
        { fontUrl, logoUrl: null },
      ),
    }));
  }, [all, typed, colour]);

  // On a wide screen the fifteen open below the shelf, in the picker's order.
  const fifteen = useMemo(() => {
    if (!all || narrow) return [];
    const cards = [...six, ...nine];
    return TEMPLATE_LIST.map((t) => ({ ...t, html: cards.find((c) => c.template === t.id)!.html }));
  }, [all, narrow, six, nine]);

  const row = narrow && all ? [...six, ...nine] : six;
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
      <form ref={formRef} className={s.tryIt} onSubmit={(event) => event.preventDefault()}>
        <p className={s.tryTitle}>Try it with your business</p>
        <label className={s.tryField}>
          <span>Business name</span>
          <input
            className={s.field}
            value={name}
            maxLength={60}
            placeholder="Your business name"
            autoComplete="organization"
            onFocus={keepInSight}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <fieldset className={s.trySet}>
          <legend>Colour</legend>
          <div className={s.swatches}>
            {COLOURS.map((c) => (
              <label
                key={c.value}
                className={s.swatch}
                style={{ '--swatch': c.value } as React.CSSProperties}
              >
                <input
                  type="radio"
                  name="showcase-colour"
                  value={c.value}
                  checked={colour === c.value}
                  onChange={() => setColour(c.value)}
                />
                <span className={s.srOnly}>{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {yours ? (
          <button
            type="button"
            className={s.tryBack}
            onClick={() => {
              setName('');
              setColour(null);
            }}
          >
            Back to the examples
          </button>
        ) : null}
      </form>

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
          <button
            type="button"
            className={s.textLink}
            aria-expanded={all}
            aria-controls={narrow ? undefined : allId}
            onClick={() => {
              setAll((open) => !open);
              if (all && front > 5) choose(2);
            }}
          >
            {all ? 'Hide the fifteen' : 'See all fifteen'}
          </button>
        </div>
      </div>

      <div id={allId} className={s.allFifteen} hidden={!all || narrow}>
        {all && !narrow ? (
          <ul aria-label="All fifteen templates">
            {fifteen.map((t) => (
              <li key={t.id}>
                <Paper html={t.html} width={200} title={`${t.name} template`} />
                <strong>{t.name}</strong>
                <span>{t.description}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
