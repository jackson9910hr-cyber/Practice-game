import { LAST_DAY, days } from './content';
import type { Feature, GameId } from './types';

function keysUpTo(day: number): string[] {
  const d = Math.min(day, LAST_DAY);
  return days.filter((x) => x.day <= d).flatMap((x) => x.unlocks);
}

/** Highest unlocked mode (L-number) of a game on a play day; 0 = locked. */
export function maxMode(game: GameId, day: number): number {
  let best = 0;
  for (const k of keysUpTo(day)) {
    const [g, lvl] = k.split(':');
    if (g === game) best = Math.max(best, Number(lvl));
  }
  return best;
}

export function unlockedGames(day: number): GameId[] {
  const set = new Set<GameId>();
  for (const k of keysUpTo(day)) {
    const [g] = k.split(':');
    if (g !== 'feature') set.add(g as GameId);
  }
  return [...set];
}

export function hasFeature(day: number, f: Feature): boolean {
  return keysUpTo(day).includes(`feature:${f}`);
}

export function unlocksOn(day: number): string[] {
  return days.find((x) => x.day === day)?.unlocks ?? [];
}
