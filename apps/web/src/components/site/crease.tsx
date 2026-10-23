import { useId } from 'react';
import { CREASE, farSide, hairlineShift, TONE_FRAME } from './fold';
import s from './site.module.css';

/** How much of each end of the lines fades out, as a part of their length. */
const FADE = 0.16;

/**
 * The crease line's colours along its length, from its foot to its top: lime to teal, or a silver that catches the
 * light twice along its length, for a ground where the words past the fold are already green.
 */
const FINISHES = {
  green: [
    [FADE, '#CFF26A'],
    [0.5, '#37C66B'],
    [1 - FADE, '#138C86'],
  ],
  silver: [
    [FADE, '#7E8A90'],
    [0.36, '#E8EDEF'],
    [0.52, '#9DA9AE'],
    [0.7, '#F5F8F9'],
    [1 - FADE, '#8A969B'],
  ],
} as const;

/**
 * A headline crossed by one diagonal fold. The headline is set twice: the heading itself, and a copy
 * clipped to the far side of the fold that takes a different finish. The fold is drawn as a gradient
 * line with a hairline beside it, square to it so the two end together, both fading out at their ends.
 *
 * xTop and xBottom are where the fold meets the top and the bottom of the drawing box, as a percentage
 * of the headline's width. The box runs `extend` per cent of the headline's height above and below it.
 */
export function Crease({
  lines,
  as: Tag = 'h1',
  typeClass,
  pastClass,
  xTop = CREASE.xTop,
  xBottom = CREASE.xBottom,
  extend = CREASE.extend,
  gap = 0.6,
  span = CREASE.span,
  dark = false,
  line = 'green',
  tone,
}: {
  lines: string[];
  as?: 'h1' | 'h2' | 'p';
  typeClass: string | undefined;
  pastClass: string | undefined;
  xTop?: number;
  xBottom?: number;
  extend?: number;
  gap?: number;
  span?: [number, number];
  /** On a dark ground the hairline beside the crease is light. */
  dark?: boolean;
  /** The crease line's finish. */
  line?: keyof typeof FINISHES;
  /**
   * A flat colour for everything past the fold, carried across whatever the headline sits in (which clips it), as if
   * the page were folded there. Drawn behind the headline.
   */
  tone?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const stops = FINISHES[line];
  const [first] = stops;
  const last = stops[stops.length - 1] ?? first;
  const height = 100 + 2 * extend;
  // where the fold crosses a given height, in per cent of the headline box (0 is its top, 100 its foot)
  const at = (y: number) => xTop + (xBottom - xTop) * ((extend + y) / height);
  // the clip runs well past the box so descenders change finish too
  const clip = `polygon(${at(-30).toFixed(2)}% -30%, 130% -30%, 130% 130%, ${at(130).toFixed(2)}% 130%)`;
  // the heading itself is clipped to the near side, so its dark edges never show around the far side's letters
  const near = `polygon(-30% -30%, ${at(-30).toFixed(2)}% -30%, ${at(130).toFixed(2)}% 130%, -30% 130%)`;
  // draw the fold only across the headline, a little past each end
  const t0 = Math.max(0, (xTop - span[1]) / (xTop - xBottom));
  const t1 = Math.min(1, (xTop - span[0]) / (xTop - xBottom));
  const x = (t: number, shift = 0) => (xTop + shift + (xBottom - xTop) * t).toFixed(2);
  const y = (t: number) => (100 * t).toFixed(2);
  // the hairline: the same stretch of the fold, moved across by `gap` and square to it
  const shift = hairlineShift(gap, { xTop, xBottom, extend, span });
  const h0 = t0 + shift;
  const h1 = t1 + shift;
  const hair = dark ? 'rgb(255 255 255 / 0.45)' : 'rgb(9 25 28 / 0.4)';
  const words = lines.map((line, i) => <span key={i}>{line}</span>);
  return (
    <div className={s.crease}>
      {tone ? (
        <span
          aria-hidden="true"
          data-fold-tone=""
          className={s.creaseTone}
          style={{
            left: `${TONE_FRAME.left}%`,
            top: `${TONE_FRAME.top}%`,
            width: `${TONE_FRAME.width}%`,
            height: `${TONE_FRAME.height}%`,
            backgroundColor: tone,
            clipPath: `polygon(${farSide({ xTop, xBottom, extend, span })
              .map(([px, py]) => `${px.toFixed(3)}% ${py.toFixed(3)}%`)
              .join(', ')})`,
          }}
        />
      ) : null}
      <Tag className={`${s.creaseText} ${s.display} ${typeClass}`} style={{ clipPath: near }}>
        {interleave(words)}
      </Tag>
      <div
        aria-hidden="true"
        className={`${s.creaseText} ${s.creasePast} ${s.display} ${typeClass} ${pastClass}`}
        style={{ clipPath: clip }}
      >
        {interleave(lines.map((line, i) => <span key={i}>{line}</span>))}
      </div>
      <svg
        aria-hidden="true"
        className={s.creaseLine}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ top: `-${extend}%`, height: `${height}%` }}
      >
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x(t1)} y1={y(t1)} x2={x(t0)} y2={y(t0)}>
            <stop offset="0" stopColor={first[1]} stopOpacity="0" />
            {stops.map(([offset, colour]) => (
              <stop key={offset} offset={offset} stopColor={colour} />
            ))}
            <stop offset="1" stopColor={last[1]} stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={`${id}h`}
            gradientUnits="userSpaceOnUse"
            x1={x(h1, gap)}
            y1={y(h1)}
            x2={x(h0, gap)}
            y2={y(h0)}
          >
            <stop offset="0" stopColor={hair} stopOpacity="0" />
            <stop offset={FADE} stopColor={hair} />
            <stop offset={1 - FADE} stopColor={hair} />
            <stop offset="1" stopColor={hair} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={x(h0, gap)}
          y1={y(h0)}
          x2={x(h1, gap)}
          y2={y(h1)}
          stroke={`url(#${id}h)`}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={x(t0)}
          y1={y(t0)}
          x2={x(t1)}
          y2={y(t1)}
          stroke={`url(#${id})`}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

/** Lines of a headline, separated by spaces so they read as one sentence. */
function interleave(words: React.ReactNode[]) {
  return words.flatMap((w, i) => (i === 0 ? [w] : [' ', w]));
}
