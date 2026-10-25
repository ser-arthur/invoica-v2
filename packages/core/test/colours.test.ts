import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { contrastRatio, hueOf, secondColour } from '../src/colours';

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
