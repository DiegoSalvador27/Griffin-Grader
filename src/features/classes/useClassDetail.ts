import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { sortForGrid } from '../../db/repos/students';
import type { ClassGroup, ID, Rubric, Student } from '../../db/types';

export interface RosterRow {
  student: Student;
  present: number;
  late: number;
  absent: number;
  entries: number;
  /** Latest level code recorded per category name. */
  latestByCategory: Map<string, string>;
}

export interface ClassDetail {
  cls: ClassGroup;
  rubric: Rubric | undefined;
  rows: RosterRow[];
  inactive: Student[];
  sessionCount: number;
}

/** Everything the class page shows, in one reactive pass. */
export function useClassDetail(classId: ID | undefined): ClassDetail | null | undefined {
  return useLiveQuery(async () => {
    if (!classId) return null;

    const cls = await db.classes.get(classId);
    if (!cls) return null;

    const [rubric, students, sessions, assessments] = await Promise.all([
      db.rubrics.get(cls.rubricId),
      db.students.where('classId').equals(classId).toArray(),
      db.sessions.where('classId').equals(classId).toArray(),
      db.assessments.where('classId').equals(classId).toArray(),
    ]);

    const sessionIds = sessions.map((s) => s.id);
    const attendance =
      sessionIds.length > 0
        ? await db.attendance.where('sessionId').anyOf(sessionIds).toArray()
        : [];

    const active = students.filter((s) => s.active);
    const inactive = students.filter((s) => !s.active);

    const rows: RosterRow[] = sortForGrid(active, cls).map((student) => {
      const mine = attendance.filter((a) => a.studentId === student.id);
      const present = mine.filter((a) => a.status === 'present').length;
      const late = mine.filter((a) => a.status === 'late').length;

      const myAssessments = assessments
        .filter((a) => a.studentId === student.id)
        .sort((a, b) => a.createdAt - b.createdAt);

      // Later entries overwrite earlier ones, so the map ends on the latest.
      const latestByCategory = new Map<string, string>();
      for (const a of myAssessments) latestByCategory.set(a.categoryName, a.levelCode);

      return {
        student,
        present,
        late,
        // A session with no row for this student counts as absent.
        absent: sessions.length - present - late,
        entries: myAssessments.length,
        latestByCategory,
      };
    });

    return { cls, rubric, rows, inactive, sessionCount: sessions.length };
  }, [classId]);
}
