import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { resetDb } from '../testing';
import { seedIfEmpty } from '../seed';
import {
  categoryInUse,
  classesUsingRubric,
  duplicateRubric,
  levelInUse,
  listQuickComments,
  orderedLevels,
  saveQuickComments,
  saveRubric,
  visibleCategories,
} from './rubrics';
import { createClass } from './classes';
import { addStudents } from './students';
import { startOrResumeSession } from './sessions';
import { recordAssessment } from './assessments';

beforeEach(resetDb);

async function seeded() {
  await seedIfEmpty();
  return (await db.rubrics.toArray())[0]!;
}

describe('rubric structure', () => {
  it('hides hidden categories but keeps them stored', async () => {
    const rubric = await seeded();
    const skills = rubric.categories[0]!;

    await saveRubric({
      ...rubric,
      categories: rubric.categories.map((c) =>
        c.id === skills.id ? { ...c, hidden: true } : c,
      ),
    });

    const updated = (await db.rubrics.get(rubric.id))!;
    expect(updated.categories).toHaveLength(4);
    expect(visibleCategories(updated).map((c) => c.name)).toEqual([
      'Teamwork',
      'Participation',
      'Sportsmanship',
    ]);
  });

  it('orders levels lowest first', async () => {
    const rubric = await seeded();
    expect(orderedLevels(rubric).map((l) => l.code)).toEqual([
      'DV1',
      'DV2',
      'PR1',
      'PR2',
      'EX1',
      'EX2',
    ]);
  });
});

describe('in-use checks', () => {
  /* SPEC 4.6: a category with entries is hidden, never hard deleted, so the
     history that references it keeps rendering. */
  it('reports a category as in use once something is recorded against it', async () => {
    const rubric = await seeded();
    const cls = await createClass({ name: 'PE 10', rubricId: rubric.id });
    const [student] = await addStudents(cls.id, [{ firstName: 'Bea', lastName: 'Ruiz' }]);
    const session = await startOrResumeSession(cls.id);

    const skills = rubric.categories[0]!;
    const pr2 = rubric.levels[3]!;

    expect(await categoryInUse(skills.id)).toBe(false);
    expect(await levelInUse(pr2.id)).toBe(false);

    await recordAssessment({
      sessionId: session.id,
      classId: cls.id,
      studentId: student!.id,
      category: skills,
      level: pr2,
    });

    expect(await categoryInUse(skills.id)).toBe(true);
    expect(await levelInUse(pr2.id)).toBe(true);
    // An untouched category is still free to delete outright.
    expect(await categoryInUse(rubric.categories[1]!.id)).toBe(false);
  });

  it('lists the classes using a rubric', async () => {
    const rubric = await seeded();
    await createClass({ name: 'PE 10', rubricId: rubric.id });
    await createClass({ name: 'PE 20', rubricId: rubric.id });
    await createClass({ name: 'Other', rubricId: 'another-rubric' });

    expect((await classesUsingRubric(rubric.id)).sort()).toEqual(['PE 10', 'PE 20']);
  });
});

describe('duplicateRubric', () => {
  it('copies with fresh ids so editing one does not touch the other', async () => {
    const rubric = await seeded();
    const copy = (await duplicateRubric(rubric.id))!;

    expect(copy.id).not.toBe(rubric.id);
    expect(copy.name).toBe('PE Rubric copy');
    expect(copy.categories).toHaveLength(rubric.categories.length);

    const originalIds = new Set(rubric.categories.map((c) => c.id));
    for (const category of copy.categories) {
      expect(originalIds.has(category.id)).toBe(false);
    }

    const originalLevelIds = new Set(rubric.levels.map((l) => l.id));
    for (const level of copy.levels) {
      expect(originalLevelIds.has(level.id)).toBe(false);
    }
  });

  it('returns nothing for a rubric that is not there', async () => {
    expect(await duplicateRubric('nope')).toBeUndefined();
  });
});

describe('quick comments', () => {
  it('seeds the six defaults in order', async () => {
    await seedIfEmpty();
    const rows = await listQuickComments();
    expect(rows).toHaveLength(6);
    expect(rows[0]?.text).toBe('Great effort');
    expect(rows.map((r) => r.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('renumbers after a reorder so order stays contiguous', async () => {
    await seedIfEmpty();
    const rows = await listQuickComments();
    const reversed = [...rows].reverse();

    await saveQuickComments(reversed);

    const saved = await listQuickComments();
    expect(saved.map((r) => r.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(saved[0]?.text).toBe('Not dressed for activity');
  });

  it('removes one without disturbing the rest', async () => {
    await seedIfEmpty();
    const rows = await listQuickComments();
    await saveQuickComments(rows.filter((r) => r.text !== 'Unsafe play'));

    const saved = await listQuickComments();
    expect(saved).toHaveLength(5);
    expect(saved.map((r) => r.text)).not.toContain('Unsafe play');
    expect(saved.map((r) => r.order)).toEqual([0, 1, 2, 3, 4]);
  });
});
