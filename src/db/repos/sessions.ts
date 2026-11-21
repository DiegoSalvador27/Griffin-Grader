import { db } from '../db';
import { newId } from '../../lib/ids';
import { today } from '../../lib/dates';
import type { ID, Session } from '../types';

export function getSession(id: ID): Promise<Session | undefined> {
  return db.sessions.get(id);
}

export function listSessions(classId: ID): Promise<Session[]> {
  return db.sessions.where('classId').equals(classId).toArray();
}

export async function latestSessionDate(classId: ID): Promise<string | undefined> {
  const rows = await listSessions(classId);
  return rows.map((s) => s.date).sort().at(-1);
}

/** Today's session for a class, open or already ended. */
export async function findTodaysSession(classId: ID): Promise<Session | undefined> {
  return db.sessions.where('[classId+date]').equals([classId, today()]).first();
}

/**
 * Starts or resumes the session for today (SPEC 4.5).
 *
 * - An unended session from today is resumed.
 * - An unended session from an earlier date is closed first, with endedAt set
 *   to its last activity rather than now, so a class someone forgot to end does
 *   not look like it ran for three days.
 */
export async function startOrResumeSession(classId: ID): Promise<Session> {
  return db.transaction('rw', db.sessions, db.assessments, db.attendance, async () => {
    const existingToday = await db.sessions
      .where('[classId+date]')
      .equals([classId, today()])
      .first();

    if (existingToday) {
      if (existingToday.endedAt !== undefined) {
        await db.sessions.update(existingToday.id, { endedAt: undefined });
        return { ...existingToday, endedAt: undefined };
      }
      return existingToday;
    }

    const stale = (await db.sessions.where('classId').equals(classId).toArray()).filter(
      (s) => s.endedAt === undefined,
    );
    for (const s of stale) {
      await db.sessions.update(s.id, { endedAt: await lastActivityAt(s) });
    }

    const row: Session = {
      id: newId(),
      classId,
      date: today(),
      startedAt: Date.now(),
    };
    await db.sessions.add(row);
    return row;
  });
}

/** The most recent thing that happened in a session, falling back to its start. */
async function lastActivityAt(session: Session): Promise<number> {
  const [assessments, attendance] = await Promise.all([
    db.assessments.where('sessionId').equals(session.id).toArray(),
    db.attendance.where('sessionId').equals(session.id).toArray(),
  ]);

  const stamps = [
    session.startedAt,
    ...assessments.map((a) => a.updatedAt),
    ...attendance.map((a) => a.updatedAt),
  ];
  return Math.max(...stamps);
}

export async function endSession(id: ID): Promise<void> {
  await db.sessions.update(id, { endedAt: Date.now() });
}

/** Sessions for a class within an inclusive "YYYY-MM-DD" range. */
export async function sessionsInRange(
  classId: ID,
  from: string,
  to: string,
): Promise<Session[]> {
  return db.sessions
    .where('[classId+date]')
    .between([classId, from], [classId, to], true, true)
    .toArray();
}
