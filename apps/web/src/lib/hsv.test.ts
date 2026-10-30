import { describe, expect, it } from 'vitest';
import { hexToHsv, hsvToHex, readHex } from './hsv';

// docs/specs/form-errors-and-controls.md, "Colours" and criterion 12.

describe('the colour picker’s colours', () => {
  it('turns a colour code into hue, shade and brightness and back without changing it', () => {
    for (const hex of [
      '#17795a',
      '#d9480f',
      '#1d3c5a',
      '#5b2a4e',
      '#f2d33b',
      '#000000',
      '#ffffff',
      '#808080',
    ])
      expect(hsvToHex(hexToHsv(hex)), hex).toBe(hex);
  });

  it('places the primaries where the strip and square expect them', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv('#00ff00')).toEqual({ h: 120, s: 1, v: 1 });
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe('#0000ff');
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe('#ff0000');
  });

  it('reads a typed code with or without its #, in three or six digits', () => {
    expect(readHex('#17795A')).toBe('#17795a');
    expect(readHex('17795a')).toBe('#17795a');
    expect(readHex(' #abc ')).toBe('#aabbcc');
    for (const typed of ['', '#12345', 'green', '#gggggg', '#1234567'])
      expect(readHex(typed), typed).toBeNull();
  });
});
