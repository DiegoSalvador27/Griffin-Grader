import { describe, it, expect, afterEach, vi } from 'vitest';
import { newId } from './ids';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a v4 uuid', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 2000 }, () => newId()));
    expect(seen.size).toBe(2000);
  });

  /* The case that matters: `npm run dev -- --host` serves the iPad over plain
     http, where crypto.randomUUID is not exposed. */
  it('still works when crypto.randomUUID is missing, as on a LAN http origin', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: real.getRandomValues.bind(real),
    });

    expect(globalThis.crypto.randomUUID).toBeUndefined();
    const ids = Array.from({ length: 500 }, () => newId());

    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(500);
  });

  it('fails loudly when there is no crypto at all', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => newId()).toThrow(/Web Crypto/);
  });
});
