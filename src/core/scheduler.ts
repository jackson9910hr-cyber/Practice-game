/**
 * Builds the day's "garden path": the ordered list of stations the child plays.
 * Deterministic for a given save so a reload shows the same path.
 */
import { LAST_DAY, getDay } from './content';
import { curriculumDay, type SaveData } from './progress';
import { maxMode, unlockedGames, unlocksOn } from './unlocks';
import { THINKING_GAMES, type GameId, type StationPlan } from './types';

/** Newest mode on the day it unlocks / after another mode; otherwise cycle older modes. */
export function chooseMode(save: SaveData, game: GameId, day: number): number {
  const max = maxMode(game, day);
  if (max <= 1) return max;
  if (unlocksOn(day).includes(`${game}:${max}`)) return max;
  const st = save.games[game];
  if (!st || st.lastMode !== max) return max;
  return (st.played % (max - 1)) + 1;
}

function chooseThinking(save: SaveData, day: number, avoid?: GameId): GameId | null {
  const open = THINKING_GAMES.filter((g) => unlockedGames(day).includes(g));
  if (open.length === 0) return null;
  const fresh = open.find((g) => unlocksOn(day).some((k) => k.startsWith(`${g}:`)));
  if (fresh) return fresh;
  const candidates = open.length > 1 && avoid ? open.filter((g) => g !== avoid) : open;
  return [...candidates].sort(
    (a, b) => (save.games[a]?.lastPlayedDay ?? 0) - (save.games[b]?.lastPlayedDay ?? 0),
  )[0]!;
}

function lastThinking(save: SaveData): GameId | undefined {
  let best: GameId | undefined;
  let bestDay = -1;
  for (const g of THINKING_GAMES) {
    const d = save.games[g]?.lastPlayedDay ?? -1;
    if (d > bestDay) {
      bestDay = d;
      best = g;
    }
  }
  return bestDay >= 0 ? best : undefined;
}

export function planDay(save: SaveData): StationPlan[] {
  const day = curriculumDay(save);
  const post = save.playDay > LAST_DAY;
  const cd = getDay(day);
  const st = (kind: StationPlan['kind'], game: GameId, review?: StationPlan['review']): StationPlan => ({
    kind,
    game,
    mode: chooseMode(save, game, day),
    ...(review ? { review } : {}),
  });
  const thinkingGame = chooseThinking(save, day, lastThinking(save));
  const thinking = thinkingGame ? [st('thinking', thinkingGame)] : [];

  if (post) {
    return [
      st('english', 'word-garden', 'all'),
      ...thinking,
      st('phonics', 'sound-butterfly', 'all'),
      st('sentence', 'sentence-train', 'all'),
    ];
  }
  if (cd.finale) {
    return [
      st('english', 'word-garden', 'all'),
      st('sentence', 'sentence-train', 'all'),
      { kind: 'finale', mode: 0 },
    ];
  }
  if (day === 29) {
    return [
      st('english', 'word-garden', 'all'),
      st('phonics', 'sound-butterfly'),
      st('sentence', 'sentence-train', 'all'),
      ...thinking,
    ];
  }
  if (cd.party) {
    return [
      { kind: 'chant', mode: 0 },
      st('english', 'word-garden', 'week'),
      ...thinking,
      st('sentence', 'sentence-train', 'week'),
    ];
  }
  const plan: StationPlan[] = [];
  if (unlocksOn(day).includes('feature:greeting-medley')) plan.push({ kind: 'medley', mode: 0 });
  plan.push(st('english', 'word-garden'));
  if (day >= 2) plan.push(...thinking);
  plan.push(st('phonics', 'sound-butterfly'));
  if (maxMode('sentence-train', day) > 0) plan.push(st('sentence', 'sentence-train'));
  return plan;
}
