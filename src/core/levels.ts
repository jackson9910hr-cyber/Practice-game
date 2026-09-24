import wordGarden from '../data/levels/word-garden.json';
import soundButterfly from '../data/levels/sound-butterfly.json';
import hangulPieces from '../data/levels/hangul-pieces.json';
import numberFireflies from '../data/levels/number-fireflies.json';
import patternPath from '../data/levels/pattern-path.json';
import antPath from '../data/levels/ant-path.json';
import sentenceTrain from '../data/levels/sentence-train.json';
import type { LevelParamsMap, LevelTable } from './levelgen';
import type { GameId } from './types';

const tables = {
  'word-garden': wordGarden,
  'sound-butterfly': soundButterfly,
  'hangul-pieces': hangulPieces,
  'number-fireflies': numberFireflies,
  'pattern-path': patternPath,
  'ant-path': antPath,
  'sentence-train': sentenceTrain,
} as unknown as { [G in GameId]: LevelTable<G> };

export function levelCount(game: GameId): number {
  return tables[game].levels.length;
}

export function levelParams<G extends GameId>(game: G, level: number): LevelParamsMap[G] {
  const t = tables[game];
  const i = Math.min(Math.max(Math.round(level), 1), t.levels.length) - 1;
  return t.levels[i]!.params;
}
