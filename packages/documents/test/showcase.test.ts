import { describe, expect, it } from 'vitest';
import { RANGE, SHOWCASE, showcaseSnapshot, TEMPLATE_LIST } from '../src';

// docs/specs/website-showcase.md, the owner's notes of 26 October: the shelf's order and Marquee's colours.

describe('the website showcase', () => {
  it('runs Riso, Marquee, Billboard, Signature, Atelier and Trade', () => {
    expect(SHOWCASE.map((entry) => entry.template)).toEqual([
      'riso',
      'marquee',
      'billboard',
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

  // The owner's notes of 27 October, 13:46: every template in the range shows a business of its own kind.
  it('gives every template in the picker its own invented business and logo, in the picker’s order', () => {
    expect(RANGE.map((r) => r.template)).toEqual(TEMPLATE_LIST.map((t) => t.id));
    const names = RANGE.map((r) => r.business);
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain('Linden & Rowe Studio');
    for (const r of RANGE) {
      expect(r.logo, r.template).toMatch(/^data:image\/svg\+xml,/);
      expect(showcaseSnapshot(r.template).seller.name).toBe(r.business);
    }
    for (const s of SHOWCASE) expect(RANGE.find((r) => r.template === s.template)?.business).toBe(s.business);
  });

  it('shows Sticker as a bakery in pink, Grid in maroon with black, and Ticket in orange', () => {
    expect(showcaseSnapshot('sticker').seller).toMatchObject({
      name: 'Crumb & Kettle',
      brandColour: '#E8436F',
    });
    expect(showcaseSnapshot('grid').seller).toMatchObject({
      name: 'Hollis Lane Architects',
      brandColour: '#951D30',
    });
    expect(showcaseSnapshot('ticket').seller).toMatchObject({
      name: 'Hartley Cycle Works',
      brandColour: '#D9482B',
    });
  });

  it('numbers Grid’s invoice in the INV form, under the plan mark from the first template rounds', () => {
    expect(showcaseSnapshot('grid').number).toBe('INV-0047');
    const logo = decodeURIComponent(RANGE.find((r) => r.template === 'grid')!.logo);
    expect(logo).toContain('M0 0 H200 V200 H0 Z M100 100 H200 V200 H100 Z');
    expect(logo).toContain('<rect x="100" y="100" width="100" height="100" fill="#951D30"/>');
  });
});
