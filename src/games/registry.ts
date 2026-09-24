import type { StationPlan } from '../core/types';
import type { GameApp } from '../engine/app';
import type { Scene } from '../engine/scene';
import { HangulView } from './hangul-pieces/view';
import { SentenceTrainView } from './sentence-train/view';
import { WordGardenView } from './word-garden/view';
import { ButterflyView } from './sound-butterfly/view';
import { FireflyView } from './number-fireflies/view';
import { PatternView } from './pattern-path/view';
import { AntView } from './ant-path/view';

export function makeGameView(game: GameApp, plan: StationPlan, index: number): Scene {
  switch (plan.game) {
    case 'hangul-pieces':
      return new HangulView(game, plan, index);
    case 'sentence-train':
      return new SentenceTrainView(game, plan, index);
    case 'sound-butterfly':
      return new ButterflyView(game, plan, index);
    case 'number-fireflies':
      return new FireflyView(game, plan, index);
    case 'pattern-path':
      return new PatternView(game, plan, index);
    case 'ant-path':
      return new AntView(game, plan, index);
    default:
      return new WordGardenView(game, plan, index);
  }
}
