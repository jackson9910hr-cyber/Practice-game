/**
 * Spaced repetition for vocabulary: every word is reviewed 1, 3 and 7 play days after it
 * was introduced, plus one extra review the day after any wrong answer.
 */
export const REVIEW_OFFSETS = [1, 3, 7] as const;

export type ExposureKind = 'correct' | 'wrong' | 'passive';

export interface WordState {
  introducedDay: number;
  exposures: number;
  correct: number;
  wrong: number;
  /** review offsets (from REVIEW_OFFSETS) already completed */
  reviewsDone: number[];
  /** extra review days scheduled after mistakes */
  extraDue: number[];
  lastSeenDay: number;
}

export type WordStates = Record<string, WordState>;

export function introduce(states: WordStates, ids: readonly string[], day: number): WordStates {
  const out = { ...states };
  for (const id of ids) {
    if (out[id]) continue;
    out[id] = {
      introducedDay: day,
      exposures: 1,
      correct: 0,
      wrong: 0,
      reviewsDone: [],
      extraDue: [],
      lastSeenDay: day,
    };
  }
  return out;
}

/**
 * Priority of the most urgent pending review, or null if nothing is due by `day`.
 * Returns [stage, dueDay]: mistakes (stage 0) and early reviews (1-day) matter most for retention.
 */
function urgency(ws: WordState, day: number): [number, number] | null {
  if (ws.extraDue.some((d) => d <= day)) return [0, Math.min(...ws.extraDue)];
  for (let i = 0; i < REVIEW_OFFSETS.length; i++) {
    const off = REVIEW_OFFSETS[i]!;
    const due = ws.introducedDay + off;
    if (!ws.reviewsDone.includes(off) && due <= day) return [i + 1, due];
  }
  return null;
}

/** Word ids with a pending review on or before `day`: mistakes first, then by review stage, then most overdue. */
export function dueWords(states: WordStates, day: number): string[] {
  const due: [string, number, number][] = [];
  for (const [id, ws] of Object.entries(states)) {
    const u = urgency(ws, day);
    if (u) due.push([id, u[0], u[1]]);
  }
  return due.sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0].localeCompare(b[0])).map(([id]) => id);
}

export function recordExposure(states: WordStates, id: string, day: number, kind: ExposureKind): WordStates {
  const ws = states[id];
  if (!ws) return states;
  const next: WordState = {
    ...ws,
    exposures: ws.exposures + 1,
    lastSeenDay: day,
    reviewsDone: [...ws.reviewsDone],
    extraDue: [...ws.extraDue],
  };
  if (kind === 'correct') next.correct += 1;
  if (kind === 'wrong') {
    next.wrong += 1;
    if (!next.extraDue.includes(day + 1)) next.extraDue.push(day + 1);
  }
  if (kind !== 'passive') {
    // An active attempt completes pending extra reviews and at most one scheduled review.
    next.extraDue = next.extraDue.filter((d) => d > day);
    const pending = REVIEW_OFFSETS.filter(
      (off) => !next.reviewsDone.includes(off) && ws.introducedDay + off <= day,
    );
    if (pending.length > 0) next.reviewsDone.push(pending[0]!);
  }
  return { ...states, [id]: next };
}

export function isNewWord(states: WordStates, id: string, day: number): boolean {
  const ws = states[id];
  return !!ws && ws.introducedDay === day && ws.correct === 0;
}

export interface Confused {
  id: string;
  wrong: number;
  rate: number;
}

/** Words the child found hardest: wrong-rate with a small prior, only words with mistakes. */
export function topConfused(states: WordStates, n: number): Confused[] {
  return Object.entries(states)
    .filter(([, ws]) => ws.wrong > 0)
    .map(([id, ws]) => ({ id, wrong: ws.wrong, rate: ws.wrong / (ws.correct + ws.wrong + 1) }))
    .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong || a.id.localeCompare(b.id))
    .slice(0, n);
}
