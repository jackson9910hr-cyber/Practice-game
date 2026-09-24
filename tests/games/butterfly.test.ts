import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { levelParams } from '../../src/core/levels';
import { getLetter } from '../../src/core/content';
import {
  availableCvc,
  correctOption,
  cvcOptions,
  letterOptions,
  makeButterflyRound,
} from '../../src/games/sound-butterfly/logic';

describe('sound butterfly', () => {
  it('mode 1: letter options contain the target once', () => {
    const qs = makeButterflyRound(1, ['s', 'a', 's'], 2, levelParams('sound-butterfly', 1), createRng(1));
    for (const q of qs) {
      expect(q.kind).toBe('letter');
      if (q.kind !== 'letter') continue;
      expect(q.options.filter((o) => o === q.letter)).toHaveLength(1);
      expect(q.options).toHaveLength(2);
      expect(correctOption(q)).toBe(q.letter);
    }
  });

  it('confusable letters are offered at high levels when learned', () => {
    const o = letterOptions('b', ['b', 'd', 'p', 's', 'a'], 3, true, createRng(1));
    expect(o).toEqual(expect.arrayContaining(['b', 'd', 'p']));
  });

  it('mode 2: the answer picture has the sound, distractors do not', () => {
    const qs = makeButterflyRound(2, ['c', 'm', 'x'], 26, levelParams('sound-butterfly', 20), createRng(2));
    for (const q of qs) {
      if (q.kind !== 'sound-match') throw new Error('kind');
      const L = getLetter(q.letter);
      expect(L.pictures).toContain(q.answer);
      q.options.filter((o) => o !== q.answer).forEach((o) => expect(L.pictures).not.toContain(o));
      if (q.letter === 'c')
        q.options
          .filter((o) => o !== q.answer)
          .forEach((o) => expect(getLetter('k').pictures).not.toContain(o));
      if (q.letter === 'x') expect(q.position).toBe('final');
    }
  });

  it('CVC words only use learned letters', () => {
    expect(availableCvc(2)).toEqual([]);
    const d15 = availableCvc(15);
    expect(d15).toEqual(expect.arrayContaining(['cat', 'dog', 'pig']));
    expect(d15).not.toContain('sun');
    expect(availableCvc(30).length).toBeGreaterThan(25);
  });

  it('CVC options prefer words differing at the requested position', () => {
    const o = cvcOptions('cat', ['cat', 'hat', 'cap', 'cot', 'dog'], 2, 'first', createRng(1));
    expect(o).toEqual(expect.arrayContaining(['cat', 'hat']));
    const m = cvcOptions('cat', ['cat', 'hat', 'cap', 'cot', 'dog'], 2, 'middle', createRng(1));
    expect(m).toEqual(expect.arrayContaining(['cat', 'cot']));
  });

  it('modes 3 and 4 produce blend and read questions', () => {
    const b = makeButterflyRound(3, [], 20, levelParams('sound-butterfly', 10), createRng(3));
    expect(b.length).toBeGreaterThan(0);
    b.forEach((q) => {
      expect(q.kind).toBe('blend');
      if (q.kind === 'blend') expect(q.options).toContain(q.word);
    });
    const r = makeButterflyRound(4, [], 26, levelParams('sound-butterfly', 25), createRng(4));
    r.forEach((q) => expect(q.kind).toBe('read'));
    expect(correctOption(r[0]!)).toBe((r[0] as { word: string }).word);
  });

  it('never offers a same-sound letter as a wrong option (c/k/q)', () => {
    for (let i = 0; i < 30; i++) {
      const o = letterOptions('c', ['s', 'a', 't', 'k', 'q', 'm'], 4, false, createRng(i));
      expect(o).not.toContain('k');
      expect(o).not.toContain('q');
    }
  });

  it('mode 1 never asks for the first letter of an x keyword (x is an ending sound)', () => {
    const qs = makeButterflyRound(1, ['x', 'x'], 26, levelParams('sound-butterfly', 1), createRng(1));
    qs.forEach((q) => expect(q.kind === 'letter' && q.letter).not.toBe('x'));
  });

  it('short a vs short e is never the only difference in CVC options', () => {
    const o = cvcOptions('pan', ['pan', 'pen', 'pin', 'man'], 2, 'middle', createRng(1));
    expect(o).not.toContain('pen');
  });
});
