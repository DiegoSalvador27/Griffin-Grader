import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { resetDb } from '../testing';
import { seedIfEmpty } from '../seed';
import { createClass } from './classes';
import { addStudents } from './students';
import { startOrResumeSession } from './sessions';
import { setStatus } from './attendance';
import { recordAssessment } from './assessments';
import type { BackupData } from './backup';
import {
  BackupFormatError,
  backupFilename,
  countsOf,
  eraseEverything,
  exportBackup,
  parseBackup,
  restoreBackup,
  SCHEMA_VERSION,
} from './backup';

beforeEach(resetDb);

/** Builds a database with a bit of everything in it. */
async function populate() {
  await seedIfEmpty();
  const rubric = (await db.rubrics.toArray())[0]!;
  const cls = await createClass({ name: 'PE 10, Block 2', rubricId: rubric.id });
  const students = await addStudents(cls.id, [
    { firstName: 'Bea', lastName: 'Ruiz' },
    { firstName: 'José', lastName: 'Torres', studentNumber: '123456' },
    { firstName: "Cam", lastName: "O'Neil" },
  ]);
  const session = await startOrResumeSession(cls.id);

  await setStatus(session.id, students[1]!.id, 'late');

  const category = rubric.categories[0]!;
  const level = rubric.levels[3]!;
  await recordAssessment({
    sessionId: session.id,
    classId: cls.id,
    studentId: students[0]!.id,
    category,
    level,
    comment: 'Great effort, kept the rally alive',
  });
  await recordAssessment({
    sessionId: session.id,
    classId: cls.id,
    studentId: students[1]!.id,
    category: rubric.categories[1]!,
    level: rubric.levels[4]!,
  });

  return { cls, students, session, rubric };
}

describe('backup round-trip', () => {
  /* SPEC section 7: backup then erase then restore must produce identical data. */
  it('restores byte-identical data after erasing everything', async () => {
    await populate();

    const before = await exportBackup();
    const beforeCounts = countsOf(before.data);

    await eraseEverything();
    expect(await db.assessments.count()).toBe(0);
    expect(await db.students.count()).toBe(0);

    const restoredCounts = await restoreBackup(before);
    expect(restoredCounts).toEqual(beforeCounts);

    const after = await exportBackup();

    // exportedAt moves, so compare the payload only.
    expect(sorted(after.data)).toEqual(sorted(before.data));
  });

  it('reports counts a teacher can sanity check', async () => {
    const { students } = await populate();
    const file = await exportBackup();
    const counts = countsOf(file.data);

    expect(counts.classes).toBe(1);
    expect(counts.students).toBe(students.length);
    expect(counts.assessments).toBe(2);
    expect(counts.rubrics).toBe(1);
  });

  it('survives a JSON stringify and parse, which is how it reaches the iPad', async () => {
    await populate();
    const file = await exportBackup();

    const reparsed = parseBackup(JSON.parse(JSON.stringify(file)));
    await eraseEverything();
    await restoreBackup(reparsed);

    expect(await db.assessments.count()).toBe(2);
    expect((await db.students.toArray()).map((s) => s.lastName).sort()).toEqual([
      "O'Neil",
      'Ruiz',
      'Torres',
    ]);
  });

  it('keeps accented and apostrophed names intact', async () => {
    await populate();
    const file = await exportBackup();
    await eraseEverything();
    await restoreBackup(parseBackup(JSON.parse(JSON.stringify(file))));

    const names = (await db.students.toArray()).map((s) => `${s.firstName} ${s.lastName}`);
    expect(names).toContain('José Torres');
    expect(names).toContain("Cam O'Neil");
  });

  it('handles a restore larger than one bulkAdd chunk', async () => {
    await seedIfEmpty();
    const cls = await createClass({ name: 'Big', rubricId: 'r1' });
    await addStudents(
      cls.id,
      Array.from({ length: 2500 }, (_, i) => ({
        firstName: `Student${i}`,
        lastName: 'Test',
      })),
    );

    const file = await exportBackup();
    await eraseEverything();
    await restoreBackup(file);

    expect(await db.students.count()).toBe(2500);
  });
});

describe('parseBackup', () => {
  it('rejects a file that is not a backup', () => {
    expect(() => parseBackup(null)).toThrow(BackupFormatError);
    expect(() => parseBackup({ hello: 'world' })).toThrow(BackupFormatError);
  });

  it('rejects a backup from a newer app version', () => {
    expect(() =>
      parseBackup({ schemaVersion: SCHEMA_VERSION + 1, data: {} }),
    ).toThrow(/newer version/);
  });

  it('rejects a damaged table', () => {
    expect(() =>
      parseBackup({ schemaVersion: SCHEMA_VERSION, data: { students: 'nope' } }),
    ).toThrow(/damaged/);
  });

  it('treats a missing table as empty rather than failing', () => {
    const file = parseBackup({ schemaVersion: SCHEMA_VERSION, data: { classes: [] } });
    expect(file.data.assessments).toEqual([]);
    expect(file.data.students).toEqual([]);
  });
});

describe('backupFilename', () => {
  it('includes the teacher name when there is one', () => {
    expect(backupFilename('Mr. Dee', '2026-11-21')).toBe(
      'griffin-grader_backup_mr-dee_2026-11-21.json',
    );
  });

  it('omits it when there is not', () => {
    expect(backupFilename(undefined, '2026-11-21')).toBe(
      'griffin-grader_backup_2026-11-21.json',
    );
  });
});

/** Table order out of IndexedDB is not guaranteed, so sort before comparing. */
function sorted(data: BackupData): Record<string, unknown[]> {
  return Object.fromEntries(
    Object.entries(data as unknown as Record<string, unknown[]>).map(([k, rows]) => [
      k,
      [...rows].sort((a, b) =>
        String((a as { id?: string }).id).localeCompare(String((b as { id?: string }).id)),
      ),
    ]),
  );
}
