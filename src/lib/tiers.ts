import type { Tier } from '../db/types';

/**
 * Tier from a level code's prefix.
 *
 * Derived from the snapshot string rather than looked up in the rubric, so an
 * entry recorded as "PR2" still renders in the right colour after the level it
 * came from has been renamed or deleted.
 */
export function tierOf(levelCode: string): Tier {
  const prefix = levelCode.slice(0, 2).toUpperCase();
  if (prefix === 'DV') return 'DV';
  if (prefix === 'PR') return 'PR';
  if (prefix === 'EX') return 'EX';
  return 'other';
}
