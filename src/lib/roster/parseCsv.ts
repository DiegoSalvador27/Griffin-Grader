import Papa from 'papaparse';
import type { NewStudent } from '../../db/repos/students';

/**
 * PowerSchool roster import (SPEC 4.3).
 *
 * No real PowerSchool export has been seen yet, so the header matching is
 * deliberately loose and every guess is editable in the UI. Guessing wrong is
 * cheap (change a dropdown); guessing rigidly and refusing a real file is not.
 */

/** Which column index feeds which field. null means "not mapped". */
export interface ColumnMapping {
  firstName: number | null;
  lastName: number | null;
  /** A single "Last, First" or "First Last" column, used when the name is not split. */
  fullName: number | null;
  studentNumber: number | null;
}

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
  /** Best guess, shown pre-filled in the mapping dropdowns. */
  mapping: ColumnMapping;
  /** Parse problems worth showing, already in plain language. */
  problems: string[];
}

const FIRST_NAME_HINTS = ['first name', 'firstname', 'first_name', 'first', 'given name'];
const LAST_NAME_HINTS = ['last name', 'lastname', 'last_name', 'last', 'surname', 'family name'];
const FULL_NAME_HINTS = ['student name', 'studentname', 'full name', 'name', 'student'];
const NUMBER_HINTS = [
  'student number',
  'student_number',
  'studentnumber',
  'student id',
  'student_id',
  'studentid',
  'number',
  'id',
];

const normalise = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Exact match first, then "contains", so "Student Number" beats "Number". */
function findColumn(headers: string[], hints: readonly string[]): number | null {
  const normalised = headers.map(normalise);

  for (const hint of hints) {
    const exact = normalised.indexOf(hint);
    if (exact !== -1) return exact;
  }
  for (const hint of hints) {
    const partial = normalised.findIndex((h) => h.includes(hint));
    if (partial !== -1) return partial;
  }
  return null;
}

export function guessMapping(headers: string[]): ColumnMapping {
  const firstName = findColumn(headers, FIRST_NAME_HINTS);
  const lastName = findColumn(headers, LAST_NAME_HINTS);
  const studentNumber = findColumn(headers, NUMBER_HINTS);

  // Only reach for a combined name column when the split pair is incomplete,
  // otherwise "Student Name" would shadow a perfectly good First/Last pair.
  const fullName =
    firstName !== null && lastName !== null ? null : findColumn(headers, FULL_NAME_HINTS);

  return {
    firstName: fullName !== null ? null : firstName,
    lastName: fullName !== null ? null : lastName,
    fullName,
    // A bare "id" column that is really the name column helps nobody.
    studentNumber:
      studentNumber !== null && studentNumber !== fullName ? studentNumber : null,
  };
}

export function parseCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<string[]>(text.trim(), {
    skipEmptyLines: 'greedy',
  });

  const problems: string[] = [];
  const all = parsed.data.filter((row) => Array.isArray(row));

  if (all.length === 0) {
    return {
      headers: [],
      rows: [],
      mapping: { firstName: null, lastName: null, fullName: null, studentNumber: null },
      problems: ['That file has no rows in it.'],
    };
  }

  const headers = (all[0] ?? []).map((h) => `${h}`.trim());
  const rows = all.slice(1).map((r) => r.map((c) => `${c ?? ''}`.trim()));

  // A header row whose cells look like a person is probably data already.
  const looksHeaderless = headers.every((h) => h !== '' && !isHeaderish(h));
  if (looksHeaderless) {
    problems.push('No header row was found, so the first row is being treated as data.');
    return {
      headers: headers.map((_, i) => `Column ${i + 1}`),
      rows: [headers, ...rows],
      mapping: { firstName: 0, lastName: 1, fullName: null, studentNumber: null },
      problems,
    };
  }

  if (parsed.errors.length > 0) {
    problems.push(`${parsed.errors.length} row(s) could not be read cleanly.`);
  }

  return { headers, rows, mapping: guessMapping(headers), problems };
}

/** Header cells are short labels, not names with spaces and accents. */
function isHeaderish(cell: string): boolean {
  const c = normalise(cell);
  return [...FIRST_NAME_HINTS, ...LAST_NAME_HINTS, ...FULL_NAME_HINTS, ...NUMBER_HINTS].some(
    (hint) => c.includes(hint),
  );
}

/** Splits "Ruiz, Bea" or "Bea Ruiz" into parts. */
export function splitFullName(value: string): { firstName: string; lastName: string } {
  const v = value.trim();
  if (v === '') return { firstName: '', lastName: '' };

  if (v.includes(',')) {
    const [last, ...rest] = v.split(',');
    return { firstName: rest.join(',').trim(), lastName: (last ?? '').trim() };
  }

  const parts = v.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0] ?? '', lastName: '' };

  const [first, ...restParts] = parts;
  return { firstName: first ?? '', lastName: restParts.join(' ') };
}

export function applyMapping(
  rows: readonly string[][],
  mapping: ColumnMapping,
): NewStudent[] {
  const cell = (row: readonly string[], index: number | null): string =>
    index === null ? '' : (row[index] ?? '').trim();

  const out: NewStudent[] = [];

  for (const row of rows) {
    let firstName = cell(row, mapping.firstName);
    let lastName = cell(row, mapping.lastName);

    if (mapping.fullName !== null) {
      const split = splitFullName(cell(row, mapping.fullName));
      firstName = split.firstName;
      lastName = split.lastName;
    }

    if (firstName === '' && lastName === '') continue;

    const student: NewStudent = { firstName, lastName };
    const number = cell(row, mapping.studentNumber);
    if (number !== '') student.studentNumber = number;
    out.push(student);
  }

  return out;
}
