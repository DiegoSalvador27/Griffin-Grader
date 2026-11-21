import type { NewStudent } from '../../db/repos/students';

/**
 * Parses a pasted roster, one student per line (SPEC 4.3).
 *
 * Accepted shapes, in the order they are tested:
 *   Tab separated   First <TAB> Last [<TAB> Number]   (straight from a spreadsheet)
 *   Comma           Last, First
 *   Plain           First Last  /  First Middle Last
 *
 * Tab separated columns are genuinely ambiguous: a spreadsheet is just as
 * likely to hold "Last, First" order. Rather than guess per line, this always
 * reads them as First then Last and the preview table offers a swap button,
 * so one wrong guess is one tap to fix for the whole list.
 *
 * Accents, apostrophes and hyphens are preserved: José, O'Neil, Mary-Kate.
 */

export interface ParsedRoster {
  students: NewStudent[];
  /** Lowercased "first last" values that appear more than once. */
  duplicates: string[];
}

export function parsePasteLine(line: string): NewStudent | null {
  const trimmed = line.trim();
  if (trimmed === '') return null;

  if (trimmed.includes('\t')) return fromTabs(trimmed);
  if (trimmed.includes(',')) return fromComma(trimmed);
  return fromSpaces(trimmed);
}

function fromTabs(line: string): NewStudent | null {
  const cells = line.split('\t').map((c) => c.trim());
  const first = cells[0] ?? '';
  const last = cells[1] ?? '';
  const number = cells[2] ?? '';

  if (first === '' && last === '') return null;
  // A single filled cell is a whole name, not a first name on its own.
  if (last === '') return fromSpaces(first);

  return build(first, last, number);
}

function fromComma(line: string): NewStudent | null {
  const [before, ...rest] = line.split(',');
  const last = (before ?? '').trim();
  const after = rest.join(',').trim();

  if (last === '' && after === '') return null;
  if (after === '') return fromSpaces(last);

  // "Ruiz, Bea" and also "Ruiz, Bea, 123456" from a sloppy paste.
  const [firstPart, numberPart] = splitTrailingNumber(after);
  return build(firstPart, last, numberPart);
}

function fromSpaces(line: string): NewStudent | null {
  const parts = line.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return build(parts[0] ?? '', '', '');

  // "First Middle Last": the first token is the first name, the rest is the
  // last name, so "Mary Jane Watson" keeps "Jane Watson" together.
  const [first, ...restParts] = parts;
  return build(first ?? '', restParts.join(' '), '');
}

/** Pulls a trailing "…, 123456" student number off a fragment. */
function splitTrailingNumber(s: string): [string, string] {
  const parts = s.split(',').map((p) => p.trim());
  if (parts.length > 1) {
    const tail = parts.at(-1) ?? '';
    if (/^[\w-]+$/.test(tail) && /\d/.test(tail)) {
      return [parts.slice(0, -1).join(' ').trim(), tail];
    }
  }
  return [s, ''];
}

function build(firstName: string, lastName: string, studentNumber: string): NewStudent {
  const row: NewStudent = { firstName: firstName.trim(), lastName: lastName.trim() };
  const num = studentNumber.trim();
  if (num !== '') row.studentNumber = num;
  return row;
}

export function parsePaste(text: string): ParsedRoster {
  const students = text
    .split(/\r?\n/)
    .map(parsePasteLine)
    .filter((s): s is NewStudent => s !== null);

  return { students, duplicates: findDuplicates(students) };
}

/** Swaps first and last for every row, for the preview's swap button. */
export function swapNames(students: readonly NewStudent[]): NewStudent[] {
  return students.map((s) => ({
    ...s,
    firstName: s.lastName,
    lastName: s.firstName,
  }));
}

export function findDuplicates(students: readonly NewStudent[]): string[] {
  const seen = new Map<string, number>();
  for (const s of students) {
    const key = `${s.firstName} ${s.lastName}`.trim().toLowerCase();
    if (key === '') continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}
