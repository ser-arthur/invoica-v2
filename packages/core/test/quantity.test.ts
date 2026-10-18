import { describe, expect, it } from 'vitest';
import { formatQuantity, lineAmount, parseQuantity, quantityToString } from '../src/quantity';

describe('quantities', () => {
  it.each([
    ['1', 1000],
    ['1.5', 1500],
    ['0.4', 400],
    ['0.125', 125],
    ['.5', 500],
    ['1,000', 1_000_000],
    ['1.2345', null],
    ['-1', null],
    ['', null],
    ['x', null],
  ] as const)('reads %j as %s', (input, expected) => {
    expect(parseQuantity(input)).toBe(expected);
  });

  it('writes thousandths back without trailing zeros', () => {
    expect(quantityToString(1500)).toBe('1.5');
    expect(quantityToString(1000)).toBe('1');
    expect(quantityToString(125)).toBe('0.125');
    expect(formatQuantity(1_234_500)).toBe('1,234.5');
  });
});

describe('lineAmount', () => {
  it('multiplies exactly and rounds once', () => {
    expect(lineAmount(1500, 4000, 'half-up')).toBe(6000);
    expect(lineAmount(400, 10000, 'half-up')).toBe(4000);
    expect(lineAmount(3000, 3333, 'half-up')).toBe(9999);
    expect(lineAmount(1500, 1, 'half-up')).toBe(2);
    expect(lineAmount(1500, 1, 'half-even')).toBe(2);
    expect(lineAmount(2500, 1, 'half-even')).toBe(2);
    expect(lineAmount(1500, 1, 'down')).toBe(1);
  });

  it('refuses a zero quantity and a negative price', () => {
    expect(() => lineAmount(0, 100, 'half-up')).toThrow(/Quantity/);
    expect(() => lineAmount(1000, -1, 'half-up')).toThrow(/Unit price/);
    expect(() => lineAmount(1.5, 100, 'half-up')).toThrow();
  });
});
