import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';

describe('CSV export', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('Harrow, Vale')).toBe('"Harrow, Vale"');
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvCell('a\nb')).toBe('"a\nb"');
  });

  it('stops text being run as a spreadsheet formula, but keeps negative numbers', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-12.50')).toBe('-12.50');
  });

  it('builds rows with a header', () => {
    expect(toCsv(['a', 'b'], [[1, null]])).toBe('a,b\r\n1,\r\n');
  });
});
