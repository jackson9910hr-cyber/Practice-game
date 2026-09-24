/** 숫자 반딧불: count to 10 (1) / 20 (2), add & subtract within 10 (3) / 20 (4). Numbers are spoken in English. */
import type { FireflyParams } from '../../core/levelgen';
import type { Rng } from '../../core/rng';

export type FireflyQuestion =
  | { kind: 'count'; n: number; options: number[] }
  | { kind: 'add' | 'sub'; a: number; b: number; answer: number; options: number[] };

export function answerOf(q: FireflyQuestion): number {
  return q.kind === 'count' ? q.n : q.answer;
}

export function numberOptions(answer: number, choices: number, max: number, rng: Rng): number[] {
  const set = new Set([answer]);
  const near = rng.shuffle([-2, -1, 1, 2, 3, -3]);
  for (const d of near) {
    const v = answer + d;
    if (set.size < choices && v >= 0 && v <= max) set.add(v);
  }
  for (let v = 0; set.size < choices; v++) set.add(v);
  return [...set].sort((a, b) => a - b);
}

export function makeFireflyRound(mode: number, p: FireflyParams, rng: Rng, count = 6): FireflyQuestion[] {
  const qs: FireflyQuestion[] = [];
  const countMax = mode === 1 ? p.count10 : p.count20;
  const countMin = mode === 1 ? 1 : Math.min(8, countMax);
  const sumMax = mode === 4 ? p.sum20 : p.sum10;
  let prev = -1;
  while (qs.length < count) {
    // modes 3/4 still open with a counting warm-up
    if (mode <= 2 || qs.length < 2) {
      const cm = mode <= 2 ? countMax : Math.min(10, p.count10);
      const n = rng.int(mode <= 2 ? countMin : 1, cm);
      if (n === prev && cm > 1) continue;
      prev = n;
      qs.push({ kind: 'count', n, options: numberOptions(n, p.choices, 20, rng) });
      continue;
    }
    if (rng.chance(p.subtractChance)) {
      const a = rng.int(2, sumMax);
      const b = rng.int(1, a - 1);
      qs.push({ kind: 'sub', a, b, answer: a - b, options: numberOptions(a - b, p.choices, 20, rng) });
    } else {
      const total = rng.int(2, sumMax);
      const a = rng.int(1, total - 1);
      qs.push({
        kind: 'add',
        a,
        b: total - a,
        answer: total,
        options: numberOptions(total, p.choices, 20, rng),
      });
    }
  }
  return qs;
}
