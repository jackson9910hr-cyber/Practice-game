/** 한글 조각: compose syllables from jamo (1), fill blanks in open-syllable words (2) and batchim words (3). */
import { hangul } from '../../core/content';
import type { HangulParams } from '../../core/levelgen';
import type { Rng } from '../../core/rng';

export const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
export const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
export const JONG = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

export type SlotKind = 'cho' | 'jung' | 'jong';
export interface Jamo {
  cho: string;
  jung: string;
  jong: string;
}

export function decompose(ch: string): Jamo {
  const o = ch.charCodeAt(0) - 0xac00;
  if (o < 0 || o > 11171) throw new Error(`not a hangul syllable: ${ch}`);
  return { cho: CHO[Math.floor(o / 588)]!, jung: JUNG[Math.floor((o % 588) / 28)]!, jong: JONG[o % 28]! };
}

export function compose(j: Jamo): string {
  const c = CHO.indexOf(j.cho);
  const v = JUNG.indexOf(j.jung);
  const t = JONG.indexOf(j.jong);
  if (c < 0 || v < 0 || t < 0) throw new Error(`bad jamo ${JSON.stringify(j)}`);
  return String.fromCharCode(0xac00 + (c * 21 + v) * 28 + t);
}

/** Vowels drawn to the right of the consonant (ㅏ) vs. below it (ㅗ) — decides block layout. */
export function isVerticalVowel(v: string): boolean {
  return 'ㅏㅐㅑㅒㅓㅔㅕㅖㅣ'.includes(v);
}

export interface Piece {
  id: number;
  jamo: string;
  kind: 'consonant' | 'vowel';
}
export interface HangulSyllable {
  text: string;
  jamo: Jamo;
  blank: boolean;
}
export interface HangulQuestion {
  word: string;
  pic: string | null;
  syllables: HangulSyllable[];
  pieces: Piece[];
}

function piecesFor(needed: string[], extra: number, pool: { c: string[]; v: string[] }, rng: Rng): Piece[] {
  const isVowel = (j: string) => JUNG.includes(j);
  const out: string[] = [...needed];
  const wantV = needed.some(isVowel);
  const cands = rng.shuffle([...pool.c, ...(wantV ? pool.v : [])]).filter((j) => !out.includes(j));
  for (const j of cands) if (out.length < needed.length + extra) out.push(j);
  return rng.shuffle(out).map((jamo, id) => ({ id, jamo, kind: isVowel(jamo) ? 'vowel' : 'consonant' }));
}

export function makeHangulRound(mode: number, p: HangulParams, rng: Rng, count = 5): HangulQuestion[] {
  const pool = { c: hangul.consonants, v: hangul.vowels };
  if (mode <= 1) {
    const easy = p.extraPieces <= 2;
    const cs = easy ? hangul.easyConsonants : hangul.consonants;
    const vs = easy ? hangul.easyVowels : hangul.vowels;
    const used = new Set<string>();
    const qs: HangulQuestion[] = [];
    while (qs.length < count) {
      const jamo = { cho: rng.pick(cs), jung: rng.pick(vs), jong: '' };
      const text = compose(jamo);
      if (used.has(text)) continue;
      used.add(text);
      qs.push({
        word: text,
        pic: null,
        syllables: [{ text, jamo, blank: true }],
        pieces: piecesFor([jamo.cho, jamo.jung], p.extraPieces, pool, rng),
      });
    }
    return qs;
  }
  const list = mode === 2 ? hangul.wordsOpen : hangul.wordsClosed;
  return rng.sample(list, count).map((w) => {
    const syl = [...w.word].map((text) => ({ text, jamo: decompose(text), blank: false }));
    const nBlank = Math.min(p.blanks, syl.length);
    // batchim words: blank the syllables with a final consonant first
    const order = rng
      .shuffle(syl.map((_, i) => i))
      .sort((a, b) => (mode === 3 ? Number(!!syl[b]!.jamo.jong) - Number(!!syl[a]!.jamo.jong) : 0));
    for (const i of order.slice(0, nBlank)) syl[i]!.blank = true;
    const needed = syl
      .filter((s) => s.blank)
      .flatMap((s) => [s.jamo.cho, s.jamo.jung, ...(s.jamo.jong ? [s.jamo.jong] : [])]);
    return { word: w.word, pic: w.pic, syllables: syl, pieces: piecesFor(needed, p.extraPieces, pool, rng) };
  });
}

/** Does this piece belong in this slot? */
export function fits(s: HangulSyllable, slot: SlotKind, jamo: string): boolean {
  return s.jamo[slot] === jamo;
}

export function slotsOf(s: HangulSyllable): SlotKind[] {
  return s.jamo.jong ? ['cho', 'jung', 'jong'] : ['cho', 'jung'];
}
