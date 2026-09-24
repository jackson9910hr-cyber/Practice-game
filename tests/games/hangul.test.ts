import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { levelParams } from '../../src/core/levels';
import {
  compose,
  decompose,
  fits,
  isVerticalVowel,
  makeHangulRound,
  slotsOf,
} from '../../src/games/hangul-pieces/logic';

describe('hangul jamo', () => {
  it('decomposes and composes syllables', () => {
    expect(decompose('강')).toEqual({ cho: 'ㄱ', jung: 'ㅏ', jong: 'ㅇ' });
    expect(compose({ cho: 'ㄴ', jung: 'ㅏ', jong: '' })).toBe('나');
    expect(compose(decompose('별'))).toBe('별');
    expect(() => decompose('a')).toThrow();
    expect(() => compose({ cho: 'x', jung: 'ㅏ', jong: '' })).toThrow();
  });

  it('knows vowel orientation', () => {
    expect(isVerticalVowel('ㅏ')).toBe(true);
    expect(isVerticalVowel('ㅗ')).toBe(false);
  });
});

describe('hangul rounds', () => {
  it('mode 1 builds distinct open syllables with the right pieces available', () => {
    const qs = makeHangulRound(1, levelParams('hangul-pieces', 1), createRng(1));
    expect(qs).toHaveLength(5);
    expect(new Set(qs.map((q) => q.word)).size).toBe(5);
    for (const q of qs) {
      const s = q.syllables[0]!;
      expect(q.pieces.map((p) => p.jamo)).toEqual(expect.arrayContaining([s.jamo.cho, s.jamo.jung]));
      expect(q.pieces.length).toBe(2 + levelParams('hangul-pieces', 1).extraPieces);
      expect(slotsOf(s)).toEqual(['cho', 'jung']);
    }
  });

  it('mode 2 blanks syllables of open words and supplies their jamo', () => {
    const p = levelParams('hangul-pieces', 20);
    for (const q of makeHangulRound(2, p, createRng(2))) {
      const blanks = q.syllables.filter((s) => s.blank);
      expect(blanks.length).toBe(Math.min(p.blanks, q.syllables.length));
      for (const s of blanks) {
        expect(q.pieces.some((x) => x.jamo === s.jamo.cho)).toBe(true);
        expect(fits(s, 'jung', s.jamo.jung)).toBe(true);
      }
      expect(q.pic).toBeTruthy();
    }
  });

  it('mode 3 blanks a syllable with a final consonant', () => {
    for (const q of makeHangulRound(3, levelParams('hangul-pieces', 1), createRng(3))) {
      const blank = q.syllables.find((s) => s.blank)!;
      expect(blank.jamo.jong).not.toBe('');
      expect(slotsOf(blank)).toEqual(['cho', 'jung', 'jong']);
    }
  });
});
