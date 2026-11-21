import { describe, it, expect } from 'vitest';
import { findDuplicates, parsePaste, parsePasteLine, swapNames } from './parsePaste';

const one = (line: string) => parsePasteLine(line);

describe('parsePasteLine', () => {
  it('reads "First Last"', () => {
    expect(one('Bea Ruiz')).toEqual({ firstName: 'Bea', lastName: 'Ruiz' });
  });

  it('reads "Last, First"', () => {
    expect(one('Ruiz, Bea')).toEqual({ firstName: 'Bea', lastName: 'Ruiz' });
  });

  it('reads tab separated "First<TAB>Last"', () => {
    expect(one('Bea\tRuiz')).toEqual({ firstName: 'Bea', lastName: 'Ruiz' });
  });

  it('reads a third tab column as the student number', () => {
    expect(one('Bea\tRuiz\t123456')).toEqual({
      firstName: 'Bea',
      lastName: 'Ruiz',
      studentNumber: '123456',
    });
  });

  it('treats the first token of a three-word name as the first name', () => {
    expect(one('Mary Jane Watson')).toEqual({
      firstName: 'Mary',
      lastName: 'Jane Watson',
    });
  });

  it('keeps accents', () => {
    expect(one('José Torres')).toEqual({ firstName: 'José', lastName: 'Torres' });
  });

  it('keeps apostrophes', () => {
    expect(one("Cam O'Neil")).toEqual({ firstName: 'Cam', lastName: "O'Neil" });
    expect(one("O'Neil, Cam")).toEqual({ firstName: 'Cam', lastName: "O'Neil" });
  });

  it('keeps hyphens', () => {
    expect(one('Mary-Kate Delacroix')).toEqual({
      firstName: 'Mary-Kate',
      lastName: 'Delacroix',
    });
  });

  it('collapses extra spaces', () => {
    expect(one('   Bea    Ruiz   ')).toEqual({ firstName: 'Bea', lastName: 'Ruiz' });
  });

  it('handles a single name', () => {
    expect(one('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' });
  });

  it('ignores a blank line', () => {
    expect(one('')).toBeNull();
    expect(one('    ')).toBeNull();
    expect(one('\t\t')).toBeNull();
  });

  it('falls back to space splitting when a tab row has one filled cell', () => {
    expect(one('Bea Ruiz\t')).toEqual({ firstName: 'Bea', lastName: 'Ruiz' });
  });

  /* A spreadsheet with a blank column between the name and the number: the
     number is further along the row and must not be dropped. */
  it('keeps the student number when a middle column is blank', () => {
    expect(one('Bea Ruiz\t\t123456')).toEqual({
      firstName: 'Bea',
      lastName: 'Ruiz',
      studentNumber: '123456',
    });
  });

  it('does not mistake a blank trailing column for a number', () => {
    expect(one('Bea Ruiz\t\t')).toEqual({ firstName: 'Bea', lastName: 'Ruiz' });
  });

  it('reads a trailing number after "Last, First"', () => {
    expect(one('Ruiz, Bea, 123456')).toEqual({
      firstName: 'Bea',
      lastName: 'Ruiz',
      studentNumber: '123456',
    });
  });
});

describe('parsePaste', () => {
  it('parses a whole roster and skips blank lines', () => {
    const text = `Bea Ruiz

José Torres
O'Neil, Cam
Mary-Kate Delacroix`;

    const { students } = parsePaste(text);
    expect(students).toHaveLength(4);
    expect(students.map((s) => s.lastName)).toEqual([
      'Ruiz',
      'Torres',
      "O'Neil",
      'Delacroix',
    ]);
  });

  it('handles Windows line endings', () => {
    const { students } = parsePaste('Bea Ruiz\r\nJosé Torres\r\n');
    expect(students).toHaveLength(2);
  });

  it('handles a spreadsheet paste with numbers', () => {
    const { students } = parsePaste('Bea\tRuiz\t111\nJosé\tTorres\t222');
    expect(students).toEqual([
      { firstName: 'Bea', lastName: 'Ruiz', studentNumber: '111' },
      { firstName: 'José', lastName: 'Torres', studentNumber: '222' },
    ]);
  });

  it('flags duplicate names', () => {
    const { duplicates } = parsePaste('Bea Ruiz\nBea Ruiz\nJosé Torres');
    expect(duplicates).toEqual(['bea ruiz']);
  });

  it('returns nothing for empty input', () => {
    expect(parsePaste('').students).toEqual([]);
    expect(parsePaste('\n\n\n').students).toEqual([]);
  });
});

describe('swapNames', () => {
  it('swaps first and last for every row', () => {
    const swapped = swapNames([
      { firstName: 'Ruiz', lastName: 'Bea' },
      { firstName: 'Torres', lastName: 'José', studentNumber: '1' },
    ]);
    expect(swapped).toEqual([
      { firstName: 'Bea', lastName: 'Ruiz' },
      { firstName: 'José', lastName: 'Torres', studentNumber: '1' },
    ]);
  });
});

describe('findDuplicates', () => {
  it('is case insensitive', () => {
    expect(
      findDuplicates([
        { firstName: 'Bea', lastName: 'Ruiz' },
        { firstName: 'bea', lastName: 'RUIZ' },
      ]),
    ).toEqual(['bea ruiz']);
  });

  it('returns nothing when all names are distinct', () => {
    expect(
      findDuplicates([
        { firstName: 'Bea', lastName: 'Ruiz' },
        { firstName: 'José', lastName: 'Torres' },
      ]),
    ).toEqual([]);
  });
});
