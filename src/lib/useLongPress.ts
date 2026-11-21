import { useCallback, useRef } from 'react';

/**
 * Press-and-hold on a student tile to cycle attendance (SPEC 4.5).
 *
 * This fights three native iPadOS gestures at once: text selection, the
 * copy/share callout, and press-and-drag. The CSS side is handled by
 * `.touch-target` in global.css; this handles the rest:
 *
 * - cancels if the finger travels past a slop radius, so a scroll is a scroll
 * - cancels on pointercancel, which is what iPadOS fires when it takes the
 *   gesture over for scrolling
 * - suppresses the click that follows a completed long press, so one gesture
 *   never both cycles attendance AND opens the student sheet
 */

const HOLD_MS = 500;
const SLOP_PX = 12;

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function useLongPress(
  onLongPress: () => void,
  onTap: () => void,
  holdMs = HOLD_MS,
): LongPressHandlers {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        timer.current = null;
        onLongPress();
      }, holdMs);
    },
    [holdMs, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current || timer.current === null) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (Math.hypot(dx, dy) > SLOP_PX) clear();
    },
    [clear],
  );

  const onPointerUp = useCallback(() => clear(), [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
    fired.current = false;
  }, [clear]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      // A completed hold already did its job; the trailing click must not
      // also open the sheet.
      if (fired.current) {
        fired.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onTap();
    },
    [onTap],
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Stops the iOS callout and the desktop right-click menu on a held tile.
    e.preventDefault();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClick,
    onContextMenu,
  };
}
