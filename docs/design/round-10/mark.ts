import {
  LOGO_ACCENT_DOT,
  LOGO_FOLD,
  LOGO_INK,
  LOGO_INK_DOT,
  LOGO_VIEW_BOX,
} from '../../../apps/web/src/components/logo-shapes';

/** Invoica's wordmark as inline SVG for an invoice's foot: the letters in `ink`, the slip's fold and dot in `accent`. */
export function invoicaMark(ink: string, accent: string, heightMm = 3.2): string {
  return `<svg class="inv-mark" viewBox="${LOGO_VIEW_BOX}" style="height:${heightMm}mm;width:auto" aria-label="Invoica"><path d="${LOGO_INK}" fill="${ink}"/><circle cx="${LOGO_INK_DOT.cx}" cy="${LOGO_INK_DOT.cy}" r="${LOGO_INK_DOT.r}" fill="${ink}"/><path d="${LOGO_FOLD}" fill="${accent}"/><circle cx="${LOGO_ACCENT_DOT.cx}" cy="${LOGO_ACCENT_DOT.cy}" r="${LOGO_ACCENT_DOT.r}" fill="${accent}"/></svg>`;
}

/** The "Powered by Invoica" line at an invoice's foot. */
export function poweredBy(ink: string, accent: string, text: string): string {
  return `<div class="powered"><span style="color:${text}">Powered by</span>${invoicaMark(ink, accent)}</div>`;
}
