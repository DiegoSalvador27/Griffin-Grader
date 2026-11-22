import '@testing-library/jest-dom/vitest';
/* Gives jsdom a real IndexedDB so the Dexie repositories can be tested
   without a browser. Must be imported before any module opens the database. */
import 'fake-indexeddb/auto';

/* jsdom has no matchMedia. The app guards every call, but stubbing it here
   keeps component tests behaving like a browser. */
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
