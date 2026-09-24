/** Hint ladder and praise rotation shared by every mini-game. */
import type { Rng } from './rng';

export type Assist = 'none' | 'hint' | 'together';

/**
 * 0–1 mistakes: nothing; 2nd mistake: hint (replay + sparkle); 3rd: do it together.
 * In help mode (a child still struggling at the easiest level) every step comes one mistake sooner.
 */
export function assistFor(wrongCount: number, helpMode = false): Assist {
  const w = wrongCount + (helpMode ? 1 : 0);
  if (w >= 3) return 'together';
  if (w >= 2) return 'hint';
  return 'none';
}

/** Help mode: at level 1 with at least 5 answers and under 60% first-try accuracy. */
export function needsHelp(a: { level: number; history: boolean[] } | undefined): boolean {
  if (!a || a.level > 1 || a.history.length < 5) return false;
  return a.history.filter(Boolean).length / a.history.length < 0.6;
}

export interface Praiser {
  next(streak?: number): { text: string; index: number; big: boolean };
}

/** Rotates praise lines, never the same line twice in a row; every 3rd streak answer is "big". */
export function createPraiser(lines: readonly string[], bigLines: readonly string[], rng: Rng): Praiser {
  let last = -1;
  let lastBig = -1;
  return {
    next(streak = 0) {
      const big = streak > 0 && streak % 3 === 0 && bigLines.length > 0;
      const list = big ? bigLines : lines;
      const prev = big ? lastBig : last;
      let i = Math.floor(rng.next() * list.length);
      if (list.length > 1 && i === prev)
        i = (i + 1 + Math.floor(rng.next() * (list.length - 1))) % list.length;
      if (big) lastBig = i;
      else last = i;
      return { text: list[i]!, index: i, big };
    },
  };
}
