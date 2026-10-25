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

const fontUrl = (f: string) => `/doc-fonts/${f}`;
const nameOf = (template: string) => TEMPLATE_LIST.find((t) => t.id === template)?.name ?? template;

/**
 * The templates shelf: six templates as they were designed, each made out by its own business, one in front. A
 * business name or a colour redraws all six as the visitor's; "See all fifteen" opens the whole range. The same code
 * renders real invoices. Without the page's script it shows the six as designed.
 */
export function Showcase() {
  const [name, setName] = useState('');
  const [colour, setColour] = useState<string | null>(null);
  const [front, setFront] = useState(1);
  const [all, setAll] = useState(false);
  const allId = useId();
  const shelfRef = useRef<HTMLFieldSetElement>(null);
  // Where the shelf scrolls sideways (phones), it opens on the card in front.
  useEffect(() => {
    const row = shelfRef.current;
    const card = row?.querySelector<HTMLElement>('[data-front]');
    if (row && card && row.scrollWidth > row.clientWidth) row.scrollLeft = card.offsetLeft - 20;
  }, []);
  const typed = useDeferredValue(name.trim());
  const yours = typed !== '' || colour !== null;

  const shelf = useMemo(() => {
    const visitor = { name: typed || undefined, colour: colour ?? undefined };
    const mine = typed !== '' || colour !== null;
    return SHOWCASE.map((entry) => ({
      ...entry,
      name: nameOf(entry.template),
      html: renderDocumentHtml(showcaseSnapshot(entry.template, visitor), {
        fontUrl,
        logoUrl: mine ? null : entry.logo,
      }),
    }));
  }, [typed, colour]);

  const fifteen = useMemo(() => {
    if (!all) return [];
    const visitor = { name: typed || undefined, colour: colour ?? undefined };
    const mine = typed !== '' || colour !== null;
    return TEMPLATE_LIST.map((t) => {
      const shown = SHOWCASE.find((e) => e.template === t.id);
      const snapshot = shown
        ? showcaseSnapshot(t.id, visitor)
        : sampleSnapshot({
            template: t.id,
            seller: { name: typed || 'Field Office', brandColour: colour ?? '#17795a' },
          });
      return {
        ...t,
        html: renderDocumentHtml(snapshot, { fontUrl, logoUrl: shown && !mine ? shown.logo : null }),
      };
    });
  }, [all, typed, colour]);

  const inFront = shelf[front]!;
  return (
    <div className={`${s.wrap} ${s.showcase}`}>
      <form className={s.tryIt} onSubmit={(event) => event.preventDefault()}>
        <p className={s.tryTitle}>Try it with your business</p>
        <label className={s.tryField}>
          <span>Business name</span>
          <input
            className={s.field}
            value={name}
            maxLength={60}
            placeholder="Your business name"
            autoComplete="organization"
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
          {shelf.map((t, i) => {
            const away = Math.abs(i - front);
            return (
              <label
                key={t.template}
                className={s.shelfCard}
                data-front={i === front ? '' : undefined}
                style={
                  {
                    '--i': i,
                    '--away': away,
                    '--turn': `${(i - (shelf.length - 1) / 2) * 2.2}deg`,
                    zIndex: i === front ? 20 : 10 - away,
                  } as React.CSSProperties
                }
              >
                <input
                  type="radio"
                  name="showcase-template"
                  value={t.template}
                  checked={i === front}
                  onChange={() => setFront(i)}
                />
                <span className={s.srOnly}>
                  {t.name}, made out by {yours && typed ? typed : t.business}
                </span>
                <Paper html={t.html} width={260} title={`${t.name} template`} className={s.shelfPaper} />
              </label>
            );
          })}
        </fieldset>
        <div className={s.shelfFoot}>
          <p className={s.shelfCaption} aria-live="polite">
            <strong>{inFront.name}</strong> {inFront.forWhom}
          </p>
          <button
            type="button"
            className={s.textLink}
            aria-expanded={all}
            aria-controls={allId}
            onClick={() => setAll((open) => !open)}
          >
            {all ? 'Hide the fifteen' : 'See all fifteen'}
          </button>
        </div>
      </div>

      <div id={allId} className={s.allFifteen} hidden={!all}>
        {all ? (
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
