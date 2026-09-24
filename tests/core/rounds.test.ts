import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { beginDay, createSave, meetFriend, type SaveData } from '../../src/core/progress';
import { introduce, recordExposure } from '../../src/core/srs';
import { words } from '../../src/core/content';
import {
  NEW_WORD_CAP,
  pickDistractors,
  pickLetters,
  pickSentences,
  pickWordTargets,
} from '../../src/core/rounds';

function saveWithDays(day: number): SaveData {
  let s = beginDay(createSave(0), '2026-01-01').save;
  s = { ...s, playDay: day };
  for (let d = 1; d < day; d++) {
    s = {
      ...s,
      words: introduce(
        s.words,
        words.filter((w) => w.day === d).map((w) => w.id),
        d,
      ),
    };
    // mark earlier words as answered once so they are not "new"
    for (const w of words.filter((x) => x.day === d))
      s = { ...s, words: recordExposure(s.words, w.id, d, 'correct') };
  }
  // reviews that fell before `day` were done on time
  for (const ws of Object.values(s.words))
    ws.reviewsDone = [1, 3, 7].filter((o) => ws.introducedDay + o < day);
  return meetFriend(s);
}

describe('word target selection', () => {
  it('caps new words at 30% of a round once enough known words exist', () => {
    const s = saveWithDays(10);
    const rng = createRng(1);
    for (let i = 0; i < 20; i++) {
      const t = pickWordTargets(s, 10, 8, rng);
      const today = t.filter((id) => words.find((w) => w.id === id)!.day === 10);
      expect(today.length).toBeLessThanOrEqual(Math.floor(8 * NEW_WORD_CAP));
      expect(t).toHaveLength(8);
    }
  });

  it('includes due reviews (1/3/7 days ago) when available', () => {
    const s = saveWithDays(10);
    const t = pickWordTargets(s, 10, 8, createRng(2));
    const days = t.map((id) => words.find((w) => w.id === id)!.day);
    expect(days.some((d) => d === 9 || d === 7 || d === 3)).toBe(true);
  });

  it('day 1 falls back to the new words (nothing else exists yet)', () => {
    const s = saveWithDays(1);
    const t = pickWordTargets(s, 1, 8, createRng(3));
    expect(t).toHaveLength(8);
    expect(new Set(t).size).toBe(5);
    for (let i = 1; i < t.length; i++) expect(t[i]).not.toBe(t[i - 1]);
  });

  it('week scope only uses the chapter week', () => {
    const s = saveWithDays(14);
    const t = pickWordTargets(s, 14, 8, createRng(4), 'week');
    t.forEach((id) => expect(words.find((w) => w.id === id)!.day).toBeGreaterThanOrEqual(8));
  });

  it('returns nothing when no words are introduced', () => {
    const s = beginDay(createSave(0), '2026-01-01').save;
    expect(pickWordTargets(s, 1, 5, createRng(1))).toEqual([]);
  });
});

describe('distractors', () => {
  const pool = words.filter((w) => w.day <= 10).map((w) => w.id);
  it('never includes the target and returns unique ids', () => {
    const d = pickDistractors('red', pool, 3, createRng(1), 0);
    expect(d).toHaveLength(3);
    expect(d).not.toContain('red');
    expect(new Set(d).size).toBe(3);
  });

  it('prefers the same category when asked', () => {
    const d = pickDistractors('red', pool, 3, createRng(1), 1);
    d.forEach((id) => expect(words.find((w) => w.id === id)!.category).toBe('color'));
  });

  it('returns fewer when the pool is small', () => {
    expect(pickDistractors('red', ['red', 'blue'], 3, createRng(1), 0)).toEqual(['blue']);
  });
});

describe('sentence selection', () => {
  it("always practises today's pattern first on a normal day", () => {
    const s = saveWithDays(5);
    const list = pickSentences(s, 5, 3, 1, createRng(1));
    expect(list[0]!.pattern).toBe('p05');
    expect(list).toHaveLength(3);
    list.forEach((x) => expect(x.availableDay).toBeLessThanOrEqual(5));
  });

  it('mode 1 prefers short sentences for review slots', () => {
    const s = saveWithDays(8);
    const list = pickSentences(s, 8, 3, 1, createRng(2));
    list.slice(1).forEach((x) => expect(x.cards.length).toBeLessThanOrEqual(3));
  });

  it('mode 3 uses question/answer patterns', () => {
    const s = saveWithDays(20);
    const list = pickSentences(s, 20, 3, 3, createRng(3));
    expect(list[0]!.pattern).toBe('p20');
    expect(list.length).toBe(3);
    list.slice(1).forEach((x) => expect(['p08', 'p10', 'p16', 'p19'].includes(x.pattern)).toBe(true));
  });

  it('all scope may use any learned pattern', () => {
    const s = saveWithDays(29);
    const list = pickSentences(s, 29, 3, 2, createRng(4), 'all');
    expect(list).toHaveLength(3);
  });
});

describe('letter selection', () => {
  it("puts today's letter first and only uses learned letters", () => {
    const s = saveWithDays(8);
    const l = pickLetters(s, 8, 6, createRng(1));
    expect(l[0]).toBe('m');
    expect(l).toHaveLength(6);
    l.forEach((x) => expect(['s', 'a', 't', 'p', 'i', 'n', 'm']).toContain(x));
  });

  it('review days use the week letters', () => {
    const s = saveWithDays(7);
    const l = pickLetters(s, 7, 6, createRng(1));
    l.forEach((x) => expect(['s', 'a', 't', 'p', 'i', 'n']).toContain(x));
  });
});
