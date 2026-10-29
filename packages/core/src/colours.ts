/**
 * Colours for documents: WCAG contrast, and the second colour some templates make from a business's one brand colour.
 * Colours are `#rrggbb` hex strings. Hue and lightness are worked out in OKLCH, which follows how bright and how
 * colourful people see a colour to be.
 */

function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB channel, 0 to 255, to linear light, 0 to 1. */
function linear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2 relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** OKLCH: lightness from 0 to 1, chroma from 0, hue in degrees. */
function oklch(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

/** A colour's OKLCH hue, in degrees. */
export function hueOf(hex: string): number {
  return oklch(hex)[2];
}

/** A colour's OKLCH chroma: 0 for a grey, about 0.1 to 0.3 for a strong colour. */
export function chromaOf(hex: string): number {
  return oklch(hex.toLowerCase())[1];
}

/** sRGB, linear 0 to 1, to a hex channel. */
function encode(x: number): string {
  const v = Math.min(1, Math.max(0, x));
  const e = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.trunc(e * 255 + 0.5)
    .toString(16)
    .padStart(2, '0');
}

/** OKLCH to hex, taking the chroma down until the colour can be shown in sRGB. */
function fromOklch(L: number, C: number, H: number): string {
  const h = (H * Math.PI) / 180;
  for (let c = C; c > -0.0001; c -= 0.005) {
    const a = Math.max(c, 0) * Math.cos(h);
    const b = Math.max(c, 0) * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    if (rgb.every((x) => x >= -0.0005 && x <= 1.0005)) return `#${rgb.map(encode).join('')}`;
  }
  return L > 0.5 ? '#ffffff' : '#000000';
}

/**
 * The second colour for a brand colour: the opposite hue, deep or pale, whichever stands out more against the brand
 * colour. A grey brand colour gets a grey. The contrast with the brand colour is always at least 3, enough for large
 * type; small text on the brand colour stays black or white.
 */
export function secondColour(brand: string): string {
  const hex = brand.toLowerCase();
  const [, chroma, hue] = oklch(hex);
  const opposite = (hue + 180) % 360;
  const deep = fromOklch(0.27, chroma < 0.02 ? 0 : 0.11, opposite);
  const pale = fromOklch(0.94, chroma < 0.02 ? 0 : 0.12, opposite);
  return contrastRatio(hex, deep) >= contrastRatio(hex, pale) ? deep : pale;
}

/**
 * A brand colour made light enough to read on a Night ground (docs/specs/invoice-templates.md, Signature's Night
 * accents): the colour at OKLCH lightness `lightness`, keeping its hue and at least `minChroma` of colourfulness, less
 * only where sRGB cannot show that much. A colour near grey (chroma under 0.03) stays grey, so it turns silver.
 */
export function liftForNight(brand: string, lightness: number, minChroma: number): string {
  const [, chroma, hue] = oklch(brand.toLowerCase());
  return fromOklch(lightness, chroma < 0.03 ? 0 : Math.max(chroma, minChroma), hue);
}

