import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { levelParams } from '../../src/core/levels';
import { makeAntPuzzle, makeAntRound, move, simulate, type AntPuzzle } from '../../src/games/ant-path/logic';

describe('ant path', () => {
  it('generated puzzles are solvable by their own solution and rocks avoid the path', () => {
    for (let l = 1; l <= 32; l += 3) {
      const p = levelParams('ant-path', l);
      for (const pz of makeAntRound(p, createRng(l), 5)) {
        expect(simulate(pz, pz.solution).result).toBe('goal');
        expect(pz.solution.length).toBeGreaterThanOrEqual(Math.min(p.pathMin, p.grid * p.grid - 1));
        expect(pz.solution.length).toBeLessThanOrEqual(p.pathMax);
        const path = simulate(pz, pz.solution).path;
        pz.rocks.forEach((r) => expect(path.some((c) => c.x === r.x && c.y === r.y)).toBe(false));
      }
    }
  });

  const pz: AntPuzzle = {
    size: 3,
    start: { x: 0, y: 0 },
    goal: { x: 2, y: 0 },
    rocks: [{ x: 1, y: 1 }],
    solution: ['right', 'right'],
  };

  it('reports rocks, edges and short runs', () => {
    expect(simulate(pz, ['down', 'right']).result).toBe('rock');
    expect(simulate(pz, ['up']).result).toBe('outside');
    expect(simulate(pz, ['right']).result).toBe('short');
    expect(simulate(pz, ['right', 'right', 'down']).result).toBe('goal');
    expect(simulate(pz, ['down', 'down', 'right', 'right', 'up', 'up']).result).toBe('goal');
  });

  it('moves one cell', () => {
    expect(move({ x: 1, y: 1 }, 'left')).toEqual({ x: 0, y: 1 });
  });

  it('single puzzle generation is deterministic', () => {
    const p = levelParams('ant-path', 10);
    expect(makeAntPuzzle(p, createRng(3))).toEqual(makeAntPuzzle(p, createRng(3)));
  });
});
