import { describe, expect, it } from 'vitest';
import { beginDay, createSave, meetFriend, recordAnswerStats } from '../../src/core/progress';
import { recordExposure } from '../../src/core/srs';
import {
  confusedTop,
  gameAccuracy,
  learnedPatterns,
  learnedWords,
  todaySummary,
} from '../../src/core/report';

describe('parent report', () => {
  it('summarises an empty save', () => {
    const s = createSave(0);
    expect(learnedWords(s)).toEqual([]);
    expect(learnedPatterns(s)).toEqual([]);
    expect(todaySummary(s).minutes).toBe(0);
    expect(gameAccuracy(s).every((g) => g.rate === null)).toBe(true);
  });

  it('reports learned words, patterns, accuracy and confusion', () => {
    let s = meetFriend(beginDay(createSave(0), '2026-01-01').save);
    s = recordAnswerStats(s, 'word-garden', true);
    s = recordAnswerStats(s, 'word-garden', false);
    s = { ...s, words: recordExposure(s.words, 'blue', 1, 'wrong') };
    expect(learnedWords(s)).toHaveLength(5);
    expect(learnedPatterns(s).map((p) => p.id)).toEqual(['p01']);
    expect(learnedPatterns(s)[0]!.example).toBe('I like red.');
    expect(gameAccuracy(s).find((g) => g.game === 'word-garden')!.rate).toBe(0.5);
    expect(confusedTop(s)[0]!.word.id).toBe('blue');
    expect(todaySummary(s)).toMatchObject({ playDay: 1, correct: 1, wrong: 1, friendMet: true });
  });
});
