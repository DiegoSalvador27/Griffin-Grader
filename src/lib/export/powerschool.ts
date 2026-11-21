import type { Assessment, ID } from '../../db/types';
import type { ClassExport, ExportBundle, Sheet } from './types';

/**
 * The sheet a teacher types into PowerSchool (SPEC 4.7).
 *
 * One row per student. Columns:
 *   Class, Date(s), Last Name, First Name, Student Number, Attendance,
 *   then <Category> and <Category> Comments for every category in range.
 */

export const COMMENT_JOIN = ' | ';

/**
 * Category columns are the union of the names found on the ASSESSMENTS in
 * range, not the names on the current rubrics.
 *
 * Assessments snapshot `categoryName`, so if a teacher renames "Skills" to
 * "Movement Skills" in March, building columns from the rubric would silently
 * drop every entry recorded under the old name. Taking the union from the data
 * keeps both columns, which is the honest answer.
 *
 * Ordering: follow the current rubric order where a name still matches, so the
 * familiar columns stay in their familiar places, then anything left over
 * alphabetically.
 */
export function categoryColumns(bundle: ExportBundle): string[] {
  const used = new Set<string>();
  for (const entry of bundle.classes) {
    for (const a of entry.assessments) used.add(a.categoryName);
  }

  const rank = new Map<string, number>();
  let next = 0;
  for (const entry of bundle.classes) {
    for (const category of [...(entry.rubric?.categories ?? [])].sort(
      (a, b) => a.order - b.order,
    )) {
      if (!rank.has(category.name)) rank.set(category.name, next++);
    }
  }

  const known = [...used]
    .filter((name) => rank.has(name))
    .sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  const orphans = [...used].filter((name) => !rank.has(name)).sort();

  return [...known, ...orphans];
}

/**
 * The level a student ends the range on for one category.
 *
 * Ordered by `createdAt`, not `updatedAt`: if a teacher fixes a typo in a
 * 10:14 comment at 10:40, that must not promote the older observation over a
 * later one. createdAt is when the teacher actually saw the thing.
 */
export function latestLevel(entries: readonly Assessment[]): string {
  let latest: Assessment | undefined;
  for (const entry of entries) {
    if (!latest || entry.createdAt > latest.createdAt) latest = entry;
  }
  return latest?.levelCode ?? '';
}

export function joinComments(entries: readonly Assessment[]): string {
  return [...entries]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((e) => e.comment.trim())
    .filter((c) => c !== '')
    .join(COMMENT_JOIN);
}

/** "Present" on a single day, "P:4 L:1 A:2" across a range. */
export function attendanceCell(entry: ClassExport, studentId: ID, singleDay: boolean): string {
  const byStudent = entry.attendance.filter((a) => a.studentId === studentId);

  if (singleDay) {
    const session = entry.sessions[0];
    if (!session) return '';
    const row = byStudent.find((a) => a.sessionId === session.id);
    const status = row?.status ?? 'absent';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  let present = 0;
  let late = 0;
  for (const session of entry.sessions) {
    const row = byStudent.find((a) => a.sessionId === session.id);
    if (row?.status === 'present') present += 1;
    else if (row?.status === 'late') late += 1;
  }
  // No row means absent, so absent is whatever is left over.
  return `P:${present} L:${late} A:${entry.sessions.length - present - late}`;
}

export function buildPowerSchoolSheet(bundle: ExportBundle): Sheet {
  const categories = categoryColumns(bundle);
  const singleDay = bundle.from === bundle.to;
  const dateLabel = singleDay ? bundle.from : `${bundle.from} to ${bundle.to}`;

  const headers = [
    'Class',
    'Date(s)',
    'Last Name',
    'First Name',
    'Student Number',
    'Attendance',
    ...categories.flatMap((name) => [name, `${name} Comments`]),
  ];

  const rows: string[][] = [];

  // Sorted by class, then last name, then first name (SPEC 4.7).
  const ordered = [...bundle.classes].sort((a, b) => a.cls.name.localeCompare(b.cls.name));

  for (const entry of ordered) {
    const students = [...entry.students].sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
    );

    for (const student of students) {
      const mine = entry.assessments.filter((a) => a.studentId === student.id);

      const cells: string[] = [
        entry.cls.name,
        dateLabel,
        student.lastName,
        student.firstName,
        student.studentNumber ?? '',
        attendanceCell(entry, student.id, singleDay),
      ];

      for (const name of categories) {
        // A class whose rubric never had this category leaves both cells blank.
        const forCategory = mine.filter((a) => a.categoryName === name);
        cells.push(latestLevel(forCategory), joinComments(forCategory));
      }

      rows.push(cells);
    }
  }

  return { headers, rows };
}
