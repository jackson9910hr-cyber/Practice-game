import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { levelParams } from '../../src/core/levels';
import { makePatternRound, nameOf, same } from '../../src/games/pattern-path/logic';

describe('pattern path', () => {
  it('mode 1: AB colour patterns, blank at the end, answer continues the unit', () => {
    for (const q of makePatternRound(1, levelParams('pattern-path', 1), createRng(1))) {
      expect(q.unit).toBe('AB');
      expect(q.dims).toEqual(['color']);
      expect(q.blank).toBe(q.row.length - 1);
      expect(same(q.answer, q.row[q.blank - 2]!)).toBe(true);
      expect(q.options.filter((o) => same(o, q.answer))).toHaveLength(1);
    }
  });

  it('options differ from the answer only in the rule attribute', () => {
    for (const mode of [2, 3, 4]) {
      for (const q of makePatternRound(mode, levelParams('pattern-path', 28), createRng(mode), 12)) {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        for (const o of q.options) {
          (['color', 'shape', 'size'] as const).forEach((k) => {
            if (!q.dims.includes(k)) expect(o[k]).toBe(q.answer[k]);
          });
        }
        // the row really repeats the unit
        q.row.forEach((f, i) => {
          if (i >= q.unit.length) expect(same(f, q.row[i - q.unit.length]!)).toBe(true);
        });
      }
    }
  });

  it('size rules use 2-letter units only', () => {
    const qs = makePatternRound(3, levelParams('pattern-path', 30), createRng(9), 40);
    qs.filter((q) => q.dims.includes('size')).forEach((q) =>
      expect(new Set(q.unit).size).toBeLessThanOrEqual(2),
    );
  });

  it('can blank the middle at high levels and names attributes in English', () => {
    const qs = makePatternRound(4, levelParams('pattern-path', 32), createRng(4), 30);
    expect(qs.some((q) => q.blank < q.row.length - 1)).toBe(true);
    expect(nameOf({ color: 'red', shape: 'star', size: 'big' }, ['color', 'shape'])).toEqual(['red', 'star']);
  });
});
