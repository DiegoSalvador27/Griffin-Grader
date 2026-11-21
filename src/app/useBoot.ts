import { useEffect, useState } from 'react';
import { seedIfEmpty } from '../db/seed';
import { requestPersistentStorage } from '../db/repos/settings';

/**
 * First-launch work: seed the default rubric and ask iPadOS to keep the data.
 *
 * SPEC 4.1 asks for `navigator.storage.persist()` the first time data is
 * written. Seeding is that first write, so the request rides along here. It is
 * a request, not a guarantee, and on iOS it frequently resolves false, which is
 * why the app still nags about backups.
 */
export function useBoot(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await seedIfEmpty();
        await requestPersistentStorage();
      } catch (error) {
        // A failed seed must not leave a blank screen: the app still works,
        // it just has no default rubric yet.
        console.error('Griffin Grader: could not prepare the database', error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
