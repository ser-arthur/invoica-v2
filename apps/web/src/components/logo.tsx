import { useId } from 'react';
import {
  LOGO_ACCENT_DOT,
  LOGO_FOLD,
  LOGO_FOLD_LINE,
  LOGO_INK,
  LOGO_INK_DOT,
  LOGO_VIEW_BOX,
} from './logo-shapes';

/**
 * The Invoica logo: the name, its first i a slip with the corner turned.
 * Letters take the text colour; the fold and the first dot take the accent, which follows the theme.
 * Sized by font size, like the word it replaces. Below about 34 pixels tall the fold stays one flat green.
 */
export function Logo({
  className,
  shaded = false,
  label = 'Invoica',
}: {
  className?: string;
  /** Draw the fold with its light gradient, for large sizes. */
  shaded?: boolean;
  label?: string;
}) {
  const id = useId();
  const gradient = `logo-fold-${id.replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <svg
      viewBox={LOGO_VIEW_BOX}
      role="img"
      aria-label={label}
      className={className}
      style={{ display: 'inline-block', height: '0.86em', width: 'auto', verticalAlign: '-0.12em' }}
    >
      {shaded ? (
        <defs>
          <linearGradient id={gradient} gradientUnits="userSpaceOnUse" {...LOGO_FOLD_LINE}>
            <stop offset="0" style={{ stopColor: 'var(--logo-fold-a)' }} />
            <stop offset="0.5" style={{ stopColor: 'var(--logo-fold-b)' }} />
            <stop offset="1" style={{ stopColor: 'var(--logo-fold-c)' }} />
          </linearGradient>
        </defs>
      ) : null}
      <path d={LOGO_INK} fill="currentColor" />
      <circle {...LOGO_INK_DOT} fill="currentColor" />
      <path d={LOGO_FOLD} style={{ fill: shaded ? `url(#${gradient})` : 'var(--logo-accent)' }} />
      <circle {...LOGO_ACCENT_DOT} style={{ fill: 'var(--logo-accent)' }} />
    </svg>
  );
}
