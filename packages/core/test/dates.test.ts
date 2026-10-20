import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  compareDates,
  daysBetween,
  formatBusinessDate,
  isBusinessDate,
  isValidTimeZone,
  todayIn,
} from '../src/dates';

describe('business dates', () => {
  it('accepts only real calendar dates', () => {
    expect(isBusinessDate('2026-10-18')).toBe(true);
    expect(isBusinessDate('2028-02-29')).toBe(true);
    expect(isBusinessDate('2026-02-29')).toBe(false);
    expect(isBusinessDate('2026-13-01')).toBe(false);
    expect(isBusinessDate('18/10/2026')).toBe(false);
  });

  it('adds days across month ends and leap days', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-12-31', 30)).toBe('2027-01-30');
    expect(addDays('2026-10-25', 30)).toBe('2026-11-24');
  });

  it('adds months and clamps the day to the end of a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15');
  });

  it('counts and compares days', () => {
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30);
    expect(daysBetween('2026-10-31', '2026-10-01')).toBe(-30);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(compareDates('2026-10-01', '2026-10-02')).toBe(-1);
  });

  it('finds today in the organisation time zone across clock changes', () => {
    // London leaves summer time at 01:00 UTC on 25 October 2026.
    expect(todayIn('Europe/London', new Date('2026-10-24T23:30:00Z'))).toBe('2026-10-25');
    expect(todayIn('Europe/London', new Date('2026-12-31T23:30:00Z'))).toBe('2026-12-31');
    // London enters summer time at 01:00 UTC on 29 March 2026.
    expect(todayIn('Europe/London', new Date('2026-03-28T23:30:00Z'))).toBe('2026-03-28');
    expect(todayIn('Africa/Accra', new Date('2026-10-24T23:30:00Z'))).toBe('2026-10-24');
    expect(todayIn('America/New_York', new Date('2026-10-01T02:00:00Z'))).toBe('2026-09-30');
  });

  it('formats without shifting the date', () => {
    expect(formatBusinessDate('2026-10-01')).toBe('1 Oct 2026');
    expect(formatBusinessDate('2026-10-01', 'long')).toBe('1 October 2026');
    expect(formatBusinessDate('2026-10-01', 'short')).toBe('01/10/2026');
  });

  it('checks time zone names', () => {
    expect(isValidTimeZone('Europe/London')).toBe(true);
    expect(isValidTimeZone('Mars/Base')).toBe(false);
    // A bare offset reads the other way in the database (POSIX), so only region names are accepted.
    for (const offset of ['+05:30', '-03', 'GMT+5', 'UTC+1'])
      expect(isValidTimeZone(offset), offset).toBe(false);
    expect(isValidTimeZone('Etc/GMT-14')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
  });
});
