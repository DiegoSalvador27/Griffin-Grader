import { db } from '../db';
import { newId } from '../../lib/ids';
import type { ClassGroup, GridOrder, ID } from '../types';

/** `archived` is a boolean, so it cannot be indexed (see db.ts). Classes are
    few, so the filter happens here. */

export async function listClasses(includeArchived = false): Promise<ClassGroup[]> {
  const all = await db.classes.toArray();
  const rows = includeArchived ? all : all.filter((c) => !c.archived);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listArchivedClasses(): Promise<ClassGroup[]> {
  const all = await db.classes.toArray();
  return all.filter((c) => c.archived).sort((a, b) => a.name.localeCompare(b.name));
}

export function getClass(id: ID): Promise<ClassGroup | undefined> {
  return db.classes.get(id);
}

export async function createClass(input: {
  name: string;
  rubricId: ID;
  gridOrder?: GridOrder;
}): Promise<ClassGroup> {
  const row: ClassGroup = {
    id: newId(),
    name: input.name.trim(),
    rubricId: input.rubricId,
    gridOrder: input.gridOrder ?? 'first',
    customOrder: [],
    archived: false,
    createdAt: Date.now(),
  };
  await db.classes.add(row);
  return row;
}

export async function updateClass(
  id: ID,
  patch: Partial<Omit<ClassGroup, 'id' | 'createdAt'>>,
): Promise<void> {
  const next = { ...patch };
  if (typeof next.name === 'string') next.name = next.name.trim();
  await db.classes.update(id, next);
}

export function setArchived(id: ID, archived: boolean): Promise<void> {
  return updateClass(id, { archived });
}

/**
 * Hard delete of a class and everything under it. Only reachable from the
 * double-confirm path in the UI (SPEC 4.4). One transaction so a half-deleted
 * class can never exist.
 */
export async function deleteClassForever(id: ID): Promise<void> {
  // Array form: Dexie's positional overloads stop at five tables.
  await db.transaction(
    'rw',
    [db.classes, db.students, db.sessions, db.attendance, db.assessments, db.teamSets],
    async () => {
      const sessionIds = (await db.sessions.where('classId').equals(id).toArray()).map(
        (s) => s.id,
      );

      await db.assessments.where('classId').equals(id).delete();
      await db.teamSets.where('classId').equals(id).delete();
      await db.students.where('classId').equals(id).delete();
      if (sessionIds.length > 0) {
        await db.attendance.where('sessionId').anyOf(sessionIds).delete();
      }
      await db.sessions.where('classId').equals(id).delete();
      await db.classes.delete(id);
    },
  );
}
