import { describe, expect, it } from 'vitest';
import {
  SCHEMA_VERSION,
  addPlayTime,
  beginDay,
  completeStation,
  createSave,
  curriculumDay,
  meetFriend,
  recordAnswerStats,
  secondsLeft,
  spendStarlight,
} from '../../src/core/progress';

const t0 = Date.UTC(2026, 8, 24, 3, 0);

describe('save + play-day progression', () => {
  it('creates an empty save with defaults', () => {
    const s = createSave(t0);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.playDay).toBe(0);
    expect(s.settings.dailyMinutes).toBe(15);
    expect(s.settings.recordingEnabled).toBe(false);
  });

  it('first launch starts day 1', () => {
    const r = beginDay(createSave(t0), '2026-09-24');
    expect(r.status).toBe('first');
    expect(r.save.playDay).toBe(1);
    expect(r.save.today?.dayKey).toBe('2026-09-24');
  });

  it('same calendar day keeps the day', () => {
    const a = beginDay(createSave(t0), '2026-09-24').save;
    const b = beginDay(a, '2026-09-24');
    expect(b.status).toBe('same-day');
    expect(b.save.playDay).toBe(1);
  });

  it('advances one play day only after the friend was met', () => {
    const a = beginDay(createSave(t0), '2026-09-24').save;
    const notMet = beginDay(a, '2026-09-25');
    expect(notMet.save.playDay).toBe(1);
    const met = beginDay(meetFriend(a), '2026-09-25');
    expect(met.status).toBe('new-day');
    expect(met.save.playDay).toBe(2);
  });

  it('skipped calendar days never skip content', () => {
    const a = meetFriend(beginDay(createSave(t0), '2026-09-24').save);
    const r = beginDay(a, '2026-10-01');
    expect(r.status).toBe('returned');
    expect(r.save.playDay).toBe(2);
  });

  it('keeps a log entry for each finished day', () => {
    let s = meetFriend(beginDay(createSave(t0), '2026-09-24').save);
    s = addPlayTime(s, 120);
    s = beginDay(s, '2026-09-25').save;
    expect(s.log).toHaveLength(1);
    expect(s.log[0]!.seconds).toBe(120);
  });

  it('meeting the friend introduces the day words once', () => {
    let s = beginDay(createSave(t0), '2026-09-24').save;
    s = meetFriend(s);
    s = meetFriend(s);
    expect(Object.keys(s.words)).toEqual(['red', 'blue', 'yellow', 'green', 'pink']);
    expect(s.friendsMet).toEqual(['sami']);
    expect(s.today?.friendMet).toBe(true);
  });

  it('curriculum day clamps after day 30', () => {
    const s = { ...createSave(t0), playDay: 34 };
    expect(curriculumDay(s)).toBe(30);
  });

  it('tracks time left against the daily limit', () => {
    let s = beginDay(createSave(t0), '2026-09-24').save;
    expect(secondsLeft(s)).toBe(15 * 60);
    s = addPlayTime(s, 100);
    expect(secondsLeft(s)).toBe(800);
    s = addPlayTime(s, 5000);
    expect(secondsLeft(s)).toBe(0);
  });

  it('awards starlight and records stats per game', () => {
    let s = beginDay(createSave(t0), '2026-09-24').save;
    s = recordAnswerStats(s, 'word-garden', true);
    s = recordAnswerStats(s, 'word-garden', false);
    expect(s.games['word-garden']).toMatchObject({ correct: 1, wrong: 1 });
    expect(s.starlight).toBe(1);
    s = completeStation(s, 'word-garden', 2);
    expect(s.starlight).toBe(4);
    expect(s.today?.stationsDone).toBe(1);
    expect(s.games['word-garden']?.lastMode).toBe(2);
    expect(s.games['word-garden']?.played).toBe(1);
  });

  it('spends starlight only when there is enough', () => {
    const s = { ...createSave(t0), starlight: 5 };
    expect(spendStarlight(s, 3)?.starlight).toBe(2);
    expect(spendStarlight(s, 6)).toBeNull();
  });

  it('is immutable', () => {
    const s = createSave(t0);
    beginDay(s, '2026-09-24');
    expect(s.playDay).toBe(0);
  });
});
