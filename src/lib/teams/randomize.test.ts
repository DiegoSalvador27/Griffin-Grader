import { describe, it, expect } from 'vitest';
import {
  colorTokenFor,
  shuffle,
  splitIntoTeams,
  teamCount,
  teamSizes,
} from './randomize';

/** Deterministic RNG so every assertion here is reproducible. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);
const sizesOf = (teams: string[][]) => teams.map((t) => t.length);

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    const input = ids(50);
    const out = shuffle(input, seeded(1));
    expect(out).toHaveLength(50);
    expect(new Set(out).size).toBe(50);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it('does not modify the input', () => {
    const input = ids(10);
    const copy = [...input];
    shuffle(input, seeded(7));
    expect(input).toEqual(copy);
  });

  it('is deterministic for a given seed', () => {
    expect(shuffle(ids(20), seeded(42))).toEqual(shuffle(ids(20), seeded(42)));
  });

  it('actually reorders', () => {
    const input = ids(30);
    expect(shuffle(input, seeded(9))).not.toEqual(input);
  });
});

describe('teamCount', () => {
  it('divides for groups of N', () => {
    expect(teamCount(20, { mode: 'size', n: 4 })).toBe(5);
  });

  it('rounds up so nobody is left out', () => {
    expect(teamCount(22, { mode: 'size', n: 4 })).toBe(6);
  });

  it('uses N directly for N groups', () => {
    expect(teamCount(22, { mode: 'count', n: 4 })).toBe(4);
  });

  it('never makes more teams than students', () => {
    expect(teamCount(3, { mode: 'count', n: 8 })).toBe(3);
  });

  it('is zero for nobody', () => {
    expect(teamCount(0, { mode: 'size', n: 4 })).toBe(0);
  });
});

describe('teamSizes', () => {
  it('splits evenly when it divides', () => {
    expect(teamSizes(20, 5)).toEqual([4, 4, 4, 4, 4]);
  });

  /* The example from SPEC 4.5, spelled out. */
  it('gives 4,4,4,4,3,3 for 22 students in 6 teams', () => {
    expect(teamSizes(22, 6)).toEqual([4, 4, 4, 4, 3, 3]);
  });

  it('never differs by more than one', () => {
    for (let total = 1; total <= 60; total++) {
      for (let teams = 1; teams <= Math.min(total, 10); teams++) {
        const sizes = teamSizes(total, teams);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect(sizes.reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });
});

describe('splitIntoTeams', () => {
  /* The headline case from SPEC 4.5. */
  it('splits 22 students in groups of 4 into 4,4,4,4,3,3', () => {
    const teams = splitIntoTeams(ids(22), { mode: 'size', n: 4, random: seeded(3) });
    expect(sizesOf(teams)).toEqual([4, 4, 4, 4, 3, 3]);
  });

  it('never leaves a tiny leftover team', () => {
    for (let total = 1; total <= 45; total++) {
      for (let n = 2; n <= 6; n++) {
        const teams = splitIntoTeams(ids(total), { mode: 'size', n, random: seeded(total * n) });
        const sizes = sizesOf(teams);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('puts every student in exactly one team', () => {
    const roster = ids(37);
    const teams = splitIntoTeams(roster, { mode: 'size', n: 5, random: seeded(11) });
    const flat = teams.flat();

    expect(flat).toHaveLength(roster.length);
    expect(new Set(flat).size).toBe(roster.length);
    expect([...flat].sort()).toEqual([...roster].sort());
  });

  it('makes exactly N teams in count mode', () => {
    const teams = splitIntoTeams(ids(23), { mode: 'count', n: 4, random: seeded(5) });
    expect(teams).toHaveLength(4);
    expect(sizesOf(teams)).toEqual([6, 6, 6, 5]);
  });

  it('is deterministic with an injected seed', () => {
    const a = splitIntoTeams(ids(18), { mode: 'size', n: 3, random: seeded(99) });
    const b = splitIntoTeams(ids(18), { mode: 'size', n: 3, random: seeded(99) });
    expect(a).toEqual(b);
  });

  it('re-rolls differently with a different seed', () => {
    const a = splitIntoTeams(ids(18), { mode: 'size', n: 3, random: seeded(1) });
    const b = splitIntoTeams(ids(18), { mode: 'size', n: 3, random: seeded(2) });
    expect(a).not.toEqual(b);
  });

  describe('edge cases', () => {
    it('returns nothing for an empty roster', () => {
      expect(splitIntoTeams([], { mode: 'size', n: 4 })).toEqual([]);
    });

    it('handles one student', () => {
      expect(splitIntoTeams(ids(1), { mode: 'size', n: 4, random: seeded(1) })).toEqual([
        ['s0'],
      ]);
    });

    it('handles N larger than the roster', () => {
      const teams = splitIntoTeams(ids(3), { mode: 'size', n: 10, random: seeded(1) });
      expect(teams).toHaveLength(1);
      expect(teams[0]).toHaveLength(3);
    });

    it('handles more groups requested than students', () => {
      const teams = splitIntoTeams(ids(3), { mode: 'count', n: 8, random: seeded(1) });
      expect(teams).toHaveLength(3);
      expect(sizesOf(teams)).toEqual([1, 1, 1]);
    });

    it('handles groups of 1', () => {
      const teams = splitIntoTeams(ids(5), { mode: 'size', n: 1, random: seeded(1) });
      expect(teams).toHaveLength(5);
      expect(sizesOf(teams)).toEqual([1, 1, 1, 1, 1]);
    });

    it('handles one big group', () => {
      const teams = splitIntoTeams(ids(5), { mode: 'count', n: 1, random: seeded(1) });
      expect(teams).toHaveLength(1);
      expect(teams[0]).toHaveLength(5);
    });

    it('treats a nonsense N as 1 rather than dividing by zero', () => {
      const teams = splitIntoTeams(ids(4), { mode: 'size', n: 0, random: seeded(1) });
      expect(teams.flat()).toHaveLength(4);
    });
  });
});

describe('colorTokenFor', () => {
  it('gives eight distinct colours', () => {
    const tokens = Array.from({ length: 8 }, (_, i) => colorTokenFor(i));
    expect(new Set(tokens).size).toBe(8);
  });

  it('cycles past eight rather than running out', () => {
    expect(colorTokenFor(8)).toBe(colorTokenFor(0));
  });
});
