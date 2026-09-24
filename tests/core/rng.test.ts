import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 5 }, () => a.next());
    const ys = Array.from({ length: 5 }, () => b.next());
    expect(xs).toEqual(ys);
    xs.forEach((x) => expect(x).toBeGreaterThanOrEqual(0));
    xs.forEach((x) => expect(x).toBeLessThan(1));
  });

  it('int stays in inclusive range', () => {
    const r = createRng(1);
    for (let i = 0; i < 200; i++) {
      const v = r.int(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('shuffle keeps elements and does not mutate input', () => {
    const r = createRng(7);
    const input = [1, 2, 3, 4, 5, 6];
    const out = r.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
  });

  it('sample returns n distinct items (or all when n is larger)', () => {
    const r = createRng(9);
    const s = r.sample([1, 2, 3, 4, 5], 3);
    expect(new Set(s).size).toBe(3);
    expect(r.sample([1, 2], 5)).toHaveLength(2);
  });

  it('pick throws on empty arrays', () => {
    expect(() => createRng(1).pick([])).toThrow();
    expect(createRng(1).pick(['a'])).toBe('a');
  });

  it('chance respects probability extremes', () => {
    const r = createRng(3);
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
  });
});
