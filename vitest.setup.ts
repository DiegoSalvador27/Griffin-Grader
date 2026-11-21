import '@testing-library/jest-dom/vitest';
/* Gives jsdom a real IndexedDB so the Dexie repositories can be tested
   without a browser. Must be imported before any module opens the database. */
import 'fake-indexeddb/auto';
