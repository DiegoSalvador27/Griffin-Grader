import { db } from '../../db/db';
import { createClass } from '../../db/repos/classes';
import { addStudents } from '../../db/repos/students';
import type { ID } from '../../db/types';

/** Clearly labelled so nobody mistakes it for a real class (SPEC 4.1). */
export const DEMO_CLASS_NAME = 'DEMO class';

const DEMO_NAMES: ReadonlyArray<[string, string]> = [
  ['Alex', 'Morrow'],
  ['Alex', 'Martin'],
  ['Bea', 'Ruiz'],
  ['Cam', "O'Neil"],
  ['Dev', 'Kaur'],
  ['Eli', 'Fournier'],
  ['Finn', 'Novak'],
  ['Gia', 'Haddad'],
  ['Hugo', 'Park'],
  ['Iris', 'Singh'],
  ['José', 'Torres'],
  ['Kira', 'Lund'],
  ['Liam', 'Byrne'],
  ['Mary-Kate', 'Delacroix'],
  ['Noor', 'Ali'],
  ['Omar', 'Wade'],
  ['Priya', 'Chen'],
  ['Rosa', 'Gill'],
  ['Sam', 'Okafor'],
  ['Tara', 'Vo'],
  ['Uma', 'Patel'],
  ['Wes', 'Dubois'],
  ['Yuki', 'Tanaka'],
  ['Zoe', 'Marchand'],
];

/**
 * 24 fake students a teacher can practise on and then delete. The names
 * deliberately include duplicates, an accent, an apostrophe and a hyphen, so
 * the demo exercises the awkward cases rather than hiding them.
 */
export async function createDemoClass(): Promise<ID> {
  const rubric = (await db.rubrics.toArray())[0];
  if (!rubric) throw new Error('No rubric to attach the demo class to');

  const cls = await createClass({ name: DEMO_CLASS_NAME, rubricId: rubric.id });
  await addStudents(
    cls.id,
    DEMO_NAMES.map(([firstName, lastName]) => ({ firstName, lastName })),
  );
  return cls.id;
}
