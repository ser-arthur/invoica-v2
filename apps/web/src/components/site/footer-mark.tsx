import { useId } from 'react';
import { LOGO_ACCENT_DOT, LOGO_FOLD, LOGO_FOLD_LINE, LOGO_INK, LOGO_INK_DOT } from '@/components/logo-shapes';

/** How many layers make the depth, and how far each sits behind the one in front, in the logo's units. */
const LAYERS = 20;
const STEP = { x: 2.2, y: -3.3 };

/** The colour a fraction t of the way from a to b, both #rrggbb. */
function mix(a: string, b: string, t: number) {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2]
    .map((i) => {
      const value = channel(a, i) + (channel(b, i) - channel(a, i)) * t;
      return Math.trunc(value + 0.5)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

/**
 * The footer's large logo, drawn as a solid block standing at the foot of the page: the letters' faces, and
 * behind them their depth, lit from above, so the tops of the letters catch the light and fall into shadow
 * further back. Drawn from the logo's own shapes (decision 0012); decoration only, hidden from assistive
 * technology.
 */
export function FooterMark() {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const ink = `mark-ink-${id}`;
  const accent = `mark-accent-${id}`;
  const face = `mark-face-${id}`;
  const fold = `mark-fold-${id}`;
  const layers = Array.from({ length: LAYERS }, (_, i) => LAYERS - i);
  return (
    <svg viewBox="-10 -100 3740 940" aria-hidden="true" focusable="false">
      <defs>
        <g id={ink}>
          <path d={LOGO_INK} />
          <circle {...LOGO_INK_DOT} />
        </g>
        <g id={accent}>
          <path d={LOGO_FOLD} />
          <circle {...LOGO_ACCENT_DOT} />
        </g>
        <linearGradient id={face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#21474b" />
          <stop offset="0.55" stopColor="#173538" />
        </linearGradient>
        <linearGradient id={fold} gradientUnits="userSpaceOnUse" {...LOGO_FOLD_LINE}>
          <stop offset="0" stopColor="#7fd35a" />
          <stop offset="0.5" stopColor="#37c66b" />
          <stop offset="1" stopColor="#1f9c57" />
        </linearGradient>
      </defs>
      {layers.map((k) => {
        // 0 at the face, 1 at the back
        const t = (k - 1) / (LAYERS - 1);
        const shift = `translate(${(STEP.x * k).toFixed(1)} ${(STEP.y * k).toFixed(1)})`;
        return (
          <g key={k} transform={shift}>
            <use href={`#${ink}`} fill={mix('#3a6d6e', '#0c2023', t)} />
            <use href={`#${accent}`} fill={mix('#2fae62', '#0b3a23', t)} />
          </g>
        );
      })}
      <use href={`#${ink}`} fill={`url(#${face})`} />
      <path d={LOGO_FOLD} fill={`url(#${fold})`} />
      <circle {...LOGO_ACCENT_DOT} fill="#46da80" />
    </svg>
  );
}
