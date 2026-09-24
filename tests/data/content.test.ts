import { describe, expect, it } from 'vitest';
import { validateAll } from '../../src/schema/validate';
import {
  getDay,
  getFriend,
  getLetter,
  getPattern,
  getWord,
  pictureOf,
  wordsOfDay,
  chapterOf,
  hasWord,
} from '../../src/core/content';

describe('content data', () => {
  it('passes schema validation and all curriculum invariants', () => {
    expect(validateAll()).toEqual([]);
  });

  it('exposes typed lookups', () => {
    expect(getWord('red').ko).toBe('빨강');
    expect(getFriend('sami').day).toBe(1);
    expect(getPattern('p22').frame).toBe('I can ___.');
    expect(getLetter('x').position).toBe('final');
    expect(pictureOf('ant')).toBe('🐜');
    expect(wordsOfDay(3).map((w) => w.id)).toContain('purple');
    expect(chapterOf(30).key).toBe('skybridge');
    expect(getDay(99).day).toBe(30);
    expect(hasWord('nope')).toBe(false);
  });

  it('throws on unknown ids', () => {
    expect(() => getWord('nope')).toThrow();
    expect(() => getFriend('nope')).toThrow();
    expect(() => getPattern('p99')).toThrow();
    expect(() => getLetter('?')).toThrow();
    expect(() => pictureOf('nope')).toThrow();
  });
});
