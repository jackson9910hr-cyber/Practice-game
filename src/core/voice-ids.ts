/**
 * Every line the game can speak, keyed by a stable id. The generated audio manifest
 * (src/data/audio-manifest.json) is built from this list; a native recording can later be
 * attached to any id without touching code.
 */
import {
  chants,
  cvcWords,
  extraPictures,
  friends,
  hangul,
  patterns,
  phonicsLetters,
  praise,
  sentences,
  words,
} from './content';
import voiceLines from '../data/voice-lines.json';

export type Lang = 'en-US' | 'ko-KR';

export interface VoiceEntry {
  id: string;
  lang: Lang;
  text: string;
}

export const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

/** TTS reads a lone "a" as the article; spell letter names so they are said as names. */
const LETTER_NAME: Record<string, string> = { a: 'ay', i: 'eye', o: 'oh', u: 'you', e: 'ee', y: 'why' };

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const vid = {
  word: (id: string) => `en.word.${id}`,
  wordSentence: (id: string) => `en.wsent.${id}`,
  pic: (id: string) => (words.some((w) => w.id === id) ? `en.word.${id}` : `en.pic.${id}`),
  sentence: (text: string) => `en.t.${slug(text)}`,
  card: (token: string) => `en.card.${slug(token)}`,
  greet: (friend: string) => `en.greet.${friend}`,
  letter: (l: string) => `en.letter.${l}`,
  phoneme: (l: string) => `en.phoneme.${l}`,
  num: (n: number) => `en.num.${n}`,
  praiseEn: (i: number) => `en.praise.${i}`,
  bigPraise: (i: number) => `en.big.${i}`,
  praiseKo: (i: number) => `ko.praise.${i}`,
  ko: (key: string) => `ko.${key}`,
  en: (key: string) => `en.${key}`,
  hangul: (text: string) => `ko.h.${text}`,
};

function composeSyllable(c: string, v: string): string {
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  return String.fromCharCode(0xac00 + (CHO.indexOf(c) * 21 + JUNG.indexOf(v)) * 28);
}

export function buildVoiceEntries(): VoiceEntry[] {
  const out = new Map<string, VoiceEntry>();
  const en = (id: string, text: string) => out.set(id, { id, lang: 'en-US', text });
  const ko = (id: string, text: string) => out.set(id, { id, lang: 'ko-KR', text });

  for (const w of words) {
    en(vid.word(w.id), w.en);
    en(vid.wordSentence(w.id), w.sentence);
  }
  for (const [id] of Object.entries(extraPictures)) en(vid.pic(id), id === 'yoyo' ? 'yo-yo' : id);
  for (const s of sentences) {
    en(vid.sentence(s.text), s.text);
    for (const c of s.cards) en(vid.card(c.t), c.t);
  }
  for (const p of patterns) {
    if (p.prompt) en(vid.sentence(p.prompt), p.prompt);
    if (p.answer) en(vid.sentence(p.answer), p.answer);
    for (const d of p.distractors ?? []) en(vid.sentence(d), d);
    if (p.answerFromWords && p.answerFrame) {
      for (const w of p.answerFromWords) {
        const t = p.answerFrame.replace('{w}', w);
        en(vid.sentence(t), t);
      }
    }
  }
  for (const c of chants) for (const l of c.lines) en(vid.sentence(l.text), l.text);
  for (const f of friends) en(vid.greet(f.id), f.greeting);
  for (const l of phonicsLetters) {
    en(vid.letter(l.letter), LETTER_NAME[l.letter] ?? l.letter.toUpperCase());
    // Fallback until a native phoneme recording exists: the letter name (see docs/audio.md).
    en(vid.phoneme(l.letter), LETTER_NAME[l.letter] ?? l.letter.toUpperCase());
  }
  for (const c of cvcWords) en(vid.pic(c.word), c.word);
  for (let n = 0; n <= 20; n++) en(vid.num(n), NUMBER_WORDS[n]!);
  praise.en.forEach((t, i) => en(vid.praiseEn(i), t));
  praise.big.forEach((t, i) => en(vid.bigPraise(i), t));
  praise.ko.forEach((t, i) => ko(vid.praiseKo(i), t));
  for (const [k, t] of Object.entries(voiceLines.ko)) ko(vid.ko(k), t);
  for (const [k, t] of Object.entries(voiceLines.en)) en(vid.en(k), t);
  for (const c of hangul.consonants)
    for (const v of hangul.vowels) {
      const s = composeSyllable(c, v);
      ko(vid.hangul(s), s);
    }
  for (const w of [...hangul.wordsOpen, ...hangul.wordsClosed]) {
    ko(vid.hangul(w.word), w.word);
    for (const ch of w.word) ko(vid.hangul(ch), ch);
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}
