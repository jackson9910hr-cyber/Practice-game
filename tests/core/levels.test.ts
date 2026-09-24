import { describe, expect, it } from 'vitest';
import { GAME_IDS } from '../../src/core/types';
import { LEVEL_COUNT, generateLevels } from '../../src/core/levelgen';
import { levelCount, levelParams } from '../../src/core/levels';

describe('level tables', () => {
  it('every game has ≥30 levels and the JSON matches the generator', () => {
    for (const g of GAME_IDS) {
      expect(levelCount(g)).toBeGreaterThanOrEqual(30);
      const gen = generateLevels(g);
      gen.levels.forEach((l) => expect(levelParams(g, l.level)).toEqual(l.params));
    }
  });

  it('clamps out-of-range levels', () => {
    expect(levelParams('word-garden', 0)).toEqual(levelParams('word-garden', 1));
    expect(levelParams('word-garden', 999)).toEqual(levelParams('word-garden', LEVEL_COUNT));
  });

  it('difficulty never decreases as the level rises', () => {
    for (let l = 2; l <= LEVEL_COUNT; l++) {
      const a = levelParams('word-garden', l - 1);
      const b = levelParams('word-garden', l);
      expect(b.choices).toBeGreaterThanOrEqual(a.choices);
      expect(b.pairs).toBeGreaterThanOrEqual(a.pairs);
      const x = levelParams('ant-path', l - 1);
      const y = levelParams('ant-path', l);
      expect(y.grid).toBeGreaterThanOrEqual(x.grid);
      expect(y.obstacles).toBeGreaterThanOrEqual(x.obstacles);
      const f = levelParams('number-fireflies', l - 1);
      const h = levelParams('number-fireflies', l);
      expect(h.count10).toBeGreaterThanOrEqual(f.count10);
      expect(h.sum20).toBeGreaterThanOrEqual(f.sum20);
    }
  });
});
