import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { chromaOf, contrastRatio, hueOf, liftForNight, secondColour } from '../src/colours';

const HEX = /^#[0-9a-f]{6}$/;
const SET = [
  '#17795a', // Invoica's green
  '#FF7A1A', // tangerine
  '#C6F03A', // lime
  '#5B2BFF', // violet
  '#C52A55', // rose
  '#951D30', // maroon
  '#FFC20E', // yellow
  '#1D7BDD', // a mid blue, about the hardest case
  '#000000',
  '#ffffff',
  '#777777',
];

describe('the second colour', () => {
  it('is a hex colour', () => {
    for (const c of SET) expect(secondColour(c)).toMatch(HEX);
  });

  it('stands out against the brand colour enough for large type, for a fixed set of colours', () => {
    for (const c of SET) expect(contrastRatio(c, secondColour(c))).toBeGreaterThanOrEqual(3);
  });

  it('stands out against any brand colour enough for large type', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffff }), (n) => {
        const c = `#${n.toString(16).padStart(6, '0')}`;
        const second = secondColour(c);
        expect(second).toMatch(HEX);
        expect(contrastRatio(c, second)).toBeGreaterThanOrEqual(3);
      }),
      { numRuns: 2000 },
    );
  });

  it('is deep on a light colour and pale on a dark one', () => {
    expect(contrastRatio(secondColour('#C6F03A'), '#000000')).toBeLessThan(3);
    expect(contrastRatio(secondColour('#5B2BFF'), '#ffffff')).toBeLessThan(3);
  });

  it('takes the opposite hue of a colourful brand colour', () => {
    for (const c of ['#FF7A1A', '#C6F03A', '#5B2BFF', '#C52A55', '#17795a']) {
      const gap = Math.abs(hueOf(secondColour(c)) - hueOf(c));
      expect(Math.min(gap, 360 - gap)).toBeGreaterThan(160);
    }
  });

  it('reads the brand colour in either case and gives the same answer each time', () => {
    expect(secondColour('#ff7a1a')).toBe(secondColour('#FF7A1A'));
    expect(secondColour('#17795a')).toBe(secondColour('#17795a'));
  });
});

describe('contrast', () => {
  it('follows WCAG 2: black on white is 21, a colour on itself is 1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#17795a', '#17795a')).toBeCloseTo(1, 5);
    expect(contrastRatio('#ffffff', '#767676')).toBeCloseTo(4.54, 2);
  });
});

// docs/specs/invoice-templates.md, "Signature's Night accents in the business's colour", criteria 26 and 27.
describe('a brand colour lifted for Night', () => {
  const NIGHT = '#09191c';
  const channelsOf = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const steps = [0x00, 0x33, 0x66, 0x99, 0xcc, 0xff];
  const grid = steps.flatMap((r) =>
    steps.flatMap((g) =>
      steps.map((b) => `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`),
    ),
  );
  const angle = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

  it('is a hex colour', () => {
    expect(liftForNight('#d9480f', 0.8, 0.11)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('keeps the hue and reads on Night, for every colour on a grid across the range (26)', () => {
    for (const brand of grid) {
      const accent = liftForNight(brand, 0.8, 0.11);
      const light = liftForNight(brand, 0.87, 0.1);
      const deep = liftForNight(brand, 0.68, 0.13);
      expect(contrastRatio(accent, NIGHT), brand).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(light, NIGHT), brand).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(deep, NIGHT), brand).toBeGreaterThanOrEqual(3);
      if (chromaOf(brand) >= 0.03) {
        for (const c of [accent, light, deep])
          expect(angle(hueOf(c), hueOf(brand)), `${brand} ${c}`).toBeLessThan(3);
      }
    }
  });

  it('is at least as colourful as asked when the colour allows it', () => {
    for (const brand of ['#5b6f63', '#1d3c5a', '#5b2a4e', '#d9480f']) {
      expect(chromaOf(liftForNight(brand, 0.8, 0.11)), brand).toBeGreaterThanOrEqual(0.105);
    }
  });

  it('turns a colour near grey to silver (27)', () => {
    for (const brand of ['#2f3a3d', '#808080', '#000000', '#ffffff', '#3a3a3c']) {
      for (const lightness of [0.8, 0.87, 0.68]) {
        const [r, g, b] = channelsOf(liftForNight(brand, lightness, 0.11)) as [number, number, number];
        expect(Math.max(r, g, b) - Math.min(r, g, b), brand).toBeLessThanOrEqual(2);
      }
    }
  });
});
