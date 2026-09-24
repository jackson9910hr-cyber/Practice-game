import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { levelParams } from '../../src/core/levels';
import { sentences } from '../../src/core/content';
import { isCorrectOrder, makeTrainQuestion, nextExpected } from '../../src/games/sentence-train/logic';

const s = (id: string) => sentences.find((x) => x.id === id)!;
const learned = ['red', 'blue', 'green', 'pink', 'yellow', 'milk', 'bread', 'egg', 'cat', 'dog'];

describe('sentence train', () => {
  it('builds a tray with every card of the sentence (+extras at higher levels)', () => {
    const q = makeTrainQuestion(s('p01-1'), 1, levelParams('sentence-train', 1), createRng(1), learned);
    expect(q.fixed).toBe(1);
    expect(q.cards[0]!.t).toBe('I');
    expect(q.cards.map((c) => c.t).sort()).toEqual(['I', 'like', 'red'].sort());
    const hard = makeTrainQuestion(s('p01-1'), 2, levelParams('sentence-train', 30), createRng(1), learned);
    expect(hard.fixed).toBe(0);
    expect(hard.cards.length).toBe(3 + levelParams('sentence-train', 30).extraCards);
    expect(new Set(hard.cards.map((c) => c.id)).size).toBe(hard.cards.length);
  });

  it('checks order by text', () => {
    expect(isCorrectOrder(s('p01-1'), ['I', 'like', 'red'])).toBe(true);
    expect(isCorrectOrder(s('p01-1'), ['like', 'I', 'red'])).toBe(false);
    expect(isCorrectOrder(s('p01-1'), ['I', 'like'])).toBe(false);
    expect(nextExpected(s('p01-1'), 1)).toBe('like');
  });

  it('mode 3 adds an answer choice for questions', () => {
    const q = makeTrainQuestion(s('p16-1'), 3, levelParams('sentence-train', 5), createRng(2), learned);
    expect(q.answer?.correct).toBe('Yes, I do.');
    expect(q.answer?.options).toContain('Yes, I do.');
    expect(q.answer?.options).toHaveLength(2);
    const c = makeTrainQuestion(s('p21-1'), 3, levelParams('sentence-train', 5), createRng(3), learned);
    expect(c.answer?.correct).toBe(`It's ${c.answer?.colorWord}.`);
    const w = makeTrainQuestion(s('p08-1'), 3, levelParams('sentence-train', 5), createRng(3), learned);
    expect(w.prompt).toBe('What is it?');
  });

  it('mode 4 offers pictures including the sentence main word', () => {
    const q = makeTrainQuestion(s('p09-1'), 4, levelParams('sentence-train', 30), createRng(4), learned);
    expect(q.pictureOptions).toContain('cat');
    expect(q.pictureOptions).toHaveLength(4);
  });
});
