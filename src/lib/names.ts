import type { ID, Student } from '../db/types';

/**
 * Tile labels (SPEC 4.5).
 *
 * A tile shows big initials and then "first name + last initial". When two
 * students collide, the last-name prefix grows a letter at a time until they
 * separate: "Alex Mo." and "Alex Ma.". Only the colliding names grow, so the
 * grid stays short.
 */

/** First letter of each name, uppercased. "Bea Ruiz" gives "BR". */
export function initials(student: Pick<Student, 'firstName' | 'lastName'>): string {
  const first = [...student.firstName.trim()][0] ?? '';
  const last = [...student.lastName.trim()][0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export function fullName(student: Pick<Student, 'firstName' | 'lastName'>): string {
  return `${student.firstName} ${student.lastName}`.trim();
}

/** "Bea R." for a given prefix length, or just the first name when there is
    no last name to abbreviate. */
function label(
  student: Pick<Student, 'firstName' | 'lastName'>,
  prefixLength: number,
): string {
  const last = student.lastName.trim();
  if (last === '') return student.firstName.trim();

  const chars = [...last];
  const prefix = chars.slice(0, Math.min(prefixLength, chars.length)).join('');
  // Once the whole surname is shown there is nothing left to abbreviate.
  const suffix = prefix.length >= chars.length ? '' : '.';
  return `${student.firstName.trim()} ${prefix}${suffix}`;
}

/**
 * Grouping key for collision detection.
 *
 * Deliberately NOT the rendered label. Comparing labels makes "Alex Martin"
 * and "Alex Martin." count as different, so Martin and Martinez would separate
 * on nothing but a full stop, which is invisible across a gym. Comparing the
 * prefix itself keeps growing until the names actually differ by a letter.
 */
function prefixKey(
  student: Pick<Student, 'firstName' | 'lastName'>,
  prefixLength: number,
): string {
  const last = [...student.lastName.trim()].slice(0, prefixLength).join('');
  return `${student.firstName.trim()}|${last}`.toLowerCase();
}

/**
 * Builds a display label per student, lengthening surnames only where two
 * students would otherwise read identically.
 */
export function displayNames(
  students: readonly Pick<Student, 'id' | 'firstName' | 'lastName'>[],
): Map<ID, string> {
  const result = new Map<ID, string>();
  const byKey = new Map<string, typeof students>();

  for (const s of students) {
    const key = prefixKey(s, 1);
    byKey.set(key, [...(byKey.get(key) ?? []), s]);
  }

  for (const [, group] of byKey) {
    if (group.length === 1) {
      const only = group[0];
      if (only) result.set(only.id, label(only, 1));
      continue;
    }
    resolveCollision(group, 1, result);
  }

  return result;
}

/** Grows the surname prefix until the group separates or surnames run out. */
function resolveCollision(
  group: readonly Pick<Student, 'id' | 'firstName' | 'lastName'>[],
  prefixLength: number,
  result: Map<ID, string>,
): void {
  const longest = Math.max(...group.map((s) => [...s.lastName.trim()].length));

  // Out of letters: these students are genuinely indistinguishable by name, so
  // show the full name and let the teacher tell them apart by position.
  if (prefixLength > longest) {
    for (const s of group) result.set(s.id, fullName(s));
    return;
  }

  const buckets = new Map<string, typeof group>();
  for (const s of group) {
    const key = prefixKey(s, prefixLength);
    buckets.set(key, [...(buckets.get(key) ?? []), s]);
  }

  for (const [, bucket] of buckets) {
    if (bucket.length === 1) {
      const only = bucket[0];
      if (only) result.set(only.id, label(only, prefixLength));
    } else {
      resolveCollision(bucket, prefixLength + 1, result);
    }
  }
}
