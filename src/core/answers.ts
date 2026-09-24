/**
 * Answer bookkeeping shared by the real game views and the balance simulator:
 * stats + starlight, adaptive level (per game:mode), spaced-repetition exposures, phonics stats.
 */
import { createAdaptive, recordAnswer } from './adaptive';
import { levelCount } from './levels';
import { recordAnswerStats, type SaveData } from './progress';
import { recordExposure, type ExposureKind } from './srs';
import type { GameId } from './types';

export interface AnswerInput {
  game: GameId;
  mode: number;
  day: number;
  correct: boolean;
  /** answered only after the "together" assist → counts as a miss for the adaptive level */
  assisted?: boolean;
  words?: readonly string[];
  letter?: string;
}

export function adaptiveKey(game: GameId, mode: number) {
  return `${game}:${mode}`;
}

/**
 * Starting level for a game mode the child has never played: half of what they reached in the
 * previous mode of the same game (or 1). New content starts gentle but not babyish.
 */
export function startLevel(save: SaveData, game: GameId, mode: number): number {
  const prev = save.adaptive[adaptiveKey(game, mode - 1)];
  return prev ? Math.max(1, Math.round(prev.level / 2)) : 1;
}

export function applyAnswer(save: SaveData, a: AnswerInput): SaveData {
  const key = adaptiveKey(a.game, a.mode);
  const clean = a.correct && !a.assisted;
  let n = recordAnswerStats(save, a.game, clean);
  const ad = recordAnswer(
    n.adaptive[key] ?? createAdaptive(startLevel(save, a.game, a.mode)),
    clean,
    levelCount(a.game),
  );
  n = { ...n, adaptive: { ...n.adaptive, [key]: ad } };
  let w = n.words;
  for (const id of a.words ?? []) w = recordExposure(w, id, a.day, a.correct ? 'correct' : 'wrong');
  n = { ...n, words: w };
  if (a.letter) {
    const l = n.letters[a.letter] ?? { correct: 0, wrong: 0 };
    n = {
      ...n,
      letters: {
        ...n.letters,
        [a.letter]: { correct: l.correct + (clean ? 1 : 0), wrong: l.wrong + (clean ? 0 : 1) },
      },
    };
  }
  return n;
}

/** Heard-but-not-answered exposures (word intro recap, chant, counting aloud). */
export function exposeWords(
  save: SaveData,
  ids: readonly string[],
  day: number,
  kind: ExposureKind = 'passive',
): SaveData {
  let w = save.words;
  for (const id of ids) if (w[id]) w = recordExposure(w, id, day, kind);
  return w === save.words ? save : { ...save, words: w };
}
