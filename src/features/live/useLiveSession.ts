import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { sortForGrid } from '../../db/repos/students';
import { countStatuses } from '../../db/repos/attendance';
import { visibleCategories, orderedLevels } from '../../db/repos/rubrics';
import { displayNames } from '../../lib/names';
import type {
  AttendanceStatus,
  ClassGroup,
  ID,
  Level,
  QuickComment,
  RubricCategory,
  Session,
  Student,
} from '../../db/types';

export interface LiveData {
  cls: ClassGroup;
  session: Session;
  students: Student[];
  labels: Map<ID, string>;
  statuses: Map<ID, AttendanceStatus>;
  /** Entries per student in this session: drives the tile badge. */
  counts: Map<ID, number>;
  categories: RubricCategory[];
  levels: Level[];
  quickComments: QuickComment[];
  present: number;
  late: number;
  absent: number;
  /** Present or late students with at least one entry. */
  graded: number;
  eligible: number;
  flagUnassessed: boolean;
}

/**
 * One reactive query for the whole live screen.
 *
 * SPEC section 8 is explicit that counts are fetched once per session rather
 * than once per tile. With 40 tiles, a per-tile query would mean 40 live
 * subscriptions all firing on every single tap.
 */
export function useLiveSession(
  classId: ID | undefined,
  sessionId: ID | undefined,
): LiveData | null | undefined {
  return useLiveQuery(async (): Promise<LiveData | null> => {
    if (!classId || !sessionId) return null;

    const [cls, session] = await Promise.all([
      db.classes.get(classId),
      db.sessions.get(sessionId),
    ]);
    if (!cls || !session) return null;

    const [rubric, allStudents, attendance, assessments, quickComments, settings] =
      await Promise.all([
        db.rubrics.get(cls.rubricId),
        db.students.where('classId').equals(classId).toArray(),
        db.attendance.where('sessionId').equals(sessionId).toArray(),
        db.assessments.where('sessionId').equals(sessionId).toArray(),
        db.quickComments.orderBy('order').toArray(),
        db.settings.get('settings'),
      ]);

    const students = sortForGrid(
      allStudents.filter((s) => s.active),
      cls,
    );
    const ids = students.map((s) => s.id);

    const statuses = new Map(attendance.map((a) => [a.studentId, a.status]));

    const counts = new Map<ID, number>();
    for (const a of assessments) {
      counts.set(a.studentId, (counts.get(a.studentId) ?? 0) + 1);
    }

    const tally = countStatuses(ids, statuses);
    const eligibleIds = ids.filter((id) => (statuses.get(id) ?? 'absent') !== 'absent');

    return {
      cls,
      session,
      students,
      labels: displayNames(students),
      statuses,
      counts,
      categories: rubric ? visibleCategories(rubric) : [],
      levels: rubric ? orderedLevels(rubric) : [],
      quickComments,
      present: tally.present,
      late: tally.late,
      absent: tally.absent,
      graded: eligibleIds.filter((id) => (counts.get(id) ?? 0) > 0).length,
      eligible: eligibleIds.length,
      flagUnassessed: settings?.flagUnassessed ?? true,
    };
  }, [classId, sessionId]);
}
