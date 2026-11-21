import type { ID } from '../../db/types';

/**
 * Random team splitting (SPEC 4.5).
 *
 * Two modes:
 *   size   "groups of N"  -> ceil(count / N) teams, then balanced
 *   count  "N groups"     -> exactly N teams, then balanced
 *
 * Balanced means sizes differ by at most one. That is why "groups of 4" with
 * 22 students gives 4,4,4,4,3,3 rather than 4,4,4,4,4,2: the spec is explicit
 * that a tiny leftover team is never acceptable, because a team of 2 against
 * teams of 4 is not a game.
 */

export type RandomSource = () => number;

export interface SplitOptions {
  mode: 'size' | 'count';
  n: number;
  /** Injectable so tests are deterministic. Defaults to Math.random. */
  random?: RandomSource;
}

/** Fisher-Yates. Returns a new array; the input is not touched. */
export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    // Guarded for noUncheckedIndexedAccess; both indices are always in range.
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

/** How many teams to make, given the mode. */
export function teamCount(total: number, options: Pick<SplitOptions, 'mode' | 'n'>): number {
  if (total <= 0) return 0;
  const n = Math.max(1, Math.floor(options.n));

  if (options.mode === 'count') return Math.min(n, total);
  // "Groups of N": enough teams to hold everyone, then balance across them.
  return Math.max(1, Math.ceil(total / n));
}

/**
 * Sizes for `teams` teams holding `total` students, differing by at most one.
 * The larger teams come first, so 22 into 6 gives [4,4,4,4,3,3].
 */
export function teamSizes(total: number, teams: number): number[] {
  if (teams <= 0) return [];
  const base = Math.floor(total / teams);
  const remainder = total % teams;
  return Array.from({ length: teams }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** Splits student ids into balanced teams. Every id appears exactly once. */
export function splitIntoTeams(
  studentIds: readonly ID[],
  options: SplitOptions,
): ID[][] {
  if (studentIds.length === 0) return [];

  const shuffled = shuffle(studentIds, options.random ?? Math.random);
  const count = teamCount(shuffled.length, options);
  const sizes = teamSizes(shuffled.length, count);

  const teams: ID[][] = [];
  let cursor = 0;
  for (const size of sizes) {
    teams.push(shuffled.slice(cursor, cursor + size));
    cursor += size;
  }
  return teams;
}

/** Eight team colours defined as theme tokens, cycled if there are more teams. */
export const TEAM_COLOR_TOKENS = [
  '--team-1',
  '--team-2',
  '--team-3',
  '--team-4',
  '--team-5',
  '--team-6',
  '--team-7',
  '--team-8',
] as const;

export function colorTokenFor(index: number): string {
  return TEAM_COLOR_TOKENS[index % TEAM_COLOR_TOKENS.length] ?? '--team-1';
}
