/**
 * Keeps the iPad awake while a class is running (SPEC 4.5).
 *
 * Wake Lock landed in Safari 16.4, so older iPads simply keep their normal
 * auto-lock. Feature-detected and silent on failure: a teacher must never see
 * an error about a convenience feature.
 *
 * iPadOS drops the lock whenever the page is hidden, so it is re-requested on
 * visibilitychange.
 */

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

export function keepAwake(): () => void {
  const nav = navigator as NavigatorWithWakeLock;
  if (!nav.wakeLock) return () => {};

  let sentinel: WakeLockSentinelLike | null = null;
  let stopped = false;

  const acquire = async (): Promise<void> => {
    if (stopped || document.visibilityState !== 'visible') return;
    try {
      sentinel = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      // Denied or unsupported. The screen just dims as usual.
    }
  };

  const onVisibility = (): void => {
    if (document.visibilityState === 'visible' && (sentinel === null || sentinel.released)) {
      void acquire();
    }
  };

  void acquire();
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onVisibility);
    void sentinel?.release().catch(() => {});
    sentinel = null;
  };
}
