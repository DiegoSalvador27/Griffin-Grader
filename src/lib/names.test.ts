import { describe, it, expect } from 'vitest';
import { displayNames, fullName, initials } from './names';

const s = (id: string, firstName: string, lastName: string) => ({
  id,
  firstName,
  lastName,
});

describe('initials', () => {
  it('takes the first letter of each name', () => {
    expect(initials({ firstName: 'Bea', lastName: 'Ruiz' })).toBe('BR');
  });

  it('uppercases them', () => {
    expect(initials({ firstName: 'bea', lastName: 'ruiz' })).toBe('BR');
  });

  it('handles accented letters', () => {
    expect(initials({ firstName: 'José', lastName: 'Ángel' })).toBe('JÁ');
  });

  it('handles a missing last name', () => {
    expect(initials({ firstName: 'Madonna', lastName: '' })).toBe('M');
  });
});

describe('fullName', () => {
  it('joins the parts', () => {
    expect(fullName({ firstName: 'Bea', lastName: 'Ruiz' })).toBe('Bea Ruiz');
  });

  it('does not leave a trailing space when there is no last name', () => {
    expect(fullName({ firstName: 'Madonna', lastName: '' })).toBe('Madonna');
  });
});

describe('displayNames', () => {
  it('uses first name plus last initial', () => {
    const names = displayNames([s('1', 'Bea', 'Ruiz')]);
    expect(names.get('1')).toBe('Bea R.');
  });

  /* The example from SPEC 4.5. */
  it('grows the surname only for the students who collide', () => {
    const names = displayNames([
      s('1', 'Alex', 'Morrow'),
      s('2', 'Alex', 'Martin'),
      s('3', 'Bea', 'Ruiz'),
    ]);

    expect(names.get('1')).toBe('Alex Mo.');
    expect(names.get('2')).toBe('Alex Ma.');
    expect(names.get('3')).toBe('Bea R.');
  });

  it('keeps growing when two letters are not enough', () => {
    const names = displayNames([s('1', 'Alex', 'Martin'), s('2', 'Alex', 'Martinez')]);

    expect(names.get('1')).not.toBe(names.get('2'));
    expect(names.get('1')).toBe('Alex Martin');
    expect(names.get('2')).toBe('Alex Martine.');
  });

  it('does not abbreviate a surname it has fully shown', () => {
    const names = displayNames([s('1', 'Jo', 'Li'), s('2', 'Jo', 'Lu')]);
    expect(names.get('1')).toBe('Jo Li');
    expect(names.get('2')).toBe('Jo Lu');
  });

  it('falls back to the full name for genuinely identical names', () => {
    const names = displayNames([s('1', 'Bea', 'Ruiz'), s('2', 'Bea', 'Ruiz')]);
    expect(names.get('1')).toBe('Bea Ruiz');
    expect(names.get('2')).toBe('Bea Ruiz');
  });

  it('leaves different first names alone', () => {
    const names = displayNames([s('1', 'Bea', 'Ruiz'), s('2', 'Cam', 'Ruiz')]);
    expect(names.get('1')).toBe('Bea R.');
    expect(names.get('2')).toBe('Cam R.');
  });

  it('handles a student with no last name', () => {
    const names = displayNames([s('1', 'Madonna', '')]);
    expect(names.get('1')).toBe('Madonna');
  });

  it('gives every student a label', () => {
    const students = [
      s('1', 'Alex', 'Morrow'),
      s('2', 'Alex', 'Martin'),
      s('3', 'Alex', 'Martinez'),
      s('4', 'Bea', 'Ruiz'),
      s('5', 'Madonna', ''),
    ];
    const names = displayNames(students);

    expect(names.size).toBe(students.length);
    for (const student of students) {
      expect(names.get(student.id)).toBeTruthy();
    }
  });

  it('handles an empty roster', () => {
    expect(displayNames([]).size).toBe(0);
  });
});
