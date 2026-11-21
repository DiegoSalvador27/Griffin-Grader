import { db } from '../db';
import type { ExportBundle, ClassExport } from '../../lib/export/types';
import type { ID } from '../types';

/**
 * Collects everything an export needs for a date range.
 *
 * Assessments are selected by which SESSION they belong to, not by a timestamp
 * window. `Session.date` is the authoritative local calendar day, so going
 * through sessions means an evening class cannot land in the wrong day the way
 * a UTC timestamp comparison would.
 */
export async function gatherExportBundle(
  classIds: readonly ID[],
  from: string,
  to: string,
): Promise<ExportBundle> {
  const classes: ClassExport[] = [];

  for (const classId of classIds) {
    const cls = await db.classes.get(classId);
    if (!cls) continue;

    const sessions = (await db.sessions.where('classId').equals(classId).toArray())
      .filter((s) => s.date >= from && s.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));

    const sessionIds = sessions.map((s) => s.id);

    const [rubric, students, assessments, attendance] = await Promise.all([
      db.rubrics.get(cls.rubricId),
      db.students.where('classId').equals(classId).toArray(),
      sessionIds.length > 0
        ? db.assessments.where('sessionId').anyOf(sessionIds).toArray()
        : Promise.resolve([]),
      sessionIds.length > 0
        ? db.attendance.where('sessionId').anyOf(sessionIds).toArray()
        : Promise.resolve([]),
    ]);

    classes.push({
      cls,
      rubric,
      // Removed students still appear if they have entries in the range: their
      // marks still need typing into PowerSchool.
      students: students.filter(
        (s) => s.active || assessments.some((a) => a.studentId === s.id),
      ),
      sessions,
      assessments,
      attendance,
    });
  }

  return { from, to, classes };
}

/** Class ids that have at least one session in the range. */
export async function classesWithDataInRange(from: string, to: string): Promise<ID[]> {
  const sessions = await db.sessions.toArray();
  const ids = new Set(
    sessions.filter((s) => s.date >= from && s.date <= to).map((s) => s.classId),
  );
  return [...ids];
}
