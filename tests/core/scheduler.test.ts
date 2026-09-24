import { describe, expect, it } from 'vitest';
import { beginDay, completeStation, createSave, meetFriend, type SaveData } from '../../src/core/progress';
import { chooseMode, planDay } from '../../src/core/scheduler';

function saveOnDay(day: number, patch: Partial<SaveData> = {}): SaveData {
  let s = beginDay(createSave(0), '2026-01-01').save;
  s = { ...s, playDay: day, ...patch };
  return meetFriend(s);
}

const kinds = (s: SaveData) => planDay(s).map((p) => p.kind);

describe('daily station planner', () => {
  it('day 1 is short: english + phonics', () => {
    const plan = planDay(saveOnDay(1));
    expect(plan.map((p) => p.game)).toEqual(['word-garden', 'sound-butterfly']);
  });

  it('day 2 adds the thinking station', () => {
    expect(planDay(saveOnDay(2)).map((p) => p.game)).toEqual([
      'word-garden',
      'hangul-pieces',
      'sound-butterfly',
    ]);
  });

  it('from day 3 there are four stations incl. the sentence train', () => {
    expect(kinds(saveOnDay(3))).toEqual(['english', 'thinking', 'phonics', 'sentence']);
  });

  it('a game unlocked today is played today', () => {
    expect(planDay(saveOnDay(5)).find((p) => p.kind === 'thinking')?.game).toBe('pattern-path');
    expect(planDay(saveOnDay(8)).find((p) => p.kind === 'thinking')?.game).toBe('number-fireflies');
    expect(planDay(saveOnDay(4)).find((p) => p.kind === 'english')?.mode).toBe(2);
  });

  it('review party days open with the chant and review the week', () => {
    const plan = planDay(saveOnDay(7));
    expect(plan[0]!.kind).toBe('chant');
    expect(plan.filter((p) => p.review === 'week').length).toBeGreaterThanOrEqual(2);
  });

  it('day 27 opens with the greeting medley, day 29 rehearses everything, day 30 is the finale', () => {
    expect(planDay(saveOnDay(27))[0]!.kind).toBe('medley');
    expect(planDay(saveOnDay(29)).some((p) => p.review === 'all')).toBe(true);
    const last = planDay(saveOnDay(30));
    expect(last[last.length - 1]!.kind).toBe('finale');
  });

  it('after day 30 it keeps a 4-station all-review plan', () => {
    const plan = planDay(saveOnDay(31));
    expect(plan).toHaveLength(4);
    expect(plan.every((p) => p.kind === 'thinking' || p.review === 'all')).toBe(true);
  });

  it('rotates the thinking game to the least recently played one', () => {
    const s = saveOnDay(10, {
      games: {
        'hangul-pieces': { played: 3, correct: 0, wrong: 0, lastPlayedDay: 9, lastMode: 1 },
        'number-fireflies': { played: 1, correct: 0, wrong: 0, lastPlayedDay: 8, lastMode: 1 },
        'pattern-path': { played: 2, correct: 0, wrong: 0, lastPlayedDay: 6, lastMode: 1 },
      },
    });
    expect(planDay(s).find((p) => p.kind === 'thinking')?.game).toBe('pattern-path');
  });

  it("never repeats yesterday's station line-up exactly (boredom guard)", () => {
    let s = saveOnDay(12);
    const seen: string[] = [];
    for (let d = 12; d <= 20; d++) {
      s = { ...s, playDay: d };
      const plan = planDay(s);
      const sig = plan.map((p) => `${p.game ?? p.kind}:${p.mode}`).join('|');
      if (seen.length) expect(sig).not.toBe(seen[seen.length - 1]);
      seen.push(sig);
      for (const p of plan) s = completeStation(s, p.game, p.mode);
    }
  });
});

describe('mode rotation', () => {
  it('uses the newest mode when never played or when played something else last', () => {
    const s = saveOnDay(12);
    expect(chooseMode(s, 'word-garden', 12)).toBe(3);
  });

  it('alternates older modes after playing the newest', () => {
    const s = saveOnDay(12, {
      games: { 'word-garden': { played: 4, correct: 0, wrong: 0, lastPlayedDay: 11, lastMode: 3 } },
    });
    const m = chooseMode(s, 'word-garden', 12);
    expect([1, 2]).toContain(m);
  });

  it('returns 0 for locked games', () => {
    expect(chooseMode(saveOnDay(3), 'ant-path', 3)).toBe(0);
  });
});
