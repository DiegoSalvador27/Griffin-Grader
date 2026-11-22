import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker registration and the update prompt.
 *
 * SPEC 4.8: never auto-reload while a class session is open. A teacher who
 * loses the screen mid-period loses their place, so the new worker waits and
 * the teacher chooses when to take it. `holdUpdates` is how the live class
 * screen says "not now"; it is set from the session hooks in the live feature.
 */

let updateReady: (() => void) | null = null;
let notify: ((ready: boolean) => void) | null = null;
let pendingWhileHeld = false;
let held = false;

/** Called by the live class screen while a session is open. */
export function holdUpdates(hold: boolean): void {
  held = hold;
  // A worker that became ready during a class is offered as soon as it ends.
  if (!hold && pendingWhileHeld) {
    pendingWhileHeld = false;
    notify?.(true);
  }
}

/** Subscribe to "an update is waiting". Returns an unsubscribe function. */
export function onUpdateReady(cb: (ready: boolean) => void): () => void {
  notify = cb;
  return () => {
    notify = null;
  };
}

/** Apply the waiting update. This reloads the page. */
export function applyUpdate(): void {
  updateReady?.();
}

export function registerServiceWorker(): void {
  updateReady = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (held) {
        pendingWhileHeld = true;
        return;
      }
      notify?.(true);
    },
  });
}

/**
 * Forces the newest build to install, now.
 *
 * The app is deliberately `registerType: 'prompt'` so a class is never
 * interrupted, which means a waiting worker can sit there indefinitely if the
 * banner is missed. This is the manual escape hatch, reachable from the debug
 * panel: ask the worker to re-check, tell any waiting worker to take over,
 * then reload once it does.
 *
 * Returns what happened so the caller can tell the user something true.
 */
export async function forceUpdateNow(): Promise<'updating' | 'already-current' | 'unsupported'> {
  if (!('serviceWorker' in navigator)) return 'unsupported';

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return 'unsupported';

  // Ask the server whether there is a newer worker.
  try {
    await registration.update();
  } catch {
    // Offline, or the check failed. Fall through: there may still be one
    // waiting from an earlier check.
  }

  const waiting = registration.waiting;
  if (!waiting) return 'already-current';

  // Reload once the new worker has actually taken control, not before.
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => window.location.reload(),
    { once: true },
  );
  waiting.postMessage({ type: 'SKIP_WAITING' });
  return 'updating';
}
