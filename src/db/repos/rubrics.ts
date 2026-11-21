import { db } from '../db';
import { newId } from '../../lib/ids';
import type { ID, QuickComment, Rubric } from '../types';

export function listRubrics(): Promise<Rubric[]> {
  return db.rubrics.toArray();
}

export function getRubric(id: ID): Promise<Rubric | undefined> {
  return db.rubrics.get(id);
}

export async function saveRubric(rubric: Rubric): Promise<void> {
  await db.rubrics.put({ ...rubric, updatedAt: Date.now() });
}

export async function duplicateRubric(id: ID): Promise<Rubric | undefined> {
  const source = await getRubric(id);
  if (!source) return undefined;

  const now = Date.now();
  // Fresh ids throughout: two rubrics must never share a category id, or
  // editing one would appear to edit the other.
  const copy: Rubric = {
    ...source,
    id: newId(),
    name: `${source.name} copy`,
    categories: source.categories.map((c) => ({ ...c, id: newId() })),
    levels: source.levels.map((l) => ({ ...l, id: newId() })),
    createdAt: now,
    updatedAt: now,
  };
  await db.rubrics.add(copy);
  return copy;
}

/** Visible categories in display order. */
export function visibleCategories(rubric: Rubric) {
  return rubric.categories.filter((c) => !c.hidden).sort((a, b) => a.order - b.order);
}

/** Levels lowest to highest. */
export function orderedLevels(rubric: Rubric) {
  return [...rubric.levels].sort((a, b) => a.order - b.order);
}

/** True when any assessment still refers to this category. Such a category is
    hidden rather than deleted, so its history keeps rendering (SPEC 4.6). */
export async function categoryInUse(categoryId: ID): Promise<boolean> {
  const hit = await db.assessments.filter((a) => a.categoryId === categoryId).first();
  return hit !== undefined;
}

export async function levelInUse(levelId: ID): Promise<boolean> {
  const hit = await db.assessments.filter((a) => a.levelId === levelId).first();
  return hit !== undefined;
}

export async function classesUsingRubric(rubricId: ID): Promise<string[]> {
  const rows = await db.classes.toArray();
  return rows.filter((c) => c.rubricId === rubricId).map((c) => c.name);
}

export function listQuickComments(): Promise<QuickComment[]> {
  return db.quickComments.orderBy('order').toArray();
}

export async function saveQuickComments(rows: readonly QuickComment[]): Promise<void> {
  await db.transaction('rw', db.quickComments, async () => {
    await db.quickComments.clear();
    await db.quickComments.bulkAdd(rows.map((r, i) => ({ ...r, order: i })));
  });
}
