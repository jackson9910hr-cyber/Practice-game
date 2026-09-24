/**
 * Navigation between scenes. Scenes import `nav` and call e.g. `nav.hub()`; the concrete scene
 * classes are registered from main.ts to avoid import cycles.
 */
import type { GameApp } from './engine/app';
import type { Router, Scene } from './engine/scene';
import type { StationPlan } from './core/types';

export interface SceneFactories {
  hub: () => Scene;
  arrival: () => Scene;
  station: (index: number, plan: StationPlan) => Scene;
  goodnight: (reason: 'done' | 'time') => Scene;
  codex: () => Scene;
  chapter: (chapter: number) => Scene;
  finale: () => Scene;
}

/**
 * Every method takes the scene asking to navigate: requests from a scene that is no longer the
 * current one (a script still finishing after the child left) are ignored.
 */
class Nav {
  game!: GameApp;
  router!: Router;
  f!: SceneFactories;

  private go(from: Scene | undefined, make: () => Scene) {
    if (from && (!from.alive || this.router.scene !== from)) return Promise.resolve();
    return this.router.go(make);
  }
  hub(from?: Scene) {
    return this.go(from, this.f.hub);
  }
  arrival(from?: Scene) {
    return this.go(from, this.f.arrival);
  }
  station(index: number, plan: StationPlan, from?: Scene) {
    return this.go(from, () => this.f.station(index, plan));
  }
  goodnight(reason: 'done' | 'time' = 'done', from?: Scene) {
    return this.go(from, () => this.f.goodnight(reason));
  }
  codex(from?: Scene) {
    return this.go(from, this.f.codex);
  }
  chapter(n: number, from?: Scene) {
    return this.go(from, () => this.f.chapter(n));
  }
  finale(from?: Scene) {
    return this.go(from, this.f.finale);
  }
}

export const nav = new Nav();
