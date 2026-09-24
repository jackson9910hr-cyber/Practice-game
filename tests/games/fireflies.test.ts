import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { levelParams } from '../../src/core/levels';
import { answerOf, makeFireflyRound, numberOptions } from '../../src/games/number-fireflies/logic';

describe('number fireflies', () => {
  it('mode 1 counts within the level range', () => {
    const p = levelParams('number-fireflies', 1);
    const qs = makeFireflyRound(1, p, createRng(1));
    expect(qs).toHaveLength(6);
    for (const q of qs) {
      expect(q.kind).toBe('count');
      expect(answerOf(q)).toBeLessThanOrEqual(p.count10);
      expect(q.options).toContain(answerOf(q));
      expect(q.options).toHaveLength(p.choices);
    }
    for (let i = 1; i < qs.length; i++) expect(answerOf(qs[i]!)).not.toBe(answerOf(qs[i - 1]!));
  });

  it('mode 2 counts up to 20', () => {
    const qs = makeFireflyRound(2, levelParams('number-fireflies', 32), createRng(2), 30);
    qs.forEach((q) => expect(answerOf(q)).toBeLessThanOrEqual(20));
    expect(qs.some((q) => answerOf(q) > 10)).toBe(true);
  });

  it('modes 3/4 warm up with counting then add and subtract correctly', () => {
    for (const mode of [3, 4]) {
      const p = levelParams('number-fireflies', 20);
      const qs = makeFireflyRound(mode, p, createRng(mode), 20);
      expect(qs[0]!.kind).toBe('count');
      const maxSum = mode === 4 ? p.sum20 : p.sum10;
      for (const q of qs.slice(2)) {
        if (q.kind === 'add') expect(q.a + q.b).toBe(q.answer);
        if (q.kind === 'sub') expect(q.a - q.b).toBe(q.answer);
        if (q.kind !== 'count') {
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(Math.max(q.a, q.answer)).toBeLessThanOrEqual(maxSum);
        }
      }
      expect(qs.some((q) => q.kind === 'add')).toBe(true);
      expect(qs.some((q) => q.kind === 'sub')).toBe(true);
    }
  });

  it('number options are distinct, in range and include the answer', () => {
    const o = numberOptions(0, 4, 20, createRng(1));
    expect(o).toContain(0);
    expect(new Set(o).size).toBe(4);
    o.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });
});
