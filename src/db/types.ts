/** Data model, straight from SPEC section 3. */
import type { ID } from '../lib/ids';

export type { ID };

export type Tier = 'DV' | 'PR' | 'EX' | 'other';
export type AttendanceStatus = 'absent' | 'present' | 'late';
export type GridOrder = 'first' | 'last' | 'custom';
export type TeamMode = 'size' | 'count';

/** One rung of the rubric scale. */
export interface Level {
  id: ID;
  code: string; // "DV1"
  label: string; // "Developing 1"
  tier: Tier; // drives colour
  order: number; // 0 = lowest
}

export interface RubricCategory {
  id: ID;
  name: string; // "Skills"
  description?: string;
  order: number;
  /** Categories with existing entries are hidden, never hard-deleted. */
  hidden?: boolean;
}

export interface Rubric {
  id: ID;
  name: string;
  categories: RubricCategory[];
  levels: Level[];
  createdAt: number;
  updatedAt: number;
}

/** "Class" is a reserved-ish word, so ClassGroup. */
export interface ClassGroup {
  id: ID;
  name: string; // "PE 10 - Block 2"
  rubricId: ID;
  gridOrder: GridOrder;
  customOrder: ID[];
  archived: boolean;
  createdAt: number;
}

export interface Student {
  id: ID;
  classId: ID;
  firstName: string;
  lastName: string;
  studentNumber?: string;
  /** Removed students: active=false, history kept. */
  active: boolean;
  createdAt: number;
}

/** One class period. */
export interface Session {
  id: ID;
  classId: ID;
  date: string; // local "YYYY-MM-DD", see lib/dates.ts
  startedAt: number;
  endedAt?: number;
}

export interface Attendance {
  id: ID;
  sessionId: ID;
  studentId: ID;
  status: AttendanceStatus;
  updatedAt: number;
}

/** One rubric entry; the core record. */
export interface Assessment {
  id: ID;
  sessionId: ID;
  classId: ID;
  studentId: ID;
  categoryId: ID;
  /** Snapshot so history survives rubric edits. */
  categoryName: string;
  levelId: ID;
  /** Snapshot, e.g. "PR2". */
  levelCode: string;
  comment: string; // "" when none
  createdAt: number;
  updatedAt: number;
}

export interface Team {
  name: string;
  colorToken: string;
  studentIds: ID[];
}

export interface TeamSet {
  id: ID;
  sessionId: ID;
  classId: ID;
  mode: TeamMode;
  n: number;
  presentOnly: boolean;
  teams: Team[];
  createdAt: number;
}

export interface QuickComment {
  id: ID;
  text: string;
  order: number;
}

/** Single row, id = 'settings'. */
export interface Settings {
  id: 'settings';
  teacherName?: string;
  flagUnassessed: boolean;
  lastBackupAt?: number;
  onboardingDone: boolean;
}
