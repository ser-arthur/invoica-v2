import { describe, expect, it } from 'vitest';
import { SHOWCASE, showcaseSnapshot } from '../src';

// docs/specs/website-showcase.md, the owner's notes of 26 October: the shelf's order and Marquee's colours.

describe('the website showcase', () => {
  it('runs Riso, Billboard, Marquee, Signature, Atelier and Trade', () => {
    expect(SHOWCASE.map((entry) => entry.template)).toEqual([
      'riso',
      'billboard',
      'marquee',
      'signature',
      'atelier',
      'trade',
    ]);
  });

  it('shows Marquee in lime with navy', () => {
    const { seller } = showcaseSnapshot('marquee');
    expect(seller.brandColour.toLowerCase()).toBe('#c5f03c');
    expect(seller.accentColour?.toLowerCase()).toBe('#1b2559');
  });

  it('gives a visitor’s colour both of Marquee’s colours, the second worked out from it', () => {
    const { seller } = showcaseSnapshot('marquee', { colour: '#1d3c5a' });
    expect(seller.brandColour).toBe('#1d3c5a');
    expect(seller.accentColour).toBeUndefined();
  });
});
