/** 길 찾기 개미: place arrows to walk the ant to the candy (1–2); follow spoken English directions (3). */
import type { AntParams } from '../../core/levelgen';
import type { Rng } from '../../core/rng';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
export interface Cell {
  x: number;
  y: number;
}
export interface AntPuzzle {
  size: number;
  start: Cell;
  goal: Cell;
  rocks: Cell[];
  solution: Dir[];
}

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const key = (c: Cell) => `${c.x},${c.y}`;

export function move(c: Cell, d: Dir): Cell {
  return { x: c.x + DELTA[d].x, y: c.y + DELTA[d].y };
}

export type RunResult = { result: 'goal' | 'rock' | 'outside' | 'short'; path: Cell[] };

/** Walks the moves; stops at the first rock / edge. Reaching the goal before the last move still wins. */
export function simulate(pz: AntPuzzle, moves: readonly Dir[]): RunResult {
  const rocks = new Set(pz.rocks.map(key));
  let cur = pz.start;
  const path = [cur];
  for (const m of moves) {
    const nx = move(cur, m);
    if (nx.x < 0 || nx.y < 0 || nx.x >= pz.size || nx.y >= pz.size) return { result: 'outside', path };
    if (rocks.has(key(nx))) return { result: 'rock', path };
    cur = nx;
    path.push(cur);
    if (cur.x === pz.goal.x && cur.y === pz.goal.y) return { result: 'goal', path };
  }
  return { result: 'short', path };
}

function randomWalk(size: number, len: number, rng: Rng): Cell[] | null {
  const start = { x: rng.int(0, size - 1), y: rng.int(0, size - 1) };
  const path = [start];
  const seen = new Set([key(start)]);
  while (path.length <= len) {
    const cur = path[path.length - 1]!;
    const opts = DIRS.map((d) => move(cur, d)).filter(
      (c) =>
        c.x >= 0 &&
        c.y >= 0 &&
        c.x < size &&
        c.y < size &&
        !seen.has(key(c)) &&
        // keep the path "simple": no shortcuts back next to earlier cells
        path.slice(0, -1).every((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) > 1),
    );
    if (opts.length === 0) return null;
    const nx = rng.pick(opts);
    path.push(nx);
    seen.add(key(nx));
  }
  return path;
}

function dirBetween(a: Cell, b: Cell): Dir {
  return DIRS.find((d) => move(a, d).x === b.x && move(a, d).y === b.y)!;
}

export function makeAntPuzzle(p: AntParams, rng: Rng): AntPuzzle {
  const maxLen = Math.min(p.pathMax, p.grid * p.grid - 1);
  for (let tries = 0; tries < 200; tries++) {
    const len = rng.int(Math.min(p.pathMin, maxLen), maxLen);
    const path = randomWalk(p.grid, len, rng);
    if (!path) continue;
    const onPath = new Set(path.map(key));
    const free: Cell[] = [];
    for (let y = 0; y < p.grid; y++)
      for (let x = 0; x < p.grid; x++) if (!onPath.has(key({ x, y }))) free.push({ x, y });
    const rocks = rng.sample(free, Math.min(p.obstacles, Math.max(0, free.length - 1)));
    const solution = path.slice(1).map((c, i) => dirBetween(path[i]!, c));
    return { size: p.grid, start: path[0]!, goal: path[path.length - 1]!, rocks, solution };
  }
  // fallback: straight line
  return { size: p.grid, start: { x: 0, y: 0 }, goal: { x: 1, y: 0 }, rocks: [], solution: ['right'] };
}

export function makeAntRound(p: AntParams, rng: Rng, count = 4): AntPuzzle[] {
  return Array.from({ length: count }, () => makeAntPuzzle(p, rng));
}
