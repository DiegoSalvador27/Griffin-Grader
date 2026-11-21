import Dexie, { type Table } from 'dexie';
import type {
  Assessment,
  Attendance,
  ClassGroup,
  QuickComment,
  Rubric,
  Session,
  Settings,
  Student,
  TeamSet,
} from './types';

/**
 * The one database. All access goes through src/db/repos/*, never from a
 * component (SPEC section 7).
 *
 * Indexes follow SPEC section 3 with two corrections. SPEC suggests
 * `classes: 'id, archived'` and `students: 'id, classId, [classId+active]'`,
 * but `archived` and `active` are booleans, and a boolean is not a valid
 * IndexedDB key. Querying `[classId+active]` does not quietly return nothing,
 * it throws DataError, so every "active students in this class" lookup would
 * have failed. Both columns are dropped from the index and filtered in memory
 * instead: a class holds about 40 students, so the scan costs nothing.
 * Regression test: src/db/db.test.ts.
 */
export class GriffinDB extends Dexie {
  rubrics!: Table<Rubric, string>;
  classes!: Table<ClassGroup, string>;
  students!: Table<Student, string>;
  sessions!: Table<Session, string>;
  attendance!: Table<Attendance, string>;
  assessments!: Table<Assessment, string>;
  teamSets!: Table<TeamSet, string>;
  quickComments!: Table<QuickComment, string>;
  settings!: Table<Settings, string>;

  constructor(name = 'griffin-grader') {
    super(name);

    this.version(1).stores({
      rubrics: 'id',
      classes: 'id',
      students: 'id, classId',
      sessions: 'id, classId, date, [classId+date]',
      attendance: 'id, sessionId, studentId, &[sessionId+studentId]',
      assessments:
        'id, sessionId, classId, studentId, createdAt, [classId+createdAt], [studentId+createdAt]',
      teamSets: 'id, sessionId, classId',
      quickComments: 'id, order',
      settings: 'id',
    });
  }
}

export const db = new GriffinDB();

/** Table names in a stable order, used by backup and restore. */
export const TABLE_NAMES = [
  'rubrics',
  'classes',
  'students',
  'sessions',
  'attendance',
  'assessments',
  'teamSets',
  'quickComments',
  'settings',
] as const;

export type TableName = (typeof TABLE_NAMES)[number];
