import { useId } from 'react';
import { LOGO_ACCENT_DOT, LOGO_FOLD, LOGO_FOLD_LINE, LOGO_INK, LOGO_INK_DOT } from '@/components/logo-shapes';
import s from './site.module.css';

/** The foil's colours, lime through aqua and lilac and back. */
const FOIL: [number, string][] = [
  [0, '#CFF26A'],
  [0.16, '#8EE8B4'],
  [0.33, '#79D3D6'],
  [0.5, '#9DB0EE'],
  [0.66, '#D3B5EE'],
  [0.82, '#94E6C4'],
  [1, '#CFF26A'],
];

/** How far the foil sits above the letters, in the logo's units: the width of the edge that catches the light. */
const EDGE = 16;

/**
 * The foil shows on the tops of the letters and the dots only, never the upward edges inside the o, the c, the v and
 * the a. It is whole down to FULL, where the flat tops end, then fades out by GONE, so the edge round the o, the c,
 * the a and the n's shoulder tapers away instead of stopping at a line.
 */
const FULL = 250;
const GONE = 330;

/**
 * The footer's large logo (option E on the design canvas's "Footer logo" page): the letters dark, with a thin
 * holographic edge where their tops catch the light. The edge is drawn twice: faint, and lit, the lit one wiping in
 * from the left as the logo rises into view with a glint at its front, each time it comes into view (footer-light.tsx
 * marks it; site.module.css, "Motion"); with a mouse
 * the glint then follows the pointer (FooterLight). Drawn from the logo's own shapes (decision 0012); decoration
 * only, hidden from assistive technology.
 */
export function FooterMark() {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const foil = `mark-foil-${id}`;
  const sheen = `mark-sheen-${id}`;
  const fold = `mark-fold-${id}`;
  const tops = `mark-tops-${id}`;
  const topsFade = `mark-tops-fade-${id}`;
  const letters = `mark-letters-${id}`;
  return (
    <svg viewBox="-10 -150 3760 1010" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={foil} gradientUnits="userSpaceOnUse" x1="-200" y1="-300" x2="3900" y2="900">
          {FOIL.map(([offset, colour]) => (
            <stop key={offset} offset={offset} stopColor={colour} />
          ))}
        </linearGradient>
        <linearGradient id={sheen} gradientUnits="userSpaceOnUse" x1="1350" y1="0" x2="2050" y2="420">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={fold} gradientUnits="userSpaceOnUse" {...LOGO_FOLD_LINE}>
          <stop offset="0" stopColor="#CFF26A" />
          <stop offset="0.5" stopColor="#46DA80" />
          <stop offset="1" stopColor="#2FB866" />
        </linearGradient>
        <linearGradient id={topsFade} gradientUnits="userSpaceOnUse" x1="0" y1={FULL} x2="0" y2={GONE}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <mask id={tops} maskUnits="userSpaceOnUse" x="-10" y="-150" width="3760" height="1010">
          <rect x="-10" y="-150" width="3760" height="1010" fill={`url(#${topsFade})`} />
        </mask>
        <clipPath id={letters}>
          <path d={LOGO_INK} />
          <circle {...LOGO_INK_DOT} />
        </clipPath>
      </defs>
      <g mask={`url(#${tops})`}>
        <g transform={`translate(0 ${-EDGE})`}>
          <path d={LOGO_INK} fill={`url(#${foil})`} opacity="0.22" />
          <circle {...LOGO_INK_DOT} fill={`url(#${foil})`} opacity="0.22" />
          <g clipPath={`url(#${letters})`}>
            <rect
              className={s.footerLight}
              x="-10"
              y="-150"
              width="3760"
              height="1010"
              fill={`url(#${foil})`}
            />
            <g className={s.footerGlint}>
              <rect
                className={s.footerSheen}
                data-sheen=""
                x="900"
                y="-150"
                width="1600"
                height="1010"
                fill={`url(#${sheen})`}
              />
            </g>
          </g>
        </g>
      </g>
      <path d={LOGO_INK} fill="#15302F" />
      <circle {...LOGO_INK_DOT} fill="#15302F" />
      <path d={LOGO_FOLD} fill={`url(#${fold})`} />
      <circle {...LOGO_ACCENT_DOT} fill="#46DA80" />
    </svg>
  );
}
