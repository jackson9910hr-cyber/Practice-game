/**
 * Chooses *what* each round practises: target words (new ≤ 30%, due reviews first),
 * distractors, sentences and phonics letters.
 */
import { chapterOf, getDay, getWord, lettersUpTo, patterns, sentences } from './content';
import type { SaveData } from './progress';
import type { Rng } from './rng';
import { dueWords, isNewWord } from './srs';
import type { Sentence } from './types';

export const NEW_WORD_CAP = 0.3;
/** week = this chapter's words, all = everything learned, due = spaced-review round (due words first) */
export type Scope = 'week' | 'all' | 'due' | undefined;

function inScope(id: string, day: number, scope: Scope): boolean {
  const w = getWord(id);
  if (w.day > day) return false;
  if (scope === 'week') {
    const [from, to] = chapterOf(day).days;
    return w.day >= from && w.day <= Math.min(to, day);
  }
  return true;
}

/** Avoid the same target twice in a row when words have to repeat. */
function spread(ids: string[], rng: Rng): string[] {
  const out = rng.shuffle(ids);
  for (let i = 1; i < out.length; i++) {
    if (out[i] === out[i - 1]) {
      const j = out.findIndex((x, k) => k > i && x !== out[i] && out[k - 1] !== x && out[k + 1] !== out[i]);
      if (j > 0) [out[i], out[j]] = [out[j]!, out[i]!];
    }
  }
  return out;
}

export function pickWordTargets(
  save: SaveData,
  day: number,
  count: number,
  rng: Rng,
  scope?: Scope,
): string[] {
  const pool = Object.keys(save.words).filter((id) => inScope(id, day, scope));
  if (pool.length === 0) return [];
  const fresh = rng.shuffle(pool.filter((id) => isNewWord(save.words, id, day)));
  const due = dueWords(save.words, day).filter((id) => pool.includes(id) && !fresh.includes(id));
  const rate = (id: string) => {
    const ws = save.words[id]!;
    return ws.wrong / (ws.correct + ws.wrong + 1);
  };
  // least-heard words first (keeps every word's exposure count rising), then the confusing ones
  const known = rng
    .shuffle(pool.filter((id) => !fresh.includes(id) && !due.includes(id)))
    .sort((a, b) => save.words[a]!.exposures - save.words[b]!.exposures || rate(b) - rate(a));

  const nonNew = due.length + known.length;
  // the review round also gives today's still-unpractised words a first try (within the 30% cap)
  let maxNew = Math.floor(count * NEW_WORD_CAP);
  if (scope === 'due') maxNew = Math.min(2, maxNew);
  if (nonNew < count - maxNew) maxNew = count - nonNew; // early days: not enough known words yet
  const chosen = [...fresh.slice(0, maxNew)];
  // "all" (festival / after day 30): catch-up mode — least-heard words first, due or not
  const order =
    scope === 'all'
      ? [...due, ...known].sort((a, b) => save.words[a]!.exposures - save.words[b]!.exposures)
      : [...due, ...known];
  for (const id of order) {
    if (chosen.length >= count) break;
    chosen.push(id);
  }
  // still short (tiny pool): cycle through what we have
  const base = [...new Set([...chosen, ...fresh])];
  let i = 0;
  while (chosen.length < count) chosen.push(base[i++ % base.length]!);
  return spread(chosen, rng);
}

/**
 * Review station size: every due word once, plus up to two of today's still-unpractised words,
 * plus two least-heard words (8–16 questions).
 */
export function reviewCount(save: SaveData, day: number): number {
  const fresh = Object.keys(save.words).filter((id) => isNewWord(save.words, id, day)).length;
  return Math.min(16, Math.max(8, dueWords(save.words, day).length + Math.min(2, fresh) + 2));
}

/** Pictures too close to tell apart side by side (sun ☀ sunny, sleep 🛌 sleepy/tired, …). */
const LOOKALIKES: string[][] = [
  ['sun', 'sunny'],
  ['cloud', 'cloudy'],
  ['sleep', 'sleepy', 'tired'],
  ['night', 'bridge', 'sky'],
  ['flower', 'garden'],
  ['hot', 'thirsty'],
  ['eat', 'hungry'],
];
export function confusable(a: string, b: string): boolean {
  return LOOKALIKES.some((g) => g.includes(a) && g.includes(b));
}

export function pickDistractors(
  target: string,
  pool: readonly string[],
  n: number,
  rng: Rng,
  sameCategoryChance: number,
): string[] {
  const t = getWord(target);
  const others = pool.filter((id) => id !== target && getWord(id).pic !== t.pic && !confusable(id, target));
  const same = rng.shuffle(others.filter((id) => getWord(id).category === t.category));
  const diff = rng.shuffle(others.filter((id) => getWord(id).category !== t.category));
  const out: string[] = [];
  while (out.length < n && (same.length || diff.length)) {
    const useSame = same.length > 0 && (diff.length === 0 || rng.chance(sameCategoryChance));
    out.push((useSame ? same : diff).shift()!);
  }
  return out;
}

const isQA = (pid: string) => {
  const p = patterns.find((x) => x.id === pid)!;
  return !!(p.answer || p.answerFromWords || p.prompt);
};

export function pickSentences(
  save: SaveData,
  day: number,
  count: number,
  mode: number,
  rng: Rng,
  scope?: Scope,
  maxCardsL1 = 3,
): Sentence[] {
  const todayPattern = getDay(day).pattern;
  const [weekFrom] = chapterOf(day).days;
  const avail = sentences.filter((s) => {
    const pDay = patterns.find((p) => p.id === s.pattern)!.day;
    if (s.availableDay > day || pDay > day) return false;
    if (scope === 'week') return pDay >= weekFrom;
    return true;
  });
  const seen = (s: Sentence) => save.patternsSeen[s.pattern] ?? 0;
  const fits = (s: Sentence) => {
    if (mode === 1) return s.cards.length <= maxCardsL1;
    if (mode === 3) return isQA(s.pattern);
    if (mode === 4) return s.words.length > 0;
    return true;
  };
  const out: Sentence[] = [];
  const take = (s: Sentence | undefined) => {
    if (s && !out.some((x) => x.id === s.id) && !out.some((x) => x.pattern === s.pattern)) out.push(s);
  };
  if (!scope || scope === 'week') {
    take(
      rng.pick(
        avail.filter((s) => s.pattern === todayPattern).length
          ? avail.filter((s) => s.pattern === todayPattern)
          : avail,
      ),
    );
  }
  const dueDays = [1, 3, 7].map((o) => day - o);
  const dueW = new Set(dueWords(save.words, day));
  // due patterns first, then sentences that carry due words, then the least practised
  const score = (s: Sentence) =>
    (dueDays.includes(patterns.find((p) => p.id === s.pattern)!.day) ? 0 : 2) -
    s.words.filter((w) => dueW.has(w)).length;
  const byPriority = rng.shuffle(avail.filter(fits)).sort((a, b) => score(a) - score(b) || seen(a) - seen(b));
  for (const s of byPriority) {
    if (out.length >= count) break;
    take(s);
  }
  // relax the mode filter if too few fit
  for (const s of rng.shuffle(avail)) {
    if (out.length >= count) break;
    take(s);
  }
  return out.slice(0, count);
}

export function pickLetters(save: SaveData, day: number, count: number, rng: Rng): string[] {
  const cd = getDay(day);
  const [weekFrom] = chapterOf(day).days;
  let learned = lettersUpTo(day);
  if (cd.party) learned = learned.filter((l) => l.day >= weekFrom);
  const today = cd.letters.filter((l) => learned.some((x) => x.letter === l));
  const wrongRate = (l: string) => {
    const s = save.letters[l];
    return s ? s.wrong / (s.correct + s.wrong + 1) : 0;
  };
  const others = rng
    .shuffle(learned.map((l) => l.letter).filter((l) => !today.includes(l)))
    .sort((a, b) => wrongRate(b) - wrongRate(a));
  const out: string[] = [];
  // today's letters appear twice, then review letters
  for (const l of today) out.push(l);
  for (const l of others) if (out.length < count - today.length) out.push(l);
  for (const l of today) if (out.length < count) out.push(l);
  let i = 0;
  const all = learned.map((l) => l.letter);
  while (out.length < count && all.length) out.push(all[i++ % all.length]!);
  return [out[0]!, ...rng.shuffle(out.slice(1))];
}

/** Goodnight recap: the least-heard of today's words (all five on the last two days). */
export function recapWords(save: SaveData, day: number): string[] {
  const cd = getDay(day);
  return [...cd.words]
    .sort(
      (a, b) =>
        (save.words[a]?.exposures ?? 0) - (save.words[b]?.exposures ?? 0) ||
        (save.words[b]?.wrong ?? 0) - (save.words[a]?.wrong ?? 0),
    )
    .slice(0, cd.day >= 29 ? 5 : 3);
}

/** Words celebrated in the Day-30 festival chant (the two festival days' words). */
export function festivalWords(): string[] {
  return [...getDay(29).words, ...getDay(30).words];
}
