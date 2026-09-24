import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { levelParams } from '../../src/core/levels';
import { getWord } from '../../src/core/content';
import { isMoving, makeWordGardenRound } from '../../src/games/word-garden/logic';
import { saveAt } from './helpers';

describe('word garden logic', () => {
  it('mode 1: 8 questions, options include the target once, sizes follow the level', () => {
    const r = makeWordGardenRound(saveAt(6), 6, 1, levelParams('word-garden', 10), createRng(1));
    if (!('questions' in r)) throw new Error('expected questions');
    expect(r.questions).toHaveLength(8);
    for (const q of r.questions) {
      expect(q.options).toHaveLength(3);
      expect(q.options.filter((o) => o === q.target)).toHaveLength(1);
      expect(new Set(q.options.map((o) => getWord(o).pic)).size).toBe(3);
    }
  });

  it('mode 2 uses at most 3 sound choices and 6 questions', () => {
    const r = makeWordGardenRound(saveAt(12), 12, 2, levelParams('word-garden', 30), createRng(2));
    if (!('questions' in r)) throw new Error('expected questions');
    expect(r.questions).toHaveLength(6);
    r.questions.forEach((q) => expect(q.options.length).toBeLessThanOrEqual(3));
  });

  it('mode 3 returns distinct memory pairs', () => {
    const r = makeWordGardenRound(saveAt(12), 12, 3, levelParams('word-garden', 12), createRng(3));
    if (!('memory' in r)) throw new Error('expected memory');
    expect(r.memory.pairs).toHaveLength(4);
    expect(new Set(r.memory.pairs).size).toBe(4);
  });

  it('mode 4 mixes in moving (action/feeling) words', () => {
    const r = makeWordGardenRound(saveAt(26), 26, 4, levelParams('word-garden', 5), createRng(4));
    if (!('questions' in r)) throw new Error('expected questions');
    expect(r.questions.filter((q) => isMoving(q.target)).length).toBeGreaterThanOrEqual(3);
  });

  it('day 1 works with only five words', () => {
    const r = makeWordGardenRound(saveAt(1), 1, 3, levelParams('word-garden', 1), createRng(5));
    if (!('memory' in r)) throw new Error('expected memory');
    expect(r.memory.pairs).toHaveLength(3);
  });
});
