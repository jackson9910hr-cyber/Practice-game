/** 단어 정원: listen→picture (1), picture→sound (2), memory pairs (3), moving action cards (4). */
import { getWord } from '../../core/content';
import type { WordGardenParams } from '../../core/levelgen';
import type { SaveData } from '../../core/progress';
import type { Rng } from '../../core/rng';
import { pickDistractors, pickWordTargets, type Scope } from '../../core/rounds';

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

export const WORD_GARDEN_ROUND = { choice: 8, listen2: 6 };
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
  const count = mode === 2 ? WORD_GARDEN_ROUND.listen2 : WORD_GARDEN_ROUND.choice;
  let targets = pickWordTargets(save, day, count, rng, scope);
  if (mode === 4) {
    const moving = rng.shuffle(pool.filter((id) => MOVING.has(getWord(id).category)));
    if (moving.length >= 3)
      targets = rng.shuffle([...moving.slice(0, count / 2), ...targets.slice(0, count / 2)]);
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
