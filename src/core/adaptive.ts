/**
 * Per-game adaptive difficulty: keep recent accuracy inside 70–85%.
 * Level is an index into the generated level table of that game (1-based).
 */
export const ADAPTIVE = {
  window: 10,
  minSamples: 5,
  high: 0.85,
  low: 0.7,
  cooldown: 5,
} as const;

export interface AdaptiveState {
  level: number;
  history: boolean[];
  sinceAdjust: number;
}

export function createAdaptive(level = 1): AdaptiveState {
  return { level, history: [], sinceAdjust: ADAPTIVE.cooldown };
}

export function accuracy(s: AdaptiveState): number | null {
  if (s.history.length === 0) return null;
  return s.history.filter(Boolean).length / s.history.length;
}

export function recordAnswer(
  s: AdaptiveState,
  correct: boolean,
  maxLevel: number,
  minLevel = 1,
): AdaptiveState {
  const history = [...s.history, correct].slice(-ADAPTIVE.window);
  let level = s.level;
  let sinceAdjust = s.sinceAdjust + 1;
  if (history.length >= ADAPTIVE.minSamples && sinceAdjust >= ADAPTIVE.cooldown) {
    const acc = history.filter(Boolean).length / history.length;
    const last5 = history.slice(-5).filter(Boolean).length;
    if (acc > ADAPTIVE.high && level < maxLevel) {
      // five in a row: fast-track, so games played only every few days catch up quickly
      level += last5 === 5 ? 2 : 1;
      sinceAdjust = 0;
    } else if (acc < ADAPTIVE.low && level > minLevel) {
      level -= last5 <= 1 ? 2 : 1;
      sinceAdjust = 0;
    }
  }
  return { level: Math.min(Math.max(level, minLevel), maxLevel), history, sinceAdjust };
}
