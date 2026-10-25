import { existsSync, readFileSync } from 'node:fs';
/** Invented marks for the invented businesses, original drawings. The rest are drawn by make_logos.py into logos/. */

function spiral(cx: number, cy: number, turns: number, r: number): string {
  const pts: string[] = [];
  const n = 220;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const rr = r * t;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')}`;
}

export const LOGOS: Record<string, (brand: string) => string> = {
  // A cinnamon knot: a swirl in a bun.
  sticker: (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<circle cx="100" cy="100" r="96" fill="${b}"/>
<circle cx="100" cy="100" r="70" fill="#FFF3E6"/>
<path d="${spiral(100, 100, 3.1, 58)}" fill="none" stroke="#3A2320" stroke-width="10" stroke-linecap="round"/>
</svg>`,
  // Levels on a meter, the last one tipping into the red.
  marquee: (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<rect x="0" y="0" width="200" height="200" rx="34" fill="#141414"/>
<g fill="#F4F1EC"><rect x="34" y="104" width="18" height="62" rx="9"/><rect x="62" y="72" width="18" height="94" rx="9"/><rect x="90" y="40" width="18" height="126" rx="9"/><rect x="118" y="84" width="18" height="82" rx="9"/></g>
<rect x="146" y="58" width="18" height="108" rx="9" fill="${b}"/>
</svg>`,
  // A sprig: one stem, five leaves.
  atelier: (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<g fill="none" stroke="${b}" stroke-width="4.5" stroke-linecap="round">
<path d="M100 186 C 100 140, 96 100, 104 22"/>
</g>
<g fill="${b}">
<path d="M101 150 C 76 150, 58 136, 52 118 C 76 116, 94 128, 101 150 Z"/>
<path d="M100 120 C 124 120, 142 106, 148 88 C 124 86, 106 98, 100 120 Z"/>
<path d="M100 92 C 78 90, 64 74, 62 56 C 84 58, 98 72, 100 92 Z"/>
<path d="M102 64 C 120 62, 134 48, 136 32 C 118 34, 104 46, 102 64 Z"/>
<ellipse cx="104" cy="22" rx="7" ry="11"/>
</g></svg>`,
  // A plan: a square with an L-shaped room taken out.
  grid: (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<path d="M0 0 H200 V200 H0 Z M100 100 H200 V200 H100 Z" fill="#141414" fill-rule="evenodd"/>
<rect x="100" y="100" width="100" height="100" fill="${b}"/>
</svg>`,
  // Two bars, one shifted: parallax.
  mark: (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<path d="M58 20 H112 L84 180 H30 Z" fill="${b}"/>
<path d="M128 20 H182 L154 180 H100 Z" fill="${b}" opacity=".45"/>
</svg>`,
  // A thistle: the head, its spikes and two leaves.
  heritage: (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<g fill="${b}">
<path d="M100 196 C 98 160, 98 132, 100 112 L104 112 C 104 132, 104 160, 106 196 Z"/>
<path d="M100 170 C 76 168, 58 150, 50 128 C 64 132, 70 126, 74 136 C 80 128, 86 136, 88 142 C 94 140, 98 152, 100 170 Z"/>
<path d="M106 156 C 130 154, 148 136, 156 114 C 142 118, 136 112, 132 122 C 126 114, 120 122, 118 128 C 112 126, 108 138, 106 156 Z"/>
<path d="M72 92 C 72 74, 86 66, 103 66 C 120 66, 134 74, 134 92 C 134 104, 122 114, 103 114 C 84 114, 72 104, 72 92 Z"/>
</g>
<g stroke="#FFFFFF" stroke-width="2.4" opacity=".75"><path d="M80 80 L126 104 M80 104 L126 80 M90 70 L116 110 M116 70 L90 110"/></g>
<g fill="none" stroke="${b}" stroke-width="5" stroke-linecap="round">
<path d="M84 68 L72 22 M94 66 L88 14 M103 65 L103 10 M112 66 L118 14 M122 68 L134 22 M77 74 L58 38 M129 74 L148 38"/>
</g></svg>`,
  // Two halves of a circle, set level: the books balanced.
  statement: (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<path d="M94 12 A 88 88 0 0 0 94 188 Z" fill="${b}"/>
<path d="M106 12 A 88 88 0 0 1 106 188 Z" fill="${b}" opacity=".45"/>
<rect x="20" y="96" width="160" height="8" fill="#FFFFFF"/>
</svg>`,
};

/** A drawn logo from logos/<id>.svg when there is one (variants fall back to their template's), else the one above. */
export function logoFor(id: string, brand: string, variant = ''): string {
  const dir = new URL('./logos/', import.meta.url).pathname;
  const base = id.replace(/-[a-z0-9]+$/, '');
  for (const name of [`${id}${variant}`, `${base}${variant}`, id, base]) {
    if (existsSync(`${dir}${name}.svg`)) return readFileSync(`${dir}${name}.svg`, 'utf8').replaceAll('{BRAND}', brand);
  }
  return (LOGOS[id] ?? LOGOS[base]!)(brand);
}
