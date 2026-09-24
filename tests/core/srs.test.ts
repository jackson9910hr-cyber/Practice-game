import { describe, expect, it } from 'vitest';
import {
  REVIEW_OFFSETS,
  dueWords,
  introduce,
  isNewWord,
  recordExposure,
  topConfused,
  type WordStates,
} from '../../src/core/srs';

describe('spaced repetition', () => {
  const base = (): WordStates => introduce({}, ['red', 'blue'], 1);

  it('uses 1/3/7 day offsets', () => {
    expect(REVIEW_OFFSETS).toEqual([1, 3, 7]);
  });

  it('introduces words once, counting the intro as an exposure', () => {
    let s = base();
    expect(s.red!.introducedDay).toBe(1);
    expect(s.red!.exposures).toBe(1);
    s = introduce(s, ['red'], 2);
    expect(s.red!.introducedDay).toBe(1);
    expect(s.red!.exposures).toBe(1);
  });

  it('nothing is due on the intro day', () => {
    expect(dueWords(base(), 1)).toEqual([]);
  });

  it('words become due 1, 3 and 7 days after introduction', () => {
    let s = base();
    expect(dueWords(s, 2).sort()).toEqual(['blue', 'red']);
    s = recordExposure(s, 'red', 2, 'correct');
    s = recordExposure(s, 'blue', 2, 'correct');
    expect(dueWords(s, 2)).toEqual([]);
    expect(dueWords(s, 3)).toEqual([]);
    expect(dueWords(s, 4).sort()).toEqual(['blue', 'red']);
    s = recordExposure(s, 'red', 4, 'correct');
    expect(dueWords(s, 4)).toEqual(['blue']);
    expect(dueWords(s, 8)).toContain('red');
  });

  it('a missed review stays due (overdue words are listed first)', () => {
    let s = introduce({}, ['a'], 1);
    s = introduce(s, ['b'], 3);
    // day 4: a has offset-1 and offset-3 pending, b has offset-1 pending
    expect(dueWords(s, 4)[0]).toBe('a');
  });

  it('one active exposure clears only one pending review', () => {
    let s = introduce({}, ['a'], 1);
    s = recordExposure(s, 'a', 5, 'correct'); // clears offset 1 (overdue)
    expect(dueWords(s, 5)).toEqual(['a']); // offset 3 still pending
    s = recordExposure(s, 'a', 5, 'correct');
    expect(dueWords(s, 5)).toEqual([]);
  });

  it('passive exposures count but do not clear reviews', () => {
    let s = base();
    s = recordExposure(s, 'red', 2, 'passive');
    expect(s.red!.exposures).toBe(2);
    expect(dueWords(s, 2)).toContain('red');
  });

  it('a wrong answer schedules an extra review the next day', () => {
    let s = base();
    s = recordExposure(s, 'red', 1, 'wrong');
    expect(s.red!.wrong).toBe(1);
    expect(dueWords(s, 2)).toContain('red');
    s = recordExposure(s, 'red', 2, 'correct'); // clears extra + offset 1
    s = recordExposure(s, 'blue', 2, 'correct');
    expect(dueWords(s, 3)).toEqual([]);
  });

  it('ignores unknown words', () => {
    const s = base();
    expect(recordExposure(s, 'nope', 2, 'correct')).toBe(s);
  });

  it('new = introduced today and not yet answered correctly', () => {
    let s = base();
    expect(isNewWord(s, 'red', 1)).toBe(true);
    s = recordExposure(s, 'red', 1, 'correct');
    expect(isNewWord(s, 'red', 1)).toBe(false);
    expect(isNewWord(s, 'blue', 2)).toBe(false);
    expect(isNewWord(s, 'nope', 1)).toBe(false);
  });

  it('ranks the most confused words', () => {
    let s = introduce({}, ['a', 'b', 'c'], 1);
    s = recordExposure(s, 'a', 1, 'wrong');
    s = recordExposure(s, 'a', 1, 'wrong');
    s = recordExposure(s, 'b', 1, 'wrong');
    s = recordExposure(s, 'b', 1, 'correct');
    s = recordExposure(s, 'c', 1, 'correct');
    expect(topConfused(s, 5).map((x) => x.id)).toEqual(['a', 'b']);
  });
});
