/** 문장 기차: order word cards (1–2), answer a question (3), match sentence ↔ picture (4). */
import { getPattern, sentences } from '../../core/content';
import type { TrainParams } from '../../core/levelgen';
import type { Rng } from '../../core/rng';
import type { Sentence } from '../../core/types';

export interface TrainCard {
  id: number;
  t: string;
  w?: string;
}
export interface TrainQuestion {
  sentence: Sentence;
  /** cards in the tray (shuffled, incl. extra distractors) */
  cards: TrainCard[];
  /** number of leading cards already placed on the train */
  fixed: number;
  prompt?: string;
  answer?: { correct: string; options: string[]; colorWord?: string };
  pictureOptions?: string[];
}

function extraCards(s: Sentence, n: number, rng: Rng): TrainCard[] {
  const have = new Set(s.cards.map((c) => c.t.toLowerCase()));
  const pool = rng.shuffle(sentences.flatMap((x) => x.cards)).filter((c) => !have.has(c.t.toLowerCase()));
  const out: TrainCard[] = [];
  for (const c of pool) {
    if (out.length >= n) break;
    if (!out.some((o) => o.t === c.t)) out.push({ id: -1, ...c });
  }
  return out;
}

export function makeTrainQuestion(
  s: Sentence,
  mode: number,
  p: TrainParams,
  rng: Rng,
  learnedWords: string[],
): TrainQuestion {
  const cards: TrainCard[] = [
    ...s.cards.map((c) => ({ ...c, id: 0 })),
    ...extraCards(s, p.extraCards, rng),
  ].map((c, i) => ({ ...c, id: i }));
  const fixed = p.firstFixed ? 1 : 0;
  const tray = rng.shuffle(cards.filter((c) => c.id >= fixed));
  const pat = getPattern(s.pattern);
  const q: TrainQuestion = { sentence: s, cards: [...cards.slice(0, fixed), ...tray], fixed };
  if (pat.prompt) q.prompt = pat.prompt;
  if (mode >= 3 && pat.answer) {
    q.answer = {
      correct: pat.answer,
      options: rng.shuffle([pat.answer, ...(pat.distractors ?? []).slice(0, 1)]),
    };
  }
  if (mode >= 3 && pat.answerFromWords && pat.answerFrame) {
    const colors = pat.answerFromWords.filter((w) => learnedWords.includes(w));
    const [c, other] = rng.sample(colors.length >= 2 ? colors : pat.answerFromWords, 2);
    const frame = pat.answerFrame;
    q.answer = {
      correct: frame.replace('{w}', c!),
      options: rng.shuffle([frame.replace('{w}', c!), frame.replace('{w}', other!)]),
      colorWord: c!,
    };
  }
  if (mode >= 4 && s.words.length > 0) {
    const main = s.words[s.words.length - 1]!;
    const others = rng.shuffle(learnedWords.filter((w) => w !== main && !s.words.includes(w)));
    q.pictureOptions = rng.shuffle([main, ...others.slice(0, p.pictureChoices - 1)]);
  }
  return q;
}

/** Correct if the placed card texts spell the sentence (duplicate words are interchangeable). */
export function isCorrectOrder(s: Sentence, placed: readonly string[]): boolean {
  return placed.length === s.cards.length && s.cards.every((c, i) => c.t === placed[i]);
}

/** Card that belongs in the next empty slot. */
export function nextExpected(s: Sentence, placedCount: number): string | undefined {
  return s.cards[placedCount]?.t;
}
