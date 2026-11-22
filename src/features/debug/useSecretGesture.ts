import { useCallback, useEffect, useRef } from 'react';

const TAPS_NEEDED = 5;
const WINDOW_MS = 2500;

/**
 * Five taps on the footer watermark inside 2.5 seconds opens the debug panel.
 *
 * The watermark is on every page (it has to be), it is plain text that nobody
 * taps on purpose, and five deliberate taps in a row will not happen by
 * accident. No visible affordance, so a teacher never finds it.
 */
export function useSecretGesture(onTrigger: () => void): { onClick: () => void } {
  const taps = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      taps.current = [];
    };
  }, []);

  const onClick = useCallback(() => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now];
    if (taps.current.length >= TAPS_NEEDED) {
      taps.current = [];
      onTrigger();
    }
  }, [onTrigger]);

  return { onClick };
}
