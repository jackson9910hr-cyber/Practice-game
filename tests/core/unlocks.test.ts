import { describe, expect, it } from 'vitest';
import { hasFeature, maxMode, unlockedGames, unlocksOn } from '../../src/core/unlocks';

describe('unlocks from curriculum', () => {
  it('day 1 opens word garden and sound butterfly', () => {
    expect(unlockedGames(1).sort()).toEqual(['sound-butterfly', 'word-garden']);
    expect(hasFeature(1, 'codex')).toBe(true);
    expect(hasFeature(1, 'decorate')).toBe(false);
  });

  it('modes grow with the calendar', () => {
    expect(maxMode('word-garden', 3)).toBe(1);
    expect(maxMode('word-garden', 4)).toBe(2);
    expect(maxMode('word-garden', 30)).toBe(4);
    expect(maxMode('ant-path', 14)).toBe(0);
    expect(maxMode('ant-path', 22)).toBe(3);
  });

  it('all seven games are unlocked by day 15', () => {
    expect(unlockedGames(15)).toHaveLength(7);
  });

  it('reports what opens on a given day', () => {
    expect(unlocksOn(8)).toEqual(['number-fireflies:1']);
  });

  it('day numbers beyond 30 behave like day 30', () => {
    expect(maxMode('sentence-train', 45)).toBe(4);
  });
});
