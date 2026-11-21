/**
 * ID generation.
 *
 * SPEC 2 specifies `crypto.randomUUID()`. That is a secure-context API, so it
 * is undefined over plain http. CLAUDE.md tells Diego to run
 * `npm run dev -- --host` and open the app from an iPad on the same wifi, which
 * is `http://192.168.x.x:5173`, so on the one device that matters most it would
 * throw on every single write.
 *
 * `crypto.getRandomValues()` IS available in insecure contexts, so the fallback
 * builds the same RFC 4122 v4 value from it. Same shape, same uniqueness, no
 * dependency.
 */

export type ID = string;

const HEX: string[] = Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, '0'),
);

export function newId(): ID {
  const c = globalThis.crypto;

  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error(
      'Griffin Grader needs the Web Crypto API. Open the app over https or on localhost.',
    );
  }

  if (typeof c.randomUUID === 'function') return c.randomUUID();

  const b = new Uint8Array(16);
  c.getRandomValues(b);

  // Set the version (4) and variant (RFC 4122) bits.
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;

  const h = (i: number): string => HEX[b[i] ?? 0] ?? '00';

  return (
    `${h(0)}${h(1)}${h(2)}${h(3)}-${h(4)}${h(5)}-${h(6)}${h(7)}-` +
    `${h(8)}${h(9)}-${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}`
  );
}
