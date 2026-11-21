import { db } from '../db';
import { newId } from '../../lib/ids';
import type { ClassGroup, ID, Student } from '../types';

export interface NewStudent {
  firstName: string;
  lastName: string;
  studentNumber?: string;
}

/** `active` is a boolean and cannot be indexed (see db.ts), so the filter is
    applied here after an indexed lookup on classId. */
export async function listStudents(
  classId: ID,
  includeInactive = false,
): Promise<Student[]> {
  const rows = await db.students.where('classId').equals(classId).toArray();
  return includeInactive ? rows : rows.filter((s) => s.active);
}

export function getStudent(id: ID): Promise<Student | undefined> {
  return db.students.get(id);
}

export async function addStudents(
  classId: ID,
  people: readonly NewStudent[],
): Promise<Student[]> {
  const now = Date.now();
  const rows: Student[] = people.map((p) => ({
    id: newId(),
    classId,
    firstName: p.firstName.trim(),
    lastName: p.lastName.trim(),
    ...(p.studentNumber?.trim() ? { studentNumber: p.studentNumber.trim() } : {}),
    active: true,
    createdAt: now,
  }));
  if (rows.length > 0) await db.students.bulkAdd(rows);
  return rows;
}

export async function updateStudent(
  id: ID,
  patch: Partial<Pick<Student, 'firstName' | 'lastName' | 'studentNumber' | 'active'>>,
): Promise<void> {
  await db.students.update(id, patch);
}

/** Soft remove: history is kept and the student can be restored (SPEC 4.4). */
export function deactivateStudent(id: ID): Promise<void> {
  return updateStudent(id, { active: false });
}

export function restoreStudent(id: ID): Promise<void> {
  return updateStudent(id, { active: true });
}

/** Sorts a roster for the tile grid according to the class's gridOrder. */
export function sortForGrid(students: readonly Student[], cls: ClassGroup): Student[] {
  const rows = [...students];

  if (cls.gridOrder === 'custom' && cls.customOrder.length > 0) {
    const rank = new Map(cls.customOrder.map((id, i) => [id, i]));
    // Students added after the custom order was saved fall to the end.
    return rows.sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
        a.firstName.localeCompare(b.firstName),
    );
  }

  const key = (s: Student): string =>
    cls.gridOrder === 'last' ? `${s.lastName} ${s.firstName}` : `${s.firstName} ${s.lastName}`;

  return rows.sort((a, b) => key(a).localeCompare(key(b)));
}
