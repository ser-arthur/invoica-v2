import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  allocate,
  divRound,
  formatMoney,
  parseMoney,
  retypeForCurrency,
  rescaleMinor,
  rescaleMinorHalfUp,
  sumMinor,
  toDecimalString,
} from '../src/money';

describe('divRound', () => {
  const cases: [bigint, bigint, 'half-up' | 'half-even' | 'down', bigint][] = [
    [625n, 100n, 'half-up', 6n],
    [650n, 100n, 'half-up', 7n],
    [649n, 100n, 'half-up', 6n],
    [-650n, 100n, 'half-up', -7n],
    [-649n, 100n, 'half-up', -6n],
    [650n, 100n, 'half-even', 6n],
    [750n, 100n, 'half-even', 8n],
    [651n, 100n, 'half-even', 7n],
    [-650n, 100n, 'half-even', -6n],
    [699n, 100n, 'down', 6n],
    [-699n, 100n, 'down', -6n],
    [600n, 100n, 'down', 6n],
  ];
  it.each(cases)('%s / %s with %s is %s', (n, d, mode, expected) => {
    expect(divRound(n, d, mode)).toBe(expected);
  });

  it('refuses a zero or negative denominator', () => {
    expect(() => divRound(1n, 0n, 'half-up')).toThrow();
    expect(() => divRound(1n, -1n, 'half-up')).toThrow();
  });

  it('never moves more than one unit from the exact result', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -(10n ** 15n), max: 10n ** 15n }),
        fc.bigInt({ min: 1n, max: 10n ** 9n }),
        (n, d) => {
          for (const mode of ['half-up', 'half-even', 'down'] as const) {
            const q = divRound(n, d, mode);
            const diff = q * d - n;
            expect(diff < 0n ? -diff : diff).toBeLessThan(d);
          }
        },
      ),
    );
  });
});

describe('allocate', () => {
  it('splits by weight and keeps every unit', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(1000, [3333, 1000])).toEqual([769, 231]);
    expect(allocate(-100, [1, 1, 1])).toEqual([-34, -33, -33]);
    expect(allocate(5, [0, 0])).toEqual([3, 2]);
    expect(allocate(0, [])).toEqual([]);
  });

  it('refuses negative weights and a non-zero total with no parts', () => {
    expect(() => allocate(5, [])).toThrow();
    expect(() => allocate(5, [1, -1])).toThrow();
  });

  it('always adds back up to the total, and each part is within one unit of its exact share', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10_000_000, max: 10_000_000 }),
        fc.array(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 1, maxLength: 30 }),
        (total, weights) => {
          const parts = allocate(total, weights);
          expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
          const sum = weights.reduce((a, b) => a + b, 0);
          if (sum > 0) {
            parts.forEach((p, i) => {
              const exact = (total * (weights[i] ?? 0)) / sum;
              expect(Math.abs(p - exact)).toBeLessThan(1);
            });
          }
        },
      ),
    );
  });
});

describe('sumMinor', () => {
  it('adds whole amounts and refuses fractions', () => {
    expect(sumMinor([1, 2, 3])).toBe(6);
    expect(() => sumMinor([0.1, 0.2])).toThrow();
  });
});

describe('formatting', () => {
  it('writes minor units as a decimal with the currency exponent', () => {
    expect(toDecimalString(1250, 'GBP')).toBe('12.50');
    expect(toDecimalString(5, 'GBP')).toBe('0.05');
    expect(toDecimalString(-5, 'GBP')).toBe('-0.05');
    expect(toDecimalString(1500, 'JPY')).toBe('1500');
    expect(toDecimalString(1234, 'KWD')).toBe('1.234');
  });

  it('formats for people in British English', () => {
    expect(formatMoney(1313, 'GBP')).toBe('£13.13');
    expect(formatMoney(123456789, 'GBP')).toBe('£1,234,567.89');
    expect(formatMoney(-2000, 'GBP')).toBe('-£20.00');
    expect(formatMoney(1500, 'JPY')).toBe('¥1,500');
    expect(formatMoney(1250, 'USD')).toBe('$12.50');
    expect(formatMoney(1250, 'GBP', { display: 'none' })).toBe('12.50');
  });

  it('formats large amounts exactly, with no floating-point drift', () => {
    expect(formatMoney(900719925474099, 'GBP')).toBe('£9,007,199,254,740.99');
  });

  it('refuses an unsupported currency', () => {
    expect(() => formatMoney(1, 'XYZ')).toThrow();
  });
});

describe('parseMoney', () => {
  const cases: [string, string, number | null][] = [
    ['12.5', 'GBP', 1250],
    ['12.50', 'GBP', 1250],
    ['1,234.56', 'GBP', 123456],
    [' 40 ', 'GBP', 4000],
    ['.5', 'GBP', 50],
    ['-3', 'GBP', -300],
    ['12.345', 'GBP', null],
    ['1,23.00', 'GBP', null],
    ['abc', 'GBP', null],
    ['', 'GBP', null],
    ['.', 'GBP', null],
    ['1500', 'JPY', 1500],
    ['1.5', 'JPY', null],
    ['1.234', 'KWD', 1234],
    // More places than the currency has are refused, zeros too: "1.500" is how much of Europe writes 1,500.
    ['1.500', 'GBP', null],
    ['1.500', 'EUR', null],
    ['100.00', 'JPY', null],
  ];
  it.each(cases)('reads %j in %s as %s', (input, code, expected) => {
    expect(parseMoney(input, code)).toBe(expected);
  });

  it('reads back exactly what it writes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1e12, max: 1e12 }),
        fc.constantFrom('GBP', 'JPY', 'KWD', 'GHS'),
        (n, code) => {
          expect(parseMoney(toDecimalString(n, code), code)).toBe(n);
        },
      ),
    );
  });
});

describe('retypeForCurrency', () => {
  it.each([
    ['100.00', 'EUR', 'JPY', '100'],
    ['1,250.50', 'GBP', 'KWD', '1250.500'],
    ['100', 'JPY', 'EUR', '100.00'],
    ['100.50', 'EUR', 'JPY', '100.50'],
    ['abc', 'EUR', 'JPY', 'abc'],
    ['', 'EUR', 'JPY', ''],
    ['9007199254740991', 'JPY', 'KWD', '9007199254740991'],
  ])('%j typed in %s reads in %s as %j', (text, from, to, expected) => {
    expect(retypeForCurrency(text, from, to)).toBe(expected);
  });

  it('keeps the same figure whenever it can, and leaves anything else as typed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e12 }),
        fc.constantFrom('GBP', 'JPY', 'KWD'),
        fc.constantFrom('GBP', 'JPY', 'KWD'),
        (n, from, to) => {
          const text = toDecimalString(n, from);
          const out = retypeForCurrency(text, from, to);
          const back = parseMoney(out, to);
          if (back !== null) expect(retypeForCurrency(out, to, from)).toBe(text);
          else expect(out).toBe(text);
        },
      ),
    );
  });
});

describe('rescaleMinor', () => {
  it.each([
    [50_000, 'GBP', 'EUR', 50_000],
    [50_000, 'GBP', 'JPY', 500],
    [50_000, 'GBP', 'KWD', 500_000],
    [500, 'JPY', 'GBP', 50_000],
    [1234, 'GBP', 'JPY', null],
    [0, 'GBP', 'JPY', 0],
  ])('%i in %s, written in %s, is %s', (amount, from, to, expected) => {
    expect(rescaleMinor(amount, from, to)).toBe(expected);
  });

  it('keeps the figure, or gives null when the other currency cannot write it', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e12 }),
        fc.constantFrom('GBP', 'JPY', 'KWD'),
        fc.constantFrom('GBP', 'JPY', 'KWD'),
        (n, from, to) => {
          const out = rescaleMinor(n, from, to);
          if (out === null) return;
          expect(toDecimalString(out, to)).toBe(retypeForCurrency(toDecimalString(n, from), from, to));
          expect(rescaleMinor(out, to, from)).toBe(n);
        },
      ),
    );
  });
});

describe('rescaleMinorHalfUp', () => {
  it.each([
    [1234, 'GBP', 'JPY', 12],
    [1250, 'GBP', 'JPY', 13],
    [50_000, 'GBP', 'JPY', 500],
    [500, 'JPY', 'GBP', 50_000],
    [12_345, 'KWD', 'GBP', 1235],
  ])('%i in %s, written in %s to the nearest unit, is %i', (amount, from, to, expected) => {
    expect(rescaleMinorHalfUp(amount, from, to)).toBe(expected);
  });
});
