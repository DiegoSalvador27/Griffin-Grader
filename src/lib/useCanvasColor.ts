import { useEffect } from 'react';

/**
 * Matches the browser canvas to the colour at the bottom of the screen.
 *
 * On an installed iPad app the viewport can be shorter than the physical
 * screen (see the note on `html` in global.css). The leftover band is painted
 * with the canvas background and is unreachable by any element, so the only
 * way to hide it is to make it the same colour as whatever the screen ends in.
 *
 * Defaults back to the page colour on unmount, so a screen never leaves the
 * wrong colour behind.
 */
export function useCanvasColor(canvas: 'page' | 'card'): void {
  useEffect(() => {
    const root = document.documentElement;
    if (canvas === 'card') root.dataset.canvas = 'card';
    else delete root.dataset.canvas;

    return () => {
      delete root.dataset.canvas;
    };
  }, [canvas]);
}
