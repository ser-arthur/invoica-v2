import { useId } from 'react';
import s from './site.module.css';

/**
 * A headline crossed by one diagonal fold. The headline is set twice: the heading itself, and a copy
 * clipped to the far side of the fold that takes a different finish. The fold is drawn as a gradient
 * line with a hairline beside it.
 *
 * xTop and xBottom are where the fold meets the top and the bottom of the drawing box, as a percentage
 * of the headline's width. The box runs `extend` per cent of the headline's height above and below it.
 */
export function Crease({
  lines,
  as: Tag = 'h1',
  typeClass,
  pastClass,
  xTop,
  xBottom,
  extend = 14,
  gap = 0.6,
  span = [-3, 112],
}: {
  lines: string[];
  as?: 'h1' | 'h2';
  typeClass: string | undefined;
  pastClass: string | undefined;
  xTop: number;
  xBottom: number;
  extend?: number;
  gap?: number;
  span?: [number, number];
}) {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const height = 100 + 2 * extend;
  // where the fold crosses a given height, in per cent of the headline box (0 is its top, 100 its foot)
  const at = (y: number) => xTop + (xBottom - xTop) * ((extend + y) / height);
  // the clip runs well past the box so descenders change finish too
  const clip = `polygon(${at(-30).toFixed(2)}% -30%, 130% -30%, 130% 130%, ${at(130).toFixed(2)}% 130%)`;
  // draw the fold only across the headline, a little past each end
  const t0 = Math.max(0, (xTop - span[1]) / (xTop - xBottom));
  const t1 = Math.min(1, (xTop - span[0]) / (xTop - xBottom));
  const x = (t: number, shift = 0) => (xTop + shift + (xBottom - xTop) * t).toFixed(2);
  const y = (t: number) => (100 * t).toFixed(2);
  const words = lines.map((line, i) => <span key={i}>{line}</span>);
  return (
    <div className={s.crease}>
      <Tag className={`${s.creaseText} ${s.display} ${typeClass}`}>{interleave(words)}</Tag>
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
            <stop offset="0" stopColor="#CFF26A" />
            <stop offset="0.5" stopColor="#37C66B" />
            <stop offset="1" stopColor="#138C86" />
          </linearGradient>
        </defs>
        <line
          x1={x(t0, gap)}
          y1={y(t0)}
          x2={x(t1, gap)}
          y2={y(t1)}
          stroke="rgb(9 25 28 / 0.4)"
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
          strokeLinecap="round"
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
