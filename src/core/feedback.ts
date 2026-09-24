/** Hint ladder and praise rotation shared by every mini-game. */
import type { Rng } from './rng';

export type Assist = 'none' | 'hint' | 'together';

/** 0–1 mistakes: nothing; 2nd mistake: hint (replay + sparkle); 3rd: do it together. */
export function assistFor(wrongCount: number): Assist {
  if (wrongCount >= 3) return 'together';
  if (wrongCount >= 2) return 'hint';
  return 'none';
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
