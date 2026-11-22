import { useCallback, useEffect, useRef } from 'react';

const TAPS_NEEDED = 5;
const WINDOW_MS = 2500;

/**
 * Five taps on the footer watermark inside 2.5 seconds opens the debug panel.
 *
 * The watermark is on every page (it has to be), it is plain text that nobody
 * taps on purpose, and five deliberate taps in a row will not happen by
 * accident. No visible affordance, so a teacher never finds it.
 *
 * Pointer events, not click. iOS Safari only dispatches `click` to elements it
 * considers clickable: natively interactive ones, ones with an inline onclick
 * attribute, or ones with `cursor: pointer`. React attaches its listeners at
 * the root, so a plain <p> with `cursor: default` got no clicks at all on a
 * real iPad. Playwright's WebKit does not share that quirk, so this was
 * invisible in tests. `pointerup` fires on any element.
 */
export function useSecretGesture(onTrigger: () => void): {
  onPointerUp: () => void;
} {
  const taps = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      taps.current = [];
    };
  }, []);

  const onPointerUp = useCallback(() => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now];
    if (taps.current.length >= TAPS_NEEDED) {
      taps.current = [];
      onTrigger();
    }
  }, [onTrigger]);

  return { onPointerUp };
}
