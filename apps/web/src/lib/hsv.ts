/**
 * Colour codes as the colour picker moves them (docs/specs/form-errors-and-controls.md, "Colours"): hue from 0 to 360
 * on the strip, and shade (saturation) and brightness (value) from 0 to 1 across the square.
 */
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

/** A typed colour code, with or without its #, in three or six digits; null when it is not one. */
export function readHex(typed: string): string | null {
  const t = typed.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{6}$/.test(t)) return `#${t}`;
  if (/^[0-9a-f]{3}$/.test(t)) return `#${[...t].map((c) => c + c).join('')}`;
  return null;
}

export function hexToHsv(hex: string): Hsv {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

/** A channel from 0 to 1 as two hex digits, to the nearest step (a colour, not an amount of money). */
const channel = (x: number) =>
  Math.trunc(Math.min(1, Math.max(0, x)) * 255 + 0.5)
    .toString(16)
    .padStart(2, '0');

export function hsvToHex({ h, s, v }: Hsv): string {
  const hue = (((h % 360) + 360) % 360) / 60;
  const f = (k: number) => {
    const p = (k + hue) % 6;
    return v - v * s * Math.max(0, Math.min(p, 4 - p, 1));
  };
  return `#${channel(f(5))}${channel(f(3))}${channel(f(1))}`;
}
