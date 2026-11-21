import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { today } from '../../lib/dates';
import type { ClassGroup, ID } from '../../db/types';

export interface ClassSummary {
  cls: ClassGroup;
  studentCount: number;
  rubricName: string;
  lastSessionDate: string | null;
  /** Set when a session exists for today. */
  liveToday: { sessionId: ID; graded: number; eligible: number; ended: boolean } | null;
}

/**
 * Everything the Classes list needs, in one reactive pass.
 *
 * Deliberately not one query per card: useLiveQuery re-runs the whole function
 * whenever any table it touched changes, so a single pass keeps the list
 * consistent and avoids a render storm during a live class.
 */
export function useClassSummaries(includeArchived = false): ClassSummary[] | undefined {
  return useLiveQuery(async () => {
    const [classes, rubrics, students, sessions] = await Promise.all([
      db.classes.toArray(),
      db.rubrics.toArray(),
      db.students.toArray(),
      db.sessions.toArray(),
    ]);

    const rubricNames = new Map(rubrics.map((r) => [r.id, r.name]));
    const todayStr = today();

    const visible = classes
      .filter((c) => (includeArchived ? c.archived : !c.archived))
      .sort((a, b) => a.name.localeCompare(b.name));

    const summaries: ClassSummary[] = [];

    for (const cls of visible) {
      const roster = students.filter((s) => s.classId === cls.id && s.active);
      const mySessions = sessions.filter((s) => s.classId === cls.id);
      const todays = mySessions.find((s) => s.date === todayStr);

      let liveToday: ClassSummary['liveToday'] = null;
      if (todays) {
        const [assessments, attendance] = await Promise.all([
          db.assessments.where('sessionId').equals(todays.id).toArray(),
          db.attendance.where('sessionId').equals(todays.id).toArray(),
        ]);

        const present = new Set(
          attendance.filter((a) => a.status !== 'absent').map((a) => a.studentId),
        );
        const graded = new Set(assessments.map((a) => a.studentId));

        liveToday = {
          sessionId: todays.id,
          graded: [...graded].filter((id) => present.has(id)).length,
          eligible: present.size,
          ended: todays.endedAt !== undefined,
        };
      }

      summaries.push({
        cls,
        studentCount: roster.length,
        rubricName: rubricNames.get(cls.rubricId) ?? 'No rubric',
        lastSessionDate: mySessions.map((s) => s.date).sort().at(-1) ?? null,
        liveToday,
      });
    }

    return summaries;
  }, [includeArchived]);
}
