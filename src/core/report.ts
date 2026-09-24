/** Numbers for the parent dashboard, derived from the save only. */
import { getWord, patterns, sentences } from './content';
import { curriculumDay, type SaveData } from './progress';
import { topConfused } from './srs';
import { GAME_IDS, type GameId } from './types';

export interface GameAccuracy {
  game: GameId;
  correct: number;
  wrong: number;
  rate: number | null;
  played: number;
}

export function gameAccuracy(save: SaveData): GameAccuracy[] {
  return GAME_IDS.map((game) => {
    const s = save.games[game];
    const correct = s?.correct ?? 0;
    const wrong = s?.wrong ?? 0;
    return {
      game,
      correct,
      wrong,
      played: s?.played ?? 0,
      rate: correct + wrong ? correct / (correct + wrong) : null,
    };
  });
}

export function learnedWords(save: SaveData) {
  return Object.entries(save.words)
    .map(([id, ws]) => ({ ...getWord(id), exposures: ws.exposures, correct: ws.correct, wrong: ws.wrong }))
    .sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
}

export function learnedPatterns(save: SaveData) {
  if (save.friendsMet.length === 0) return [];
  const day = curriculumDay(save);
  return patterns
    .filter((p) => p.day <= day && (p.day < day || save.today?.friendMet))
    .map((p) => ({ ...p, example: sentences.find((s) => s.pattern === p.id)!.text }));
}

export function confusedTop(save: SaveData, n = 5) {
  return topConfused(save.words, n).map((c) => ({ ...c, word: getWord(c.id) }));
}

export function todaySummary(save: SaveData) {
  const t = save.today;
  return {
    playDay: save.playDay,
    minutes: t ? Math.round(t.seconds / 60) : 0,
    stationsDone: t?.stationsDone ?? 0,
    stationsTotal: t?.stations.length ?? 0,
    correct: t?.correct ?? 0,
    wrong: t?.wrong ?? 0,
    friendMet: t?.friendMet ?? false,
  };
}
