import { contrastRatio } from '@invoica/core';
import { LOGO_ACCENT_DOT, LOGO_FOLD, LOGO_INK, LOGO_INK_DOT, LOGO_VIEW_BOX } from '../logo-shapes';
import { esc } from './shared';

/**
 * What Signature, Invoica's own template, carries of Invoica: the wordmark after "Powered by", the crease across the
 * number, and the fold that turns the band a shade lighter past it (docs/specs/invoice-templates.md).
 */

/** "Powered by" and Invoica's wordmark: the letters in `ink`, the slip's turned corner and its dot in `accent`. */
export function poweredByInvoica(ink: string, accent: string, text: string): string {
  return `<span class="powered"><span style="color:${text}">Powered by</span><svg viewBox="${LOGO_VIEW_BOX}" role="img" aria-label="Invoica"><path d="${LOGO_INK}" fill="${ink}"/><circle cx="${LOGO_INK_DOT.cx}" cy="${LOGO_INK_DOT.cy}" r="${LOGO_INK_DOT.r}" fill="${ink}"/><path d="${LOGO_FOLD}" fill="${accent}"/><circle cx="${LOGO_ACCENT_DOT.cx}" cy="${LOGO_ACCENT_DOT.cy}" r="${LOGO_ACCENT_DOT.r}" fill="${accent}"/></svg></span>`;
}

export const POWERED_CSS = `.powered{display:inline-flex;align-items:center;gap:1.8mm;white-space:nowrap}.powered svg{display:block;height:3.2mm;width:auto}`;

/** A colour mixed towards white until it reads at `min` against a dark `ground`. */
export function onNight(hex: string, ground: string, min = 4.5): string {
  const n = Number.parseInt(hex.slice(1), 16);
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const c = (shift: number) => {
      const v = (n >> shift) & 255;
      return Math.trunc(v + (255 - v) * k)
        .toString(16)
        .padStart(2, '0');
    };
    const out = `#${c(16)}${c(8)}${c(0)}`;
    if (contrastRatio(out, ground) >= min) return out;
  }
  return '#ffffff';
}

/** The crease across the number, in per cent of the number's box: from its foot to its top, as on the website. */
const FOOT: readonly [number, number] = [18, 130];
const TOP: readonly [number, number] = [74, -30];
/** How far the tone's box reaches past the number's on every side, in per cent of the number's box. */
const FRAME = 3000;

/**
 * The fold through the number: the crease's line, and the part past it (to its right) as a polygon whose first and
 * last points lie on that line far beyond the number, so the band turns lighter exactly along the crease, whatever the
 * number. Both in per cent of the number's box.
 */
export function creaseFold(): {
  line: [readonly [number, number], readonly [number, number]];
  tone: [number, number][];
} {
  const d = [TOP[0] - FOOT[0], TOP[1] - FOOT[1]] as const;
  const k = 12;
  const far: [number, number] = [TOP[0] + k * d[0], TOP[1] + k * d[1]];
  const near: [number, number] = [FOOT[0] - k * d[0], FOOT[1] - k * d[1]];
  return {
    line: [FOOT, TOP],
    tone: [far, [far[0] + 5000, far[1]], [near[0] + 5000, near[1]], near],
  };
}

const pc = (v: number) => `${Number(v.toFixed(3))}%`;

/** The tone's box and clip, as an inline style: the box reaches FRAME per cent past the number's on every side. */
function toneStyle(colour: string): string {
  const size = 100 + 2 * FRAME;
  const points = creaseFold()
    .tone.map(([x, y]) => `${pc(((x + FRAME) / size) * 100)} ${pc(((y + FRAME) / size) * 100)}`)
    .join(',');
  return `left:-${FRAME}%;top:-${FRAME}%;width:${size}%;height:${size}%;background:${colour};clip-path:polygon(${points})`;
}

/** The number, set twice and cut along the crease, the far copy in `past`; with `tone`, the band past it lighter. */
export function creaseNumber(
  number: string,
  opts: { line: [string, string, string]; tone?: string; id?: string },
): string {
  const n = esc(number);
  const id = opts.id ?? 'crease';
  const [a, b, c] = opts.line;
  const [fx, fy] = FOOT;
  const [tx, ty] = TOP;
  // the line's own box runs from 30% above the number to 30% below it, so its points are moved and scaled to fit
  const y = (v: number) => ((v + 30) / 160) * 100;
  return `<div class="fold">${opts.tone ? `<span class="tone" style="${toneStyle(opts.tone)}"></span>` : ''}<p class="t s near">${n}</p><p class="t s past" aria-hidden="true">${n}</p><svg class="crease" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="${fx}" y1="${y(fy)}" x2="${tx}" y2="${y(ty)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}" stop-opacity="0"/><stop offset=".2" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset=".85" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><line x1="${fx}" y1="${y(fy)}" x2="${tx}" y2="${y(ty)}" stroke="url(#${id})" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg></div>`;
}

/** The CSS for creaseNumber: the two copies cut along the same line the crease is drawn on. */
export function creaseCss(sizePt: number, near: string, past: string): string {
  const [fx, fy] = FOOT;
  const [tx, ty] = TOP;
  return `.fold{position:relative;display:inline-block;max-width:100%}
.fold .t{font-family:'Sora',sans-serif;font-weight:700;font-size:${sizePt}pt;line-height:.95;letter-spacing:-.045em;white-space:nowrap;margin:0;padding:.08em .1em .14em 0;color:${near}}
.fold .near{clip-path:polygon(-30% -30%,${tx}% ${ty}%,${fx}% ${fy}%,-30% 130%)}
.fold .past{position:absolute;inset:0;color:${past};clip-path:polygon(${tx}% ${ty}%,130% -30%,130% 130%,${fx}% ${fy}%)}
.fold .crease{position:absolute;left:0;top:-30%;width:100%;height:160%;overflow:visible}
.fold .tone{position:absolute;z-index:-1}`;
}
