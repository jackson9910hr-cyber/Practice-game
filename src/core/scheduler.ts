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

/** Daily "복습 꽃밭": word garden on due words only, in a different mode than the main English station. */
function reviewStation(englishMode: number, day: number): StationPlan {
  const max = maxMode('word-garden', day);
  // quick choice modes only (memory pairs hold too few words for a review round)
  const modes = Array.from({ length: max }, (_, i) => i + 1).filter((m) => m !== englishMode && m !== 3);
  const mode = modes.length ? modes[(day + englishMode) % modes.length]! : max;
  // festival days: the last words have no later days to be reviewed in, so new words may join
  return { kind: 'review', game: 'word-garden', mode, review: day >= 29 ? 'all' : 'due' };
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
    const e = st('english', 'word-garden', 'all');
    return [
      e,
      ...thinking,
      st('phonics', 'sound-butterfly', 'all'),
      reviewStation(e.mode, day),
      st('sentence', 'sentence-train', 'all'),
    ];
  }
  if (cd.finale) {
    const e = st('english', 'word-garden', 'all');
    return [
      e,
      reviewStation(e.mode, day),
      st('sentence', 'sentence-train', 'all'),
      { kind: 'finale', mode: 0 },
    ];
  }
  if (day === 29) {
    const e = st('english', 'word-garden', 'all');
    return [
      e,
      st('phonics', 'sound-butterfly'),
      reviewStation(e.mode, day),
      st('sentence', 'sentence-train', 'all'),
      ...thinking,
    ];
  }
  if (cd.party) {
    const e = st('english', 'word-garden', 'week');
    return [
      { kind: 'chant', mode: 0 },
      e,
      ...thinking,
      reviewStation(e.mode, day),
      st('sentence', 'sentence-train', 'week'),
    ];
  }
  const plan: StationPlan[] = [];
  if (unlocksOn(day).includes('feature:greeting-medley')) plan.push({ kind: 'medley', mode: 0 });
  const english = st('english', 'word-garden');
  plan.push(english);
  if (day >= 2) plan.push(...thinking);
  plan.push(st('phonics', 'sound-butterfly'));
  if (day >= 2) plan.push(reviewStation(english.mode, day));
  if (maxMode('sentence-train', day) > 0) plan.push(st('sentence', 'sentence-train'));
  return plan;
}
