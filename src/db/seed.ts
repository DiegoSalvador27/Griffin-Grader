import { db } from './db';
import { newId } from '../lib/ids';
import type { Level, QuickComment, Rubric, RubricCategory, Settings } from './types';

/** Defaults seeded on first run (SPEC section 3). All of it is editable later. */

const LEVEL_SEED: ReadonlyArray<Pick<Level, 'code' | 'label' | 'tier'>> = [
  { code: 'DV1', label: 'Developing 1', tier: 'DV' },
  { code: 'DV2', label: 'Developing 2', tier: 'DV' },
  { code: 'PR1', label: 'Proficient 1', tier: 'PR' },
  { code: 'PR2', label: 'Proficient 2', tier: 'PR' },
  { code: 'EX1', label: 'Extending 1', tier: 'EX' },
  { code: 'EX2', label: 'Extending 2', tier: 'EX' },
];

const CATEGORY_SEED: ReadonlyArray<Pick<RubricCategory, 'name' | 'description'>> = [
  { name: 'Skills', description: 'Performs the movement with control' },
  { name: 'Teamwork', description: 'Includes others and shares the play' },
  { name: 'Participation', description: 'Takes part for the whole period' },
  { name: 'Sportsmanship', description: 'Fair play, wins and loses well' },
];

const QUICK_COMMENT_SEED: readonly string[] = [
  'Great effort',
  'Helped a teammate',
  'Needs to stay on task',
  'Strong leadership',
  'Unsafe play',
  'Not dressed for activity',
];

export function buildDefaultRubric(now = Date.now()): Rubric {
  return {
    id: newId(),
    name: 'PE Rubric',
    categories: CATEGORY_SEED.map((c, i) => ({ id: newId(), ...c, order: i })),
    levels: LEVEL_SEED.map((l, i) => ({ id: newId(), ...l, order: i })),
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDefaultQuickComments(): QuickComment[] {
  return QUICK_COMMENT_SEED.map((text, i) => ({ id: newId(), text, order: i }));
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  flagUnassessed: true,
  onboardingDone: false,
};

/**
 * Creates the default rubric, quick comments and settings row if they are
 * missing. Safe to call on every launch: it only fills gaps, and it never
 * touches a table that already has rows.
 */
export async function seedIfEmpty(): Promise<void> {
  await db.transaction('rw', db.rubrics, db.quickComments, db.settings, async () => {
    if ((await db.rubrics.count()) === 0) {
      await db.rubrics.add(buildDefaultRubric());
    }
    if ((await db.quickComments.count()) === 0) {
      await db.quickComments.bulkAdd(buildDefaultQuickComments());
    }
    if (!(await db.settings.get('settings'))) {
      await db.settings.add(DEFAULT_SETTINGS);
    }
  });
}
