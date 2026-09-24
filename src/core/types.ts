export type GameId =
  | 'word-garden'
  | 'sound-butterfly'
  | 'hangul-pieces'
  | 'number-fireflies'
  | 'pattern-path'
  | 'ant-path'
  | 'sentence-train';

export const GAME_IDS: readonly GameId[] = [
  'word-garden',
  'sound-butterfly',
  'hangul-pieces',
  'number-fireflies',
  'pattern-path',
  'ant-path',
  'sentence-train',
];

export const THINKING_GAMES: readonly GameId[] = [
  'hangul-pieces',
  'number-fireflies',
  'pattern-path',
  'ant-path',
];

export type Feature = 'codex' | 'record' | 'decorate' | 'chant' | 'greeting-medley' | 'rehearsal' | 'finale';

export interface Word {
  id: string;
  en: string;
  ko: string;
  day: number;
  pic: string;
  sentence: string;
  category: string;
}

export interface Card {
  t: string;
  w?: string;
}

export interface Pattern {
  id: string;
  day: number;
  frame: string;
  prompt?: string;
  answer?: string;
  distractors?: string[];
  answerFromWords?: string[];
  answerFrame?: string;
}

export interface Sentence {
  id: string;
  pattern: string;
  text: string;
  cards: Card[];
  words: string[];
  availableDay: number;
}

export interface Friend {
  id: string;
  day: number;
  name: string;
  base: string;
  colors: string[];
  signature: string;
  greeting: string;
  greetingKo: string;
  letter: string;
}

export interface PhonicsLetter {
  letter: string;
  day: number;
  sound: string;
  position: 'initial' | 'final';
  keyword: string;
  pictures: string[];
}

export interface CvcWord {
  word: string;
  letters: string[];
}

export interface CurriculumDay {
  day: number;
  chapter: number;
  friend: string;
  words: string[];
  pattern: string;
  letters: string[];
  unlocks: string[];
  party: boolean;
  finale: boolean;
}

export interface Chapter {
  id: number;
  key: string;
  name: string;
  nameKo: string;
  days: [number, number];
  theme: string;
  chant: string;
}

export interface ChantLine {
  text: string;
  words: string[];
}

export interface Chant {
  id: string;
  chapter: number;
  title: string;
  bpm: number;
  lines: ChantLine[];
}

export interface HangulWord {
  word: string;
  pic: string;
}

export type StationKind = 'english' | 'thinking' | 'phonics' | 'sentence' | 'chant' | 'medley' | 'finale';

export interface StationPlan {
  kind: StationKind;
  /** game to run; absent for special stations (chant, medley, finale) */
  game?: GameId;
  /** unlocked mode (L1..L4) of the game */
  mode: number;
  /** review-party / rehearsal rounds use the whole week or all content */
  review?: 'week' | 'all';
}
