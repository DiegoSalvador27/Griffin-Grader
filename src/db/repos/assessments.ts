import { db } from '../db';
import { newId } from '../../lib/ids';
import { setStatus, statusFor } from './attendance';
import type { Assessment, ID, Level, RubricCategory } from '../types';

export interface RecordInput {
  sessionId: ID;
  classId: ID;
  studentId: ID;
  category: Pick<RubricCategory, 'id' | 'name'>;
  level: Pick<Level, 'id' | 'code'>;
  comment?: string;
}

export interface RecordResult {
  assessment: Assessment;
  /** True when the student was absent and got marked present (SPEC 4.5). */
  markedPresent: boolean;
}

/**
 * Records one rubric entry. Category and level names are snapshotted onto the
 * row so a later rubric edit cannot rewrite history (SPEC section 3).
 *
 * Grading an absent student marks them present, which the caller surfaces as a
 * toast with Undo.
 */
export async function recordAssessment(input: RecordInput): Promise<RecordResult> {
  return db.transaction('rw', db.assessments, db.attendance, async () => {
    const wasAbsent = (await statusFor(input.sessionId, input.studentId)) === 'absent';
    if (wasAbsent) {
      await setStatus(input.sessionId, input.studentId, 'present');
    }

    const now = Date.now();
    const assessment: Assessment = {
      id: newId(),
      sessionId: input.sessionId,
      classId: input.classId,
      studentId: input.studentId,
      categoryId: input.category.id,
      categoryName: input.category.name,
      levelId: input.level.id,
      levelCode: input.level.code,
      comment: input.comment ?? '',
      createdAt: now,
      updatedAt: now,
    };
    await db.assessments.add(assessment);

    return { assessment, markedPresent: wasAbsent };
  });
}

export async function setComment(id: ID, comment: string): Promise<void> {
  await db.assessments.update(id, { comment, updatedAt: Date.now() });
}

export async function changeLevel(
  id: ID,
  level: Pick<Level, 'id' | 'code'>,
): Promise<void> {
  await db.assessments.update(id, {
    levelId: level.id,
    levelCode: level.code,
    updatedAt: Date.now(),
  });
}

export async function deleteAssessment(id: ID): Promise<void> {
  await db.assessments.delete(id);
}

/** Restores a deleted entry, keeping its original id so Undo is exact. */
export async function restoreAssessment(row: Assessment): Promise<void> {
  await db.assessments.add(row);
}

export function assessmentsForSession(sessionId: ID): Promise<Assessment[]> {
  return db.assessments.where('sessionId').equals(sessionId).toArray();
}

export async function assessmentsForStudentInSession(
  sessionId: ID,
  studentId: ID,
): Promise<Assessment[]> {
  const rows = await db.assessments.where('sessionId').equals(sessionId).toArray();
  return rows
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Newest first, for the student history screen. */
export async function assessmentsForStudent(studentId: ID): Promise<Assessment[]> {
  const rows = await db.assessments.where('studentId').equals(studentId).toArray();
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

/** How many entries each student has in this session: drives the tile badge.
    One query for the whole grid, never one per tile (SPEC section 8). */
export async function countsBySessionStudent(sessionId: ID): Promise<Map<ID, number>> {
  const rows = await assessmentsForSession(sessionId);
  const counts = new Map<ID, number>();
  for (const row of rows) {
    counts.set(row.studentId, (counts.get(row.studentId) ?? 0) + 1);
  }
  return counts;
}

export function assessmentsForClassInRange(
  classId: ID,
  fromTs: number,
  toTs: number,
): Promise<Assessment[]> {
  return db.assessments
    .where('[classId+createdAt]')
    .between([classId, fromTs], [classId, toTs], true, true)
    .toArray();
}
