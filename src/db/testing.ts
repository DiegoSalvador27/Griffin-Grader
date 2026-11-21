import { db } from './db';
import { TABLE_NAMES } from './db';

/** Empties every table between tests. Test-only helper. */
export async function resetDb(): Promise<void> {
  if (!db.isOpen()) await db.open();
  await db.transaction('rw', db.tables, async () => {
    for (const table of TABLE_NAMES) {
      await db.table(table).clear();
    }
  });
}
