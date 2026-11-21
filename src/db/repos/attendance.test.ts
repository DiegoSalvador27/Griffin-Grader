import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb } from '../testing';
import { createClass } from './classes';
import { addStudents } from './students';
import { startOrResumeSession } from './sessions';
import {
  countStatuses,
  cycleStatus,
  nextStatus,
  setAllStatuses,
  setStatus,
  statusFor,
  statusMapForSession,
} from './attendance';
import { recordAssessment } from './assessments';
import type { ID } from '../types';

beforeEach(resetDb);

async function makeClass(names: string[]): Promise<{ classId: ID; ids: ID[] }> {
  const cls = await createClass({ name: 'PE 10', rubricId: 'r1' });
  const students = await addStudents(
    cls.id,
    names.map((n) => ({ firstName: n, lastName: 'X' })),
  );
  return { classId: cls.id, ids: students.map((s) => s.id) };
}

describe('nextStatus', () => {
  it('cycles absent to present to late and back', () => {
    expect(nextStatus('absent')).toBe('present');
    expect(nextStatus('present')).toBe('late');
    expect(nextStatus('late')).toBe('absent');
  });
});

describe('attendance', () => {
  it('treats a student with no row as absent', async () => {
    const { classId, ids } = await makeClass(['Bea']);
    const session = await startOrResumeSession(classId);

    expect(await statusFor(session.id, ids[0]!)).toBe('absent');
  });

  it('cycles a student through the three states', async () => {
    const { classId, ids } = await makeClass(['Bea']);
    const session = await startOrResumeSession(classId);

    expect(await cycleStatus(session.id, ids[0]!)).toBe('present');
    expect(await cycleStatus(session.id, ids[0]!)).toBe('late');
    expect(await cycleStatus(session.id, ids[0]!)).toBe('absent');
  });

  it('keeps one row per student per session', async () => {
    const { classId, ids } = await makeClass(['Bea']);
    const session = await startOrResumeSession(classId);

    await setStatus(session.id, ids[0]!, 'present');
    await setStatus(session.id, ids[0]!, 'late');

    const map = await statusMapForSession(session.id);
    expect(map.size).toBe(1);
    expect(map.get(ids[0]!)).toBe('late');
  });

  it('counts students with no row as absent', async () => {
    const { classId, ids } = await makeClass(['A', 'B', 'C', 'D']);
    const session = await startOrResumeSession(classId);

    await setStatus(session.id, ids[0]!, 'present');
    await setStatus(session.id, ids[1]!, 'late');

    const counts = countStatuses(ids, await statusMapForSession(session.id));
    expect(counts).toEqual({ present: 1, late: 1, absent: 2 });
  });

  it('marks everyone present in one go', async () => {
    const { classId, ids } = await makeClass(['A', 'B', 'C']);
    const session = await startOrResumeSession(classId);

    await setAllStatuses(session.id, ids, 'present');

    const counts = countStatuses(ids, await statusMapForSession(session.id));
    expect(counts).toEqual({ present: 3, late: 0, absent: 0 });
  });

  /* SPEC 4.5 and assumption 2. */
  it('marks an absent student present when they are graded', async () => {
    const { classId, ids } = await makeClass(['Bea']);
    const session = await startOrResumeSession(classId);

    const result = await recordAssessment({
      sessionId: session.id,
      classId,
      studentId: ids[0]!,
      category: { id: 'cat1', name: 'Skills' },
      level: { id: 'lvl4', code: 'PR2' },
    });

    expect(result.markedPresent).toBe(true);
    expect(await statusFor(session.id, ids[0]!)).toBe('present');
  });

  it('leaves a late student late when they are graded', async () => {
    const { classId, ids } = await makeClass(['Bea']);
    const session = await startOrResumeSession(classId);
    await setStatus(session.id, ids[0]!, 'late');

    const result = await recordAssessment({
      sessionId: session.id,
      classId,
      studentId: ids[0]!,
      category: { id: 'cat1', name: 'Skills' },
      level: { id: 'lvl4', code: 'PR2' },
    });

    expect(result.markedPresent).toBe(false);
    expect(await statusFor(session.id, ids[0]!)).toBe('late');
  });
});
