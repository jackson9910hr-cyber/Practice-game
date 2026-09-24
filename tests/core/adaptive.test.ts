import { describe, expect, it } from 'vitest';
import { ADAPTIVE, accuracy, createAdaptive, recordAnswer } from '../../src/core/adaptive';

function feed(results: boolean[], start = createAdaptive(5), max = 30) {
  return results.reduce((s, r) => recordAnswer(s, r, max), start);
}

describe('adaptive difficulty', () => {
  it('starts at the requested level with no history', () => {
    const s = createAdaptive(3);
    expect(s.level).toBe(3);
    expect(accuracy(s)).toBeNull();
  });

  it('does not adjust before minimum samples', () => {
    const s = feed([true, true, true, true]);
    expect(s.level).toBe(5);
  });

  it('raises the level when accuracy is above 85%', () => {
    const s = feed([true, true, true, true, false, true, true, true, true, true], createAdaptive(5));
    // 6/7 with a recent miss: +1 (no fast-track)
    expect(s.level).toBe(6);
  });

  it('fast-tracks +2 after five in a row (so rarely played games catch up quickly)', () => {
    expect(feed([true, true, true, true, true]).level).toBe(7);
  });

  it('lowers the level when accuracy is below 70%', () => {
    const s = feed([true, true, false, false, true, false]);
    expect(s.level).toBe(4);
  });

  it('drops 2 levels when the last five were (almost) all wrong', () => {
    expect(feed([false, false, true, false, false]).level).toBe(3);
  });

  it('keeps the level inside the 70–85% band', () => {
    // 8/10 = 80%
    const s = feed([true, true, true, false, true, true, false, true, true, true], createAdaptive(5));
    // first 5 = 4/5 = 80% (no change) ... stays in band
    expect(s.level).toBe(5);
  });

  it('waits for the cooldown before adjusting again', () => {
    let s = feed([true, true, true, true, true]); // -> 7
    expect(s.level).toBe(7);
    s = feed([true, true, true, true], s);
    expect(s.level).toBe(7);
    s = recordAnswer(s, true, 30);
    expect(s.level).toBe(9);
  });

  it('only keeps the last window of answers', () => {
    const s = feed(Array.from({ length: 25 }, (_, i) => i % 5 !== 0));
    expect(s.history.length).toBe(ADAPTIVE.window);
  });

  it('clamps to [min, max]', () => {
    expect(feed([true, true, true, true, true], createAdaptive(3), 3).level).toBe(3);
    expect(feed([true, true, true, true, true], createAdaptive(29), 30).level).toBe(30);
    expect(feed([false, false, false, false, false], createAdaptive(1)).level).toBe(1);
    expect(feed([false, false, false, false, false], createAdaptive(2)).level).toBe(1);
  });

  it('is immutable', () => {
    const s = createAdaptive(2);
    recordAnswer(s, true, 30);
    expect(s.history).toEqual([]);
  });
});
