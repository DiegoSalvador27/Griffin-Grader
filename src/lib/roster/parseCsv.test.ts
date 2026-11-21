import { describe, it, expect } from 'vitest';
import { applyMapping, guessMapping, parseCsv, splitFullName } from './parseCsv';
import * as fx from './__fixtures__/powerschool';

describe('guessMapping', () => {
  it('finds split first and last name columns', () => {
    const m = guessMapping(['Student Number', 'Last Name', 'First Name']);
    expect(m).toEqual({ firstName: 2, lastName: 1, fullName: null, studentNumber: 0 });
  });

  it('copes with odd casing and underscores', () => {
    const m = guessMapping(['STUDENT_NUMBER', 'LASTNAME', 'FIRSTNAME']);
    expect(m.firstName).toBe(2);
    expect(m.lastName).toBe(1);
    expect(m.studentNumber).toBe(0);
  });

  it('falls back to a combined name column', () => {
    const m = guessMapping(['Student Name', 'Student Number']);
    expect(m.fullName).toBe(0);
    expect(m.firstName).toBeNull();
    expect(m.lastName).toBeNull();
    expect(m.studentNumber).toBe(1);
  });

  it('prefers a split pair over a combined column', () => {
    const m = guessMapping(['Student Name', 'First Name', 'Last Name']);
    expect(m.fullName).toBeNull();
    expect(m.firstName).toBe(1);
    expect(m.lastName).toBe(2);
  });

  it('prefers "Student Number" over a bare "Number"', () => {
    const m = guessMapping(['Number', 'Student Number', 'First Name', 'Last Name']);
    expect(m.studentNumber).toBe(1);
  });

  it('ignores columns it does not recognise', () => {
    const m = guessMapping(['Grade Level', 'Home Room', 'Gender']);
    expect(m).toEqual({
      firstName: null,
      lastName: null,
      fullName: null,
      studentNumber: null,
    });
  });
});

describe('parseCsv', () => {
  it('reads a split-name export', () => {
    const r = parseCsv(fx.SPLIT_NAMES);
    expect(r.headers).toEqual(['Student Number', 'Last Name', 'First Name']);
    expect(r.rows).toHaveLength(3);
    expect(applyMapping(r.rows, r.mapping)).toEqual([
      { firstName: 'Bea', lastName: 'Ruiz', studentNumber: '123456' },
      { firstName: 'José', lastName: 'Torres', studentNumber: '123457' },
      { firstName: 'Cam', lastName: "O'Neil", studentNumber: '123458' },
    ]);
  });

  it('reads odd casing', () => {
    const r = parseCsv(fx.ODD_CASING);
    expect(applyMapping(r.rows, r.mapping)).toEqual([
      { firstName: 'Bea', lastName: 'Ruiz', studentNumber: '123456' },
      { firstName: 'José', lastName: 'Torres', studentNumber: '123457' },
    ]);
  });

  it('splits a quoted "Last, First" column', () => {
    const r = parseCsv(fx.FULL_NAME_COLUMN);
    expect(applyMapping(r.rows, r.mapping)).toEqual([
      { firstName: 'Bea', lastName: 'Ruiz', studentNumber: '123456' },
      { firstName: 'José', lastName: 'Torres', studentNumber: '123457' },
    ]);
  });

  it('splits a plain "First Last" column', () => {
    const r = parseCsv(fx.FIRST_LAST_IN_ONE_COLUMN);
    expect(applyMapping(r.rows, r.mapping)).toEqual([
      { firstName: 'Bea', lastName: 'Ruiz' },
      { firstName: 'José', lastName: 'Torres' },
    ]);
  });

  it('ignores extra columns it does not need', () => {
    const r = parseCsv(fx.EXTRA_COLUMNS);
    const students = applyMapping(r.rows, r.mapping);
    expect(students).toHaveLength(2);
    expect(students[0]).toEqual({
      firstName: 'Bea',
      lastName: 'Ruiz',
      studentNumber: '123456',
    });
  });

  it('skips blank rows', () => {
    const r = parseCsv(fx.BLANK_ROWS);
    expect(applyMapping(r.rows, r.mapping)).toHaveLength(2);
  });

  it('keeps a comma inside a quoted name', () => {
    const r = parseCsv(fx.COMMA_IN_NAME);
    const students = applyMapping(r.rows, r.mapping);
    expect(students[1]).toEqual({
      firstName: 'Mary-Kate',
      lastName: 'St. John',
      studentNumber: '123457',
    });
  });

  it('treats a headerless file as data and says so', () => {
    const r = parseCsv(fx.NO_HEADER);
    expect(r.problems.join(' ')).toMatch(/no header row/i);
    expect(applyMapping(r.rows, r.mapping)).toEqual([
      { firstName: 'Bea', lastName: 'Ruiz' },
      { firstName: 'José', lastName: 'Torres' },
    ]);
  });

  it('reports an empty file instead of throwing', () => {
    const r = parseCsv('');
    expect(r.rows).toEqual([]);
    expect(r.problems.join(' ')).toMatch(/no rows/i);
  });
});

describe('applyMapping', () => {
  it('honours a manual override of the guessed columns', () => {
    const r = parseCsv(fx.SPLIT_NAMES);
    // Teacher decides columns 1 and 2 are the other way round.
    const swapped = applyMapping(r.rows, { ...r.mapping, firstName: 1, lastName: 2 });
    expect(swapped[0]).toEqual({
      firstName: 'Ruiz',
      lastName: 'Bea',
      studentNumber: '123456',
    });
  });

  it('drops rows with no name at all', () => {
    const students = applyMapping(
      [
        ['', ''],
        ['Bea', 'Ruiz'],
      ],
      { firstName: 0, lastName: 1, fullName: null, studentNumber: null },
    );
    expect(students).toEqual([{ firstName: 'Bea', lastName: 'Ruiz' }]);
  });

  it('leaves studentNumber off when the column is unmapped', () => {
    const students = applyMapping([['Bea', 'Ruiz']], {
      firstName: 0,
      lastName: 1,
      fullName: null,
      studentNumber: null,
    });
    expect(students[0]).not.toHaveProperty('studentNumber');
  });
});

describe('splitFullName', () => {
  it('splits "Last, First"', () => {
    expect(splitFullName('Ruiz, Bea')).toEqual({ firstName: 'Bea', lastName: 'Ruiz' });
  });

  it('splits "First Last"', () => {
    expect(splitFullName('Bea Ruiz')).toEqual({ firstName: 'Bea', lastName: 'Ruiz' });
  });

  it('keeps a multi-word surname together after a comma', () => {
    expect(splitFullName('St. John, Mary-Kate')).toEqual({
      firstName: 'Mary-Kate',
      lastName: 'St. John',
    });
  });

  it('handles a single name', () => {
    expect(splitFullName('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' });
  });

  it('handles an empty cell', () => {
    expect(splitFullName('   ')).toEqual({ firstName: '', lastName: '' });
  });
});
