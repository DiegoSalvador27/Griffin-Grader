/**
 * Blocks pinch-zoom and double-tap zoom.
 *
 * The viewport meta handles this for an installed Home Screen app, but Safari
 * ignores `user-scalable=no` in a normal tab, and iPadOS fires its own
 * non-standard `gesture*` events for a two-finger pinch. Cancelling those
 * covers the tab case too.
 *
 * Deliberately does NOT block ordinary scrolling: `touchmove` is left alone,
 * so momentum scrolling inside `.scroll-region` still works.
 */
export function blockZoomGestures(): () => void {
  const stop = (e: Event): void => e.preventDefault();

  // iOS-only pinch events.
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('gesturechange', stop, { passive: false });
  document.addEventListener('gestureend', stop, { passive: false });

  // Double-tap zoom: a second tap inside 300ms of the first.
  let lastTouchEnd = 0;
  const onTouchEnd = (e: TouchEvent): void => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  };
  document.addEventListener('touchend', onTouchEnd, { passive: false });

  return () => {
    document.removeEventListener('gesturestart', stop);
    document.removeEventListener('gesturechange', stop);
    document.removeEventListener('gestureend', stop);
    document.removeEventListener('touchend', onTouchEnd);
  };
}
