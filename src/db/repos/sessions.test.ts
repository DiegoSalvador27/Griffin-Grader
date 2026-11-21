import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '../db';
import { resetDb } from '../testing';
import { createClass } from './classes';
import { addStudents } from './students';
import { endSession, findTodaysSession, sessionsInRange, startOrResumeSession } from './sessions';
import { recordAssessment } from './assessments';
import { today } from '../../lib/dates';

beforeEach(resetDb);
afterEach(() => vi.useRealTimers());

describe('startOrResumeSession', () => {
  it('creates a session dated today', async () => {
    const cls = await createClass({ name: 'PE 10', rubricId: 'r1' });
    const session = await startOrResumeSession(cls.id);

    expect(session.date).toBe(today());
    expect(session.endedAt).toBeUndefined();
  });

  it('resumes the same session instead of creating a second one', async () => {
    const cls = await createClass({ name: 'PE 10', rubricId: 'r1' });
    const first = await startOrResumeSession(cls.id);
    const second = await startOrResumeSession(cls.id);

    expect(second.id).toBe(first.id);
    expect(await db.sessions.count()).toBe(1);
  });

  it('reopens today’s session if it was ended by mistake', async () => {
    const cls = await createClass({ name: 'PE 10', rubricId: 'r1' });
    const first = await startOrResumeSession(cls.id);
    await endSession(first.id);

    const resumed = await startOrResumeSession(cls.id);

    expect(resumed.id).toBe(first.id);
    expect(resumed.endedAt).toBeUndefined();
    expect(await db.sessions.count()).toBe(1);
  });

  it('keeps sessions for different classes apart', async () => {
    const a = await createClass({ name: 'PE 10', rubricId: 'r1' });
    const b = await createClass({ name: 'PE 20', rubricId: 'r1' });

    const sa = await startOrResumeSession(a.id);
    const sb = await startOrResumeSession(b.id);

    expect(sa.id).not.toBe(sb.id);
    expect(await db.sessions.count()).toBe(2);
  });

  /**
   * SPEC 4.5: a session left open from an earlier day is closed at its last
   * activity, not at now. A class someone forgot to end on Friday must not look
   * like it ran all weekend.
   */
  it('closes a stale session at its last activity, not at now', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 20, 10, 0)); // Friday 10:00

    const cls = await createClass({ name: 'PE 10', rubricId: 'r1' });
    const [student] = await addStudents(cls.id, [{ firstName: 'Bea', lastName: 'Ruiz' }]);
    const friday = await startOrResumeSession(cls.id);

    vi.setSystemTime(new Date(2026, 10, 20, 10, 45)); // last thing that happened
    await recordAssessment({
      sessionId: friday.id,
      classId: cls.id,
      studentId: student!.id,
      category: { id: 'c1', name: 'Skills' },
      level: { id: 'l1', code: 'PR2' },
    });
    const lastActivity = Date.now();

    vi.setSystemTime(new Date(2026, 10, 23, 9, 0)); // Monday
    const monday = await startOrResumeSession(cls.id);

    expect(monday.id).not.toBe(friday.id);
    expect(monday.date).toBe('2026-11-23');

    const closed = await db.sessions.get(friday.id);
    expect(closed?.endedAt).toBe(lastActivity);
  });

  it('closes a stale session with no activity at its start time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 20, 10, 0));

    const cls = await createClass({ name: 'PE 10', rubricId: 'r1' });
    const friday = await startOrResumeSession(cls.id);

    vi.setSystemTime(new Date(2026, 10, 23, 9, 0));
    await startOrResumeSession(cls.id);

    const closed = await db.sessions.get(friday.id);
    expect(closed?.endedAt).toBe(friday.startedAt);
  });
});

describe('finding sessions', () => {
  it('finds today’s session for a class', async () => {
    const cls = await createClass({ name: 'PE 10', rubricId: 'r1' });
    const session = await startOrResumeSession(cls.id);

    expect((await findTodaysSession(cls.id))?.id).toBe(session.id);
  });

  it('returns nothing when the class has not run today', async () => {
    const cls = await createClass({ name: 'PE 10', rubricId: 'r1' });
    expect(await findTodaysSession(cls.id)).toBeUndefined();
  });

  it('selects sessions inside an inclusive date range', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const cls = await createClass({ name: 'PE 10', rubricId: 'r1' });

    for (const day of [23, 24, 25, 26]) {
      vi.setSystemTime(new Date(2026, 10, day, 10, 0));
      await startOrResumeSession(cls.id);
    }

    const rows = await sessionsInRange(cls.id, '2026-11-24', '2026-11-25');
    expect(rows.map((s) => s.date).sort()).toEqual(['2026-11-24', '2026-11-25']);
  });
});
