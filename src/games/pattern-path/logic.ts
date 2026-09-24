/** 패턴 꽃길: find the rule in a row of flowers (color → units → shape/size → English names). */
import type { PatternParams } from '../../core/levelgen';
import type { Rng } from '../../core/rng';

export const COLORS = ['red', 'blue', 'yellow', 'green', 'pink', 'purple', 'orange'] as const;
export const SHAPES = ['circle', 'square', 'triangle', 'heart', 'star'] as const;
export const SIZES = ['big', 'small'] as const;

export interface Flower {
  color: string;
  shape: string;
  size: string;
}
export interface PatternQuestion {
  unit: string;
  row: Flower[];
  blank: number;
  answer: Flower;
  options: Flower[];
  /** English words that describe the varying attribute(s), for narration */
  dims: ('color' | 'shape' | 'size')[];
}

export const same = (a: Flower, b: Flower) => a.color === b.color && a.shape === b.shape && a.size === b.size;
export const nameOf = (f: Flower, dims: PatternQuestion['dims']) => dims.map((d) => f[d]);

export function makePatternRound(mode: number, p: PatternParams, rng: Rng, count = 6): PatternQuestion[] {
  const qs: PatternQuestion[] = [];
  for (let n = 0; n < count; n++) {
    let dims: PatternQuestion['dims'] = ['color'];
    if (mode >= 3) {
      const pick = rng.pick<PatternQuestion['dims'][number]>(['color', 'shape', 'size']);
      dims = p.attrs >= 2 && pick !== 'color' ? ['color', pick] : [pick];
    }
    const unit = mode === 1 ? 'AB' : rng.pick(p.units);
    // 'flower' is the plain flower head; shapes are only used when shape is the rule
    const base: Flower = { color: rng.pick(COLORS), shape: 'flower', size: 'big' };
    // distinct value per letter for each varying dim (size only has 2 values → only 2-letter units)
    const effUnit = dims.includes('size') && new Set(unit).size > 2 ? 'AB' : unit;
    const effLetters = [...new Set(effUnit)];
    const pools = {
      color: rng.shuffle(COLORS),
      shape: rng.shuffle(SHAPES),
      size: rng.shuffle(SIZES),
    };
    const byLetter = new Map<string, Flower>();
    effLetters.forEach((l, i) => {
      const f = { ...base };
      for (const d of dims) f[d] = pools[d][i % pools[d].length]!;
      byLetter.set(l, f);
    });
    const len = Math.max(p.visible, effUnit.length * 2) + 1;
    const row = Array.from({ length: len }, (_, i) => byLetter.get(effUnit[i % effUnit.length]!)!);
    const blank = p.blankMiddle && len > 4 ? rng.int(effUnit.length, len - 2) : len - 1;
    const answer = row[blank]!;
    const opts: Flower[] = [answer];
    const cands = rng.shuffle([
      ...[...byLetter.values()],
      ...COLORS.map((c) => ({ ...answer, color: c })),
      ...SHAPES.map((s) => ({ ...answer, shape: s })),
      ...SIZES.map((s) => ({ ...answer, size: s })),
    ]);
    for (const c of cands) {
      if (opts.length < p.choices && !opts.some((o) => same(o, c)) && sameExcept(c, answer, dims))
        opts.push(c);
    }
    qs.push({ unit: effUnit, row, blank, answer, options: rng.shuffle(opts), dims });
  }
  return qs;
}

/** Options only differ from the answer in the attributes the question is about. */
function sameExcept(a: Flower, b: Flower, dims: PatternQuestion['dims']): boolean {
  return (['color', 'shape', 'size'] as const).every((k) => dims.includes(k) || a[k] === b[k]);
}
