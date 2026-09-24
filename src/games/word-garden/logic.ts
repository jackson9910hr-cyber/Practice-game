/** 단어 정원: listen→picture (1), picture→sound (2), memory pairs (3), moving action cards (4). */
import { getWord } from '../../core/content';
import type { WordGardenParams } from '../../core/levelgen';
import type { SaveData } from '../../core/progress';
import type { Rng } from '../../core/rng';
import { pickDistractors, pickWordTargets, reviewCount, type Scope } from '../../core/rounds';
import { dueWords, isNewWord } from '../../core/srs';

export interface ChoiceQuestion {
  kind: 'choice';
  target: string;
  options: string[];
}
export interface MemoryRound {
  kind: 'memory';
  pairs: string[];
}
export type WordGardenRound =
  { mode: number; questions: ChoiceQuestion[] } | { mode: 3; memory: MemoryRound };

/** Questions per round; the last two days practise a little more (their words have no later reviews). */
export const WORD_GARDEN_ROUND = { choice: 8, listen2: 6, festivalChoice: 10, festivalListen2: 8 };
const MOVING = new Set(['action', 'feeling']);

function introducedPool(save: SaveData, day: number): string[] {
  return Object.keys(save.words).filter((id) => getWord(id).day <= day);
}

export function makeWordGardenRound(
  save: SaveData,
  day: number,
  mode: number,
  p: WordGardenParams,
  rng: Rng,
  scope?: Scope,
): WordGardenRound {
  const pool = introducedPool(save, day);
  if (mode === 3) {
    const targets = [...new Set(pickWordTargets(save, day, p.pairs * 2, rng, scope))].slice(0, p.pairs);
    for (const id of rng.shuffle(pool))
      if (targets.length < Math.min(p.pairs, pool.length) && !targets.includes(id)) targets.push(id);
    return { mode: 3, memory: { kind: 'memory', pairs: targets } };
  }
  const fest = day >= 29;
  let count = mode === 2 ? WORD_GARDEN_ROUND.listen2 : WORD_GARDEN_ROUND.choice;
  if (scope === 'due') count = reviewCount(save, day);
  // festival days: bigger catch-up rounds (these words have no later days for spaced review)
  else if (fest)
    count = Math.max(
      mode === 2 ? WORD_GARDEN_ROUND.festivalListen2 : WORD_GARDEN_ROUND.festivalChoice,
      reviewCount(save, day),
    );
  const targets = pickWordTargets(save, day, count, rng, scope);
  if (mode === 4) {
    // action cards: make sure a few moving words appear, replacing only plain "known" filler
    // (never a new word or a due review)
    const keep = new Set([
      ...dueWords(save.words, day),
      ...targets.filter((id) => isNewWord(save.words, id, day)),
    ]);
    const moving = rng.shuffle(
      pool.filter((id) => MOVING.has(getWord(id).category) && !targets.includes(id)),
    );
    for (
      let i = targets.length - 1;
      i >= 0 && targets.filter((id) => MOVING.has(getWord(id).category)).length < 3 && moving.length;
      i--
    ) {
      if (!keep.has(targets[i]!) && !MOVING.has(getWord(targets[i]!).category)) targets[i] = moving.shift()!;
    }
  }
  const choices = mode === 2 ? Math.min(p.choices, 3) : p.choices;
  const questions = targets.map((target) => {
    const d = pickDistractors(target, pool, choices - 1, rng, p.sameCategory);
    return { kind: 'choice' as const, target, options: rng.shuffle([target, ...d]) };
  });
  return { mode, questions };
}

export function isMoving(id: string): boolean {
  return MOVING.has(getWord(id).category);
}
