import { describe, it, expect } from 'vitest';
import { addDays, formatTime, inRange, localDateString, startOfWeek } from './dates';

describe('localDateString', () => {
  it('uses local calendar components', () => {
    expect(localDateString(new Date(2026, 10, 23, 9, 30))).toBe('2026-11-23');
  });

  it('zero-pads single digit months and days', () => {
    expect(localDateString(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });

  /* The bug this file exists to prevent. Calgary is UTC-7, so an evening class
     has a UTC date one day ahead. toISOString() would file it under tomorrow
     and "Export today" would come back empty. */
  it('keeps an evening class on the day it was actually taught', () => {
    const evening = new Date(2026, 10, 23, 19, 30); // 7:30pm local
    expect(localDateString(evening)).toBe('2026-11-23');

    const utcWouldSay = evening.toISOString().slice(0, 10);
    if (evening.getTimezoneOffset() > 0) {
      // Only meaningful west of UTC, which is where the school is.
      expect(utcWouldSay).not.toBe('2026-11-23');
    }
  });

  it('handles the last day of a year', () => {
    expect(localDateString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('addDays', () => {
  it('goes back a day', () => {
    expect(addDays(-1, new Date(2026, 10, 23))).toBe('2026-11-22');
  });

  it('crosses a month boundary', () => {
    expect(addDays(1, new Date(2026, 10, 30))).toBe('2026-12-01');
  });
});

describe('startOfWeek', () => {
  it('returns Monday for a midweek date', () => {
    // 2026-11-25 is a Wednesday.
    expect(startOfWeek(new Date(2026, 10, 25))).toBe('2026-11-23');
  });

  it('treats Sunday as the end of the week, not the start', () => {
    // 2026-11-29 is a Sunday; its week began Monday the 23rd.
    expect(startOfWeek(new Date(2026, 10, 29))).toBe('2026-11-23');
  });

  it('returns the same day when given a Monday', () => {
    expect(startOfWeek(new Date(2026, 10, 23))).toBe('2026-11-23');
  });
});

describe('formatTime', () => {
  it('pads to HH:MM', () => {
    expect(formatTime(new Date(2026, 10, 23, 9, 4).getTime())).toBe('09:04');
  });
});

describe('inRange', () => {
  it('is inclusive at both ends', () => {
    expect(inRange('2026-11-23', '2026-11-23', '2026-11-27')).toBe(true);
    expect(inRange('2026-11-27', '2026-11-23', '2026-11-27')).toBe(true);
    expect(inRange('2026-11-28', '2026-11-23', '2026-11-27')).toBe(false);
  });
});
