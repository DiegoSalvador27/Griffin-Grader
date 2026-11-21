import { db, TABLE_NAMES, type TableName } from '../db';
import { updateSettings } from './settings';
import { buildDefaultQuickComments, buildDefaultRubric, DEFAULT_SETTINGS } from '../seed';
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
} from '../types';

/** Bump when the stored shape changes, and add a migration in `migrate`. */
export const SCHEMA_VERSION = 1;

export const BACKUP_APP = 'Griffin Grader by Diego D.';

export interface BackupData {
  rubrics: Rubric[];
  classes: ClassGroup[];
  students: Student[];
  sessions: Session[];
  attendance: Attendance[];
  assessments: Assessment[];
  teamSets: TeamSet[];
  quickComments: QuickComment[];
  settings: Settings[];
}

export interface BackupFile {
  app: string;
  schemaVersion: number;
  exportedAt: number;
  data: BackupData;
}

export type BackupCounts = Record<TableName, number>;

/** Rows per bulkAdd. A full school year is six figures of assessments, and
    handing that to IndexedDB as one array spikes memory on an iPad. */
const CHUNK = 2000;

export async function exportBackup(): Promise<BackupFile> {
  const [
    rubrics,
    classes,
    students,
    sessions,
    attendance,
    assessments,
    teamSets,
    quickComments,
    settings,
  ] = await db.transaction('r', db.tables, () =>
    Promise.all([
      db.rubrics.toArray(),
      db.classes.toArray(),
      db.students.toArray(),
      db.sessions.toArray(),
      db.attendance.toArray(),
      db.assessments.toArray(),
      db.teamSets.toArray(),
      db.quickComments.toArray(),
      db.settings.toArray(),
    ]),
  );

  return {
    app: BACKUP_APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    data: {
      rubrics,
      classes,
      students,
      sessions,
      attendance,
      assessments,
      teamSets,
      quickComments,
      settings,
    },
  };
}

export function countsOf(data: BackupData): BackupCounts {
  return Object.fromEntries(
    TABLE_NAMES.map((t) => [t, data[t]?.length ?? 0]),
  ) as BackupCounts;
}

export class BackupFormatError extends Error {}

/**
 * Checks a parsed JSON blob really is one of our backups before anything is
 * erased. A restore replaces everything, so a wrong file must fail here rather
 * than halfway through.
 */
export function parseBackup(raw: unknown): BackupFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new BackupFormatError('That file is not a Griffin Grader backup.');
  }

  const file = raw as Partial<BackupFile>;

  if (typeof file.schemaVersion !== 'number') {
    throw new BackupFormatError('That file is missing its version, so it cannot be read.');
  }
  if (file.schemaVersion > SCHEMA_VERSION) {
    throw new BackupFormatError(
      `That backup was made by a newer version of Griffin Grader (version ${file.schemaVersion}). Update the app first.`,
    );
  }
  if (typeof file.data !== 'object' || file.data === null) {
    throw new BackupFormatError('That backup has no data in it.');
  }

  const data = file.data as unknown as Record<string, unknown>;
  for (const table of TABLE_NAMES) {
    const rows = data[table];
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new BackupFormatError(`That backup's "${table}" section is damaged.`);
    }
  }

  return migrate({
    app: typeof file.app === 'string' ? file.app : BACKUP_APP,
    schemaVersion: file.schemaVersion,
    exportedAt: typeof file.exportedAt === 'number' ? file.exportedAt : Date.now(),
    // Missing tables are treated as empty rather than fatal: a backup from an
    // older build may simply not have had one.
    data: Object.fromEntries(
      TABLE_NAMES.map((t) => [t, Array.isArray(data[t]) ? data[t] : []]),
    ) as unknown as BackupData,
  });
}

/** Brings an older backup up to the current shape. */
function migrate(file: BackupFile): BackupFile {
  // Only version 1 exists so far. Future versions add their steps here.
  return file;
}

/**
 * Replaces everything with the backup's contents, in one transaction. Either
 * the whole restore lands or none of it does.
 */
export async function restoreBackup(file: BackupFile): Promise<BackupCounts> {
  const { data } = file;

  await db.transaction('rw', db.tables, async () => {
    for (const table of TABLE_NAMES) {
      await db.table(table).clear();
    }
    for (const table of TABLE_NAMES) {
      const rows = data[table] as unknown[];
      for (let i = 0; i < rows.length; i += CHUNK) {
        await db.table(table).bulkAdd(rows.slice(i, i + CHUNK));
      }
    }

    // Same reasoning as eraseEverything: a backup written by an older build,
    // or one missing a section, must not leave the app without a rubric.
    if ((await db.rubrics.count()) === 0) {
      await db.rubrics.add(buildDefaultRubric());
    }
    if (!(await db.settings.get('settings'))) {
      await db.settings.add(DEFAULT_SETTINGS);
    }
  });

  return countsOf(data);
}

/**
 * SPEC 4.8 "Erase everything". The caller gates this behind typing ERASE.
 *
 * The default rubric, quick comments and settings row are put back afterwards.
 * They are app defaults, not the teacher's data, and without them the app is
 * stranded: the Rubrics page comes back empty with no way to make one, so a
 * new class cannot be created at all. Erasing has to leave a working app, not
 * a dead one.
 */
export async function eraseEverything(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of TABLE_NAMES) {
      await db.table(table).clear();
    }
    await db.rubrics.add(buildDefaultRubric());
    await db.quickComments.bulkAdd(buildDefaultQuickComments());
    await db.settings.add(DEFAULT_SETTINGS);
  });
}

export async function markBackedUp(at = Date.now()): Promise<void> {
  await updateSettings({ lastBackupAt: at });
}

/** `griffin-grader_backup_dee_2026-11-21.json` */
export function backupFilename(teacherName: string | undefined, date: string): string {
  const who = teacherName?.trim()
    ? `_${teacherName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : '';
  return `griffin-grader_backup${who}_${date}.json`;
}
