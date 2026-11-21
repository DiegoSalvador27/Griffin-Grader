import { describe, it, expect, beforeEach } from 'vitest';
import Dexie, { type Table } from 'dexie';
import { db } from './db';
import { resetDb } from './testing';
import { seedIfEmpty } from './seed';
import { createClass, listClasses, setArchived } from './repos/classes';
import { addStudents, deactivateStudent, listStudents } from './repos/students';
import { listRubrics } from './repos/rubrics';

beforeEach(resetDb);

describe('schema', () => {
  /**
   * Guards the correction documented in db.ts. SPEC section 3 suggests
   * `students: 'id, classId, [classId+active]'`, but `active` is a boolean and
   * IndexedDB rejects booleans as keys. This test proves the suggested index
   * throws, so nobody "fixes" db.ts by adding it back.
   */
  it('cannot index a boolean, which is why active and archived are filtered in memory', async () => {
    class Probe extends Dexie {
      students!: Table<{ id: string; classId: string; active: boolean }, string>;
      constructor() {
        super('griffin-grader-boolean-probe');
        this.version(1).stores({ students: 'id, classId, [classId+active]' });
      }
    }

    const probe = new Probe();
    await probe.students.add({ id: 's1', classId: 'c1', active: true });

    await expect(
      probe.students
        .where('[classId+active]')
        .equals(['c1', true as unknown as string])
        .toArray(),
    ).rejects.toThrow();

    // The indexed lookup we actually use works fine.
    const viaClassId = await probe.students.where('classId').equals('c1').toArray();
    expect(viaClassId).toHaveLength(1);

    await probe.delete();
  });

  it('round-trips a class and its students', async () => {
    const rubric = { id: 'r1' };
    const cls = await createClass({ name: 'PE 10, Block 2', rubricId: rubric.id });
    await addStudents(cls.id, [
      { firstName: 'Bea', lastName: 'Ruiz' },
      { firstName: 'José', lastName: 'Torres', studentNumber: '123456' },
    ]);

    const students = await listStudents(cls.id);
    expect(students).toHaveLength(2);
    expect(students.map((s) => s.firstName).sort()).toEqual(['Bea', 'José']);
    expect(students.find((s) => s.lastName === 'Torres')?.studentNumber).toBe('123456');
  });

  it('hides deactivated students without losing them', async () => {
    const cls = await createClass({ name: 'PE 20', rubricId: 'r1' });
    const [bea, jose] = await addStudents(cls.id, [
      { firstName: 'Bea', lastName: 'Ruiz' },
      { firstName: 'José', lastName: 'Torres' },
    ]);
    expect(bea && jose).toBeTruthy();

    await deactivateStudent(bea!.id);

    expect(await listStudents(cls.id)).toHaveLength(1);
    expect(await listStudents(cls.id, true)).toHaveLength(2);
  });

  it('hides archived classes without losing them', async () => {
    const cls = await createClass({ name: 'Leadership 30', rubricId: 'r1' });
    await setArchived(cls.id, true);

    expect(await listClasses()).toHaveLength(0);
    expect(await listClasses(true)).toHaveLength(1);
  });
});

describe('seed', () => {
  it('creates the default rubric, quick comments and settings', async () => {
    await seedIfEmpty();

    const rubrics = await listRubrics();
    expect(rubrics).toHaveLength(1);

    const rubric = rubrics[0]!;
    expect(rubric.name).toBe('PE Rubric');
    expect(rubric.categories.map((c) => c.name)).toEqual([
      'Skills',
      'Teamwork',
      'Participation',
      'Sportsmanship',
    ]);
    expect(rubric.levels.map((l) => l.code)).toEqual([
      'DV1',
      'DV2',
      'PR1',
      'PR2',
      'EX1',
      'EX2',
    ]);
    // SPEC assumption 1: DV1 is lowest, EX2 highest.
    expect(rubric.levels.map((l) => l.order)).toEqual([0, 1, 2, 3, 4, 5]);

    expect(await db.quickComments.count()).toBe(6);
    expect((await db.settings.get('settings'))?.flagUnassessed).toBe(true);
  });

  it('is safe to run twice', async () => {
    await seedIfEmpty();
    await seedIfEmpty();

    expect(await db.rubrics.count()).toBe(1);
    expect(await db.quickComments.count()).toBe(6);
  });
});
