import { describe, expect, it } from 'vitest';
import { KIDS, simulateKid } from '../../src/core/simulate';

describe('Stage 4 balance simulation (3 virtual children × 30 play days)', () => {
  const runs = KIDS.flatMap((kid, k) => [0, 1].map((i) => simulateKid(kid, 500 + i * 31 + k)));

  it('every one of the 150 English words is heard at least 5 times in 30 days', () => {
    for (const r of runs) {
      const low = Object.entries(r.exposures).filter(([, n]) => n < 5);
      expect(low, `${r.kid.name}`).toEqual([]);
      expect(Object.keys(r.exposures)).toHaveLength(150);
    }
  });

  it('first-try accuracy stays in the adaptive band (≈70–85%)', () => {
    for (const r of runs) {
      const t = r.days.reduce((a, d) => ({ c: a.c + d.correct, w: a.w + d.wrong }), { c: 0, w: 0 });
      const acc = t.c / (t.c + t.w);
      expect(acc).toBeGreaterThan(0.66);
      expect(acc).toBeLessThan(0.88);
    }
  });

  it('a day fits in the 15-minute default and almost every station gets played', () => {
    for (const r of runs) {
      const avg = r.days.reduce((a, d) => a + d.minutes, 0) / r.days.length;
      expect(avg).toBeLessThanOrEqual(15);
      const planned = r.days.reduce((a, d) => a + d.planned, 0);
      const done = r.days.reduce((a, d) => a + d.done, 0);
      expect(done / planned).toBeGreaterThan(0.97);
    }
  });

  it('almost all 1/3/7-day reviews happen', () => {
    for (const r of runs) expect(r.missedReviews.length).toBeLessThan(45); // of ~435 scheduled
  });
}, 60_000);
