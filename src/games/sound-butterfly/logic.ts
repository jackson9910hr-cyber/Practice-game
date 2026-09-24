/**
 * 소리 나비 (phonics): catch the letter for a sound (1), find a picture with the same first
 * (or, for x, last) sound (2), blend CVC sounds into a word (3), pick the heard CVC word (4).
 */
import { cvcWords, getLetter, getWord, hasWord, lettersUpTo, phonicsLetters } from '../../core/content';
import type { ButterflyParams } from '../../core/levelgen';
import type { Rng } from '../../core/rng';
import type { PhonicsLetter } from '../../core/types';

export const CONFUSABLE: Record<string, string[]> = {
  b: ['d', 'p'],
  d: ['b', 'p'],
  p: ['b', 'q'],
  q: ['p', 'g'],
  m: ['n', 'w'],
  n: ['m', 'h'],
  w: ['m', 'v'],
  i: ['l', 'j'],
  u: ['n', 'v'],
};

export type ButterflyQuestion =
  | { kind: 'letter'; letter: string; options: string[] }
  | { kind: 'sound-match'; letter: string; answer: string; options: string[]; position: 'initial' | 'final' }
  | { kind: 'blend'; word: string; options: string[] }
  | { kind: 'read'; word: string; options: string[] };

/** A picture is "learned" if it is a curriculum word already taught or a phonics-only picture word. */
function usablePicture(id: string, day: number): boolean {
  return !hasWord(id) || getWord(id).day <= day;
}

function soundKeyOf(l: PhonicsLetter) {
  return `${l.position}:${l.sound}`;
}

export function letterOptions(
  target: string,
  learned: string[],
  choices: number,
  confusable: boolean,
  rng: Rng,
): string[] {
  const opts = [target];
  if (confusable)
    for (const c of rng.shuffle(CONFUSABLE[target] ?? []))
      if (opts.length < choices && learned.includes(c)) opts.push(c);
  const pool = rng.shuffle(learned.filter((l) => !opts.includes(l)));
  // fall back to not-yet-learned letters only if too few learned (early days)
  const rest = rng.shuffle(
    phonicsLetters.map((l) => l.letter).filter((l) => !opts.includes(l) && !pool.includes(l)),
  );
  for (const l of [...pool, ...rest]) if (opts.length < choices) opts.push(l);
  return rng.shuffle(opts);
}

export function availableCvc(day: number): string[] {
  const known = new Set(lettersUpTo(day).map((l) => l.letter));
  return cvcWords.filter((c) => c.letters.every((l) => known.has(l))).map((c) => c.word);
}

function diffAt(a: string, b: string): number[] {
  return [0, 1, 2].filter((i) => a[i] !== b[i]);
}

export function cvcOptions(
  word: string,
  pool: string[],
  choices: number,
  diff: ButterflyParams['cvcDiff'],
  rng: Rng,
): string[] {
  const pos = diff === 'first' ? 0 : diff === 'last' ? 2 : 1;
  const others = rng.shuffle(pool.filter((w) => w !== word));
  const oneOff = others.filter((w) => diffAt(w, word).length === 1 && diffAt(w, word)[0] === pos);
  const near = others.filter((w) => diffAt(w, word).length <= 2);
  const opts = [word];
  for (const w of [...oneOff, ...near, ...others])
    if (opts.length < choices && !opts.includes(w)) opts.push(w);
  return rng.shuffle(opts);
}

export function makeButterflyRound(
  mode: number,
  letters: string[],
  day: number,
  p: ButterflyParams,
  rng: Rng,
): ButterflyQuestion[] {
  const learned = lettersUpTo(day).map((l) => l.letter);
  if (mode <= 1)
    return letters.map((l) => ({
      kind: 'letter',
      letter: l,
      options: letterOptions(l, learned, p.choices, p.confusable, rng),
    }));
  if (mode === 2) {
    return letters.map((l) => {
      const L = getLetter(l);
      const answer = rng.pick(
        L.pictures.filter((x) => usablePicture(x, day)).length
          ? L.pictures.filter((x) => usablePicture(x, day))
          : L.pictures,
      );
      const wrongPics = rng.shuffle(
        phonicsLetters
          .filter(
            (o) =>
              soundKeyOf(o) !== soundKeyOf(L) && !o.sound.startsWith(L.sound) && !L.sound.startsWith(o.sound),
          )
          .flatMap((o) => o.pictures)
          .filter((x) => usablePicture(x, day) && !L.pictures.includes(x)),
      );
      const options = [answer];
      for (const w of wrongPics)
        if (options.length < Math.max(2, p.choices) && !options.includes(w)) options.push(w);
      return { kind: 'sound-match', letter: l, answer, options: rng.shuffle(options), position: L.position };
    });
  }
  const pool = availableCvc(day);
  const words = rng.sample(pool, Math.min(6, pool.length));
  return words.map((w) =>
    mode === 3
      ? { kind: 'blend', word: w, options: cvcOptions(w, pool, p.cvcChoices, p.cvcDiff, rng) }
      : { kind: 'read', word: w, options: cvcOptions(w, pool, p.cvcChoices, p.cvcDiff, rng) },
  );
}

export function correctOption(q: ButterflyQuestion): string {
  switch (q.kind) {
    case 'letter':
      return q.letter;
    case 'sound-match':
      return q.answer;
    default:
      return q.word;
  }
}
