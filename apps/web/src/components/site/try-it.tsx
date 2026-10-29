'use client';

import { useDeferredValue, useState, type CSSProperties, type RefObject } from 'react';
import { TEMPLATE_LIST } from '@invoica/documents';
import s from './site.module.css';

/** Eight colours to try, one of them pale, so the readable-text rule and Marquee's second colour show. */
export const COLOURS = [
  { name: 'Forest', value: '#17795a' },
  { name: 'Orange', value: '#d9480f' },
  { name: 'Navy', value: '#1d3c5a' },
  { name: 'Plum', value: '#5b2a4e' },
  { name: 'Teal', value: '#138c86' },
  { name: 'Rose', value: '#c52a55' },
  { name: 'Lemon', value: '#f2d33b' },
  { name: 'Charcoal', value: '#2f3a3d' },
];

export const fontUrl = (f: string) => `/doc-fonts/${f}`;
export const nameOf = (template: string) => TEMPLATE_LIST.find((t) => t.id === template)?.name ?? template;

/**
 * The visitor's own business name and colour. `typed` is the name a moment after typing, so the invoices redraw once
 * the visitor pauses; `chosen` is whether they have given either.
 */
export function useVisitor() {
  const [name, setName] = useState('');
  const [colour, setColour] = useState<string | null>(null);
  const typed = useDeferredValue(name.trim());
  return {
    name,
    setName,
    colour,
    setColour,
    typed,
    chosen: typed !== '' || colour !== null,
    reset: () => {
      setName('');
      setColour(null);
    },
  };
}

export type Visitor = ReturnType<typeof useVisitor>;

/** The controls that redraw the templates as the visitor's: a business name, eight colours, and the way back. */
export function TryIt({
  visitor,
  formRef,
  onFocus,
  className,
}: {
  visitor: Visitor;
  formRef?: RefObject<HTMLFormElement | null>;
  onFocus?: () => void;
  className?: string;
}) {
  return (
    <form
      ref={formRef}
      className={className ? `${s.tryIt} ${className}` : s.tryIt}
      onSubmit={(event) => event.preventDefault()}
    >
      <p className={s.tryTitle}>Try it with your business</p>
      <label className={s.tryField}>
        <span>Business name</span>
        <input
          className={s.field}
          value={visitor.name}
          maxLength={60}
          placeholder="Your business name"
          autoComplete="organization"
          onFocus={onFocus}
          onChange={(event) => visitor.setName(event.target.value)}
        />
      </label>
      <fieldset className={s.trySet}>
        <legend>Colour</legend>
        <div className={s.swatches}>
          {COLOURS.map((c) => (
            <label key={c.value} className={s.swatch} style={{ '--swatch': c.value } as CSSProperties}>
              <input
                type="radio"
                name="showcase-colour"
                value={c.value}
                checked={visitor.colour === c.value}
                onChange={() => visitor.setColour(c.value)}
              />
              <span className={s.srOnly}>{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {visitor.chosen ? (
        <button type="button" className={s.tryBack} onClick={visitor.reset}>
          Back to the examples
        </button>
      ) : null}
    </form>
  );
}
