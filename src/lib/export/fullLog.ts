import { formatTime } from '../dates';
import type { ID } from '../../db/types';
import type { ExportBundle, Sheet } from './types';

/**
 * The complete record (SPEC 4.7): one row per assessment, plus one row per
 * attendance status per session. Assessment rows and attendance rows share
 * the same columns, with attendance sitting in the Category column, so the
 * whole day sorts together in a spreadsheet.
 */
export function buildFullLogSheet(bundle: ExportBundle): Sheet {
  const headers = [
    'Date',
    'Time',
    'Class',
    'Last Name',
    'First Name',
    'Student Number',
    'Category',
    'Level',
    'Comment',
  ];

  const rows: string[][] = [];

  for (const entry of bundle.classes) {
    const students = new Map(entry.students.map((s) => [s.id, s]));
    const sessionDate = new Map<ID, string>(entry.sessions.map((s) => [s.id, s.date]));

    const who = (studentId: ID): [string, string, string] => {
      const student = students.get(studentId);
      return [
        student?.lastName ?? '',
        student?.firstName ?? '',
        student?.studentNumber ?? '',
      ];
    };

    for (const a of entry.assessments) {
      rows.push([
        sessionDate.get(a.sessionId) ?? '',
        formatTime(a.createdAt),
        entry.cls.name,
        ...who(a.studentId),
        a.categoryName,
        a.levelCode,
        a.comment,
      ]);
    }

    // Attendance: an explicit row per student per session, including the
    // absences that have no stored row, so the log is complete on its own.
    for (const session of entry.sessions) {
      for (const student of entry.students) {
        const row = entry.attendance.find(
          (a) => a.sessionId === session.id && a.studentId === student.id,
        );
        const status = row?.status ?? 'absent';
        rows.push([
          session.date,
          row ? formatTime(row.updatedAt) : '',
          entry.cls.name,
          ...who(student.id),
          'Attendance',
          status.charAt(0).toUpperCase() + status.slice(1),
          '',
        ]);
      }
    }
  }

  rows.sort(
    (a, b) =>
      (a[0] ?? '').localeCompare(b[0] ?? '') ||
      (a[2] ?? '').localeCompare(b[2] ?? '') ||
      (a[3] ?? '').localeCompare(b[3] ?? '') ||
      (a[4] ?? '').localeCompare(b[4] ?? '') ||
      (a[1] ?? '').localeCompare(b[1] ?? ''),
  );

  return { headers, rows };
}
