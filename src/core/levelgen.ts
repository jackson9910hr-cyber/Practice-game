/**
 * Difficulty ladders for every mini-game. `scripts/gen-levels.ts` writes these to
 * src/data/levels/<game>.json (the runtime reads the JSON); tests check they stay in sync.
 * Level 1 is the gentlest; each step changes at most a couple of knobs.
 */
import type { GameId } from './types';

export const LEVEL_COUNT = 32;

const step = (level: number, from: number, to: number, startAt = 1, endAt = LEVEL_COUNT): number => {
  if (level <= startAt) return from;
  if (level >= endAt) return to;
  const t = (level - startAt) / (endAt - startAt);
  return Math.round(from + (to - from) * t);
};
const frac = (level: number, from: number, to: number, startAt = 1, endAt = LEVEL_COUNT): number => {
  if (level <= startAt) return from;
  if (level >= endAt) return to;
  return Math.round((from + ((to - from) * (level - startAt)) / (endAt - startAt)) * 100) / 100;
};

export interface WordGardenParams {
  choices: number;
  sameCategory: number;
  pairs: number;
}
export interface ButterflyParams {
  choices: number;
  speed: number;
  confusable: boolean;
  cvcChoices: number;
  cvcDiff: 'first' | 'last' | 'middle';
}
export interface HangulParams {
  extraPieces: number;
  ghost: boolean;
  blanks: number;
}
export interface FireflyParams {
  count10: number;
  count20: number;
  sum10: number;
  sum20: number;
  scatter: number;
  choices: number;
  subtractChance: number;
}
export interface PatternParams {
  units: string[];
  visible: number;
  attrs: number;
  choices: number;
  blankMiddle: boolean;
}
export interface AntParams {
  grid: number;
  obstacles: number;
  pathMin: number;
  pathMax: number;
}
export interface TrainParams {
  extraCards: number;
  firstFixed: boolean;
  pictureChoices: number;
}

export interface LevelParamsMap {
  'word-garden': WordGardenParams;
  'sound-butterfly': ButterflyParams;
  'hangul-pieces': HangulParams;
  'number-fireflies': FireflyParams;
  'pattern-path': PatternParams;
  'ant-path': AntParams;
  'sentence-train': TrainParams;
}

export type LevelTable<G extends GameId> = {
  game: G;
  levels: { level: number; params: LevelParamsMap[G] }[];
};

const gens: { [G in GameId]: (l: number) => LevelParamsMap[G] } = {
  'word-garden': (l) => ({
    choices: l < 6 ? 2 : l < 15 ? 3 : 4,
    sameCategory: frac(l, 0, 0.8, 8),
    pairs: l < 10 ? 3 : l < 20 ? 4 : l < 27 ? 5 : 6,
  }),
  'sound-butterfly': (l) => ({
    choices: l < 6 ? 2 : l < 16 ? 3 : 4,
    speed: frac(l, 0.5, 0.9),
    confusable: l >= 18,
    cvcChoices: l < 8 ? 2 : l < 18 ? 3 : 4,
    cvcDiff: l < 12 ? 'first' : l < 22 ? 'last' : 'middle',
  }),
  'hangul-pieces': (l) => ({
    extraPieces: step(l, 1, 5),
    ghost: l <= 8,
    blanks: l < 12 ? 1 : l < 24 ? 2 : 3,
  }),
  'number-fireflies': (l) => ({
    count10: step(l, 4, 10, 1, 16),
    count20: step(l, 12, 20, 1, 20),
    sum10: step(l, 5, 10, 1, 16),
    sum20: step(l, 12, 20, 1, 24),
    scatter: frac(l, 0, 1),
    choices: l < 14 ? 3 : 4,
    subtractChance: frac(l, 0.2, 0.5),
  }),
  'pattern-path': (l) => ({
    units:
      l < 5
        ? ['AB']
        : l < 12
          ? ['AB', 'ABC']
          : l < 20
            ? ['AB', 'ABC', 'AAB', 'ABB']
            : ['ABC', 'AAB', 'ABB', 'AABB', 'ABCD'],
    visible: step(l, 4, 8),
    attrs: l < 16 ? 1 : 2,
    choices: l < 6 ? 2 : l < 18 ? 3 : 4,
    blankMiddle: l >= 24,
  }),
  'ant-path': (l) => ({
    grid: l < 8 ? 3 : l < 16 ? 4 : l < 24 ? 5 : 6,
    obstacles: step(l, 0, 7),
    pathMin: step(l, 2, 6),
    pathMax: step(l, 3, 9),
  }),
  'sentence-train': (l) => ({
    extraCards: l < 10 ? 0 : l < 22 ? 1 : 2,
    firstFixed: l <= 6,
    pictureChoices: l < 12 ? 2 : l < 24 ? 3 : 4,
  }),
};

export function generateLevels<G extends GameId>(game: G): LevelTable<G> {
  const gen = gens[game] as (l: number) => LevelParamsMap[G];
  return {
    game,
    levels: Array.from({ length: LEVEL_COUNT }, (_, i) => ({ level: i + 1, params: gen(i + 1) })),
  };
}
