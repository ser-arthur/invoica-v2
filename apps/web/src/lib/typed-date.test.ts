import { describe, expect, it } from 'vitest';
import { addDays, addMonths, monthGrid, readTypedDate, showDate } from './typed-date';

// docs/specs/form-errors-and-controls.md, "Dates" and criterion 11.

describe('readTypedDate', () => {
  it('reads the ways people write a date, day first', () => {
    for (const typed of [
      '31/12/2026',
      '31-12-2026',
      '31.12.2026',
      '31/12/26',
      '31 Dec 2026',
      '31 dec 2026',
      '31 December 2026',
      'Thursday 31 December 2026',
      '31st December 2026',
      '2026-12-31',
      ' 31 / 12 / 2026 ',
    ])
      expect(readTypedDate(typed), typed).toBe('2026-12-31');
    expect(readTypedDate('1/2/2027')).toBe('2027-02-01');
    expect(readTypedDate('9 Sept 2026')).toBe('2026-09-09');
  });

  it('refuses what is not a real date', () => {
    for (const typed of [
      '31/02/2026',
      '12/31/2026',
      '0/1/2026',
      'tomorrow',
      '2026-13-01',
      '31 Smarch 2026',
      '31/12',
      '',
    ])
      expect(readTypedDate(typed), typed).toBeNull();
    expect(readTypedDate('29/02/2028')).toBe('2028-02-29');
    expect(readTypedDate('29/02/2027')).toBeNull();
  });
});

describe('showDate', () => {
  it('shows a calendar date as day, short month and year', () => {
    expect(showDate('2026-12-31')).toBe('31 Dec 2026');
    expect(showDate('2027-02-01')).toBe('1 Feb 2027');
    expect(showDate('')).toBe('');
  });
});

describe('the calendar', () => {
  it('moves by days and months, keeping to the end of a shorter month', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-01-15', -13)).toBe('2024-12-15');
  });

  it('lays a month out in weeks from Monday, with the days around it to fill the weeks', () => {
    const weeks = monthGrid(2026, 12);
    expect(weeks[0]![0]).toBe('2026-11-30');
    expect(weeks[0]![1]).toBe('2026-12-01');
    expect(weeks.at(-1)!.at(-1)).toBe('2027-01-03');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(monthGrid(2026, 2)[0]![6]).toBe('2026-02-01');
  });
});
