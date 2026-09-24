/**
 * Typed, indexed access to the JSON content in src/data.
 * The JSON files are the single source of truth; this module never mutates them.
 */
import wordsJson from '../data/words.json';
import sentencesJson from '../data/sentences.json';
import friendsJson from '../data/friends.json';
import phonicsJson from '../data/phonics.json';
import curriculumJson from '../data/curriculum.json';
import chantsJson from '../data/chants.json';
import hangulJson from '../data/hangul.json';
import praiseJson from '../data/praise.json';
import type {
  Chant,
  Chapter,
  CurriculumDay,
  CvcWord,
  Friend,
  HangulWord,
  Pattern,
  PhonicsLetter,
  Sentence,
  Word,
} from './types';

export const LAST_DAY = 30;

export const words: readonly Word[] = wordsJson.words;
export const patterns: readonly Pattern[] = sentencesJson.patterns;
export const sentences: readonly Sentence[] = sentencesJson.sentences;
export const friends: readonly Friend[] = friendsJson.friends;
export const phonicsLetters: readonly PhonicsLetter[] = phonicsJson.letters as PhonicsLetter[];
export const extraPictures: Readonly<Record<string, string>> = phonicsJson.extraPictures;
export const cvcWords: readonly CvcWord[] = phonicsJson.cvc;
export const chapters: readonly Chapter[] = curriculumJson.chapters as Chapter[];
export const days: readonly CurriculumDay[] = curriculumJson.days;
export const chants: readonly Chant[] = chantsJson.chants;
export const hangul = hangulJson as {
  consonants: string[];
  vowels: string[];
  easyConsonants: string[];
  easyVowels: string[];
  wordsOpen: HangulWord[];
  wordsClosed: HangulWord[];
};
export const praise = praiseJson;

const wordById = new Map(words.map((w) => [w.id, w]));
const friendById = new Map(friends.map((f) => [f.id, f]));
const patternById = new Map(patterns.map((p) => [p.id, p]));
const letterById = new Map(phonicsLetters.map((l) => [l.letter, l]));

export function getWord(id: string): Word {
  const w = wordById.get(id);
  if (!w) throw new Error(`unknown word: ${id}`);
  return w;
}

export function hasWord(id: string): boolean {
  return wordById.has(id);
}

export function getFriend(id: string): Friend {
  const f = friendById.get(id);
  if (!f) throw new Error(`unknown friend: ${id}`);
  return f;
}

export function getPattern(id: string): Pattern {
  const p = patternById.get(id);
  if (!p) throw new Error(`unknown pattern: ${id}`);
  return p;
}

export function getLetter(letter: string): PhonicsLetter {
  const l = letterById.get(letter);
  if (!l) throw new Error(`unknown letter: ${letter}`);
  return l;
}

/** Curriculum entry for a play day. Days beyond the last are clamped to the last day. */
export function getDay(day: number): CurriculumDay {
  const d = days[Math.min(Math.max(day, 1), LAST_DAY) - 1];
  if (!d) throw new Error(`no curriculum day ${day}`);
  return d;
}

export function chapterOf(day: number): Chapter {
  const n = getDay(day).chapter;
  return chapters[n - 1]!;
}

/** Picture for any word id used by the games (curriculum word or phonics-only picture word). */
export function pictureOf(id: string): string {
  const w = wordById.get(id);
  if (w) return w.pic;
  const e = extraPictures[id];
  if (e) return e;
  throw new Error(`no picture for ${id}`);
}

export function wordsOfDay(day: number): Word[] {
  return getDay(day).words.map(getWord);
}

export function wordsUpTo(day: number): Word[] {
  return words.filter((w) => w.day <= day);
}

export function lettersUpTo(day: number): PhonicsLetter[] {
  return phonicsLetters.filter((l) => l.day <= day);
}
