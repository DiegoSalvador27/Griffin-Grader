import { db } from '../db';
import { newId } from '../../lib/ids';
import type { Attendance, AttendanceStatus, ID } from '../types';

/**
 * Attendance.
 *
 * Every active student starts ABSENT (SPEC 4.5). Rows are created lazily, so a
 * missing row means absent. Readers must go through `statusFor` or
 * `statusMapForSession` rather than assuming a row exists.
 */

export const ABSENT: AttendanceStatus = 'absent';

/** Absent > Present > Late > Absent (SPEC 4.5). */
export function nextStatus(current: AttendanceStatus): AttendanceStatus {
  switch (current) {
    case 'absent':
      return 'present';
    case 'present':
      return 'late';
    case 'late':
      return 'absent';
  }
}

export async function statusMapForSession(
  sessionId: ID,
): Promise<Map<ID, AttendanceStatus>> {
  const rows = await db.attendance.where('sessionId').equals(sessionId).toArray();
  return new Map(rows.map((r) => [r.studentId, r.status]));
}

export async function statusFor(
  sessionId: ID,
  studentId: ID,
): Promise<AttendanceStatus> {
  const row = await db.attendance
    .where('[sessionId+studentId]')
    .equals([sessionId, studentId])
    .first();
  return row?.status ?? ABSENT;
}

export async function setStatus(
  sessionId: ID,
  studentId: ID,
  status: AttendanceStatus,
): Promise<void> {
  await db.transaction('rw', db.attendance, async () => {
    const existing = await db.attendance
      .where('[sessionId+studentId]')
      .equals([sessionId, studentId])
      .first();

    if (existing) {
      await db.attendance.update(existing.id, { status, updatedAt: Date.now() });
      return;
    }

    const row: Attendance = {
      id: newId(),
      sessionId,
      studentId,
      status,
      updatedAt: Date.now(),
    };
    await db.attendance.add(row);
  });
}

/** Cycles one student and returns the status they landed on. */
export async function cycleStatus(
  sessionId: ID,
  studentId: ID,
): Promise<AttendanceStatus> {
  const next = nextStatus(await statusFor(sessionId, studentId));
  await setStatus(sessionId, studentId, next);
  return next;
}

export async function setAllStatuses(
  sessionId: ID,
  studentIds: readonly ID[],
  status: AttendanceStatus,
): Promise<void> {
  await db.transaction('rw', db.attendance, async () => {
    for (const studentId of studentIds) {
      await setStatus(sessionId, studentId, status);
    }
  });
}

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
}

/** Scoreboard counts. Students with no row count as absent. */
export function countStatuses(
  studentIds: readonly ID[],
  statuses: ReadonlyMap<ID, AttendanceStatus>,
): AttendanceCounts {
  const counts: AttendanceCounts = { present: 0, late: 0, absent: 0 };
  for (const id of studentIds) {
    counts[statuses.get(id) ?? ABSENT] += 1;
  }
  return counts;
}

export function attendanceHistory(studentId: ID): Promise<Attendance[]> {
  return db.attendance.where('studentId').equals(studentId).toArray();
}
