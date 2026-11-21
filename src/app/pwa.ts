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
