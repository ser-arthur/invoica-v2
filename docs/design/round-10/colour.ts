import { contrastRatio } from '../../../packages/core/src/index';

/** Mixes two #rrggbb colours: `t` of `b` into `a`. */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((c, i) => Math.trunc(c + (y[i]! - c) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** The business's colour lifted towards white until it reads on a dark ground (3 to 1 at least). */
export function onDark(brand: string, ground: string, min = 3): string {
  for (let t = 0; t <= 1; t += 0.05) {
    const c = mix(brand, '#ffffff', t);
    if (contrastRatio(c, ground) >= min) return c;
  }
  return '#ffffff';
}
