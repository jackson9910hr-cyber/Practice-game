/**
 * Content validation: zod schemas for every JSON file + curriculum invariants.
 * Used by `npm run validate:data` and by tests (never bundled into the app).
 */
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import wordsJson from '../data/words.json';
import sentencesJson from '../data/sentences.json';
import friendsJson from '../data/friends.json';
import phonicsJson from '../data/phonics.json';
import curriculumJson from '../data/curriculum.json';
import chantsJson from '../data/chants.json';
import hangulJson from '../data/hangul.json';
import praiseJson from '../data/praise.json';
import voiceLinesJson from '../data/voice-lines.json';
import audioManifestJson from '../data/audio-manifest.json';
import { GAME_IDS } from '../core/types';
import { LEVEL_COUNT, generateLevels } from '../core/levelgen';
import { levelCount, levelParams } from '../core/levels';
import { buildVoiceEntries } from '../core/voice-ids';

const pic = z
  .string()
  .min(1)
  .refine((p) => !p.startsWith('draw:') || /^draw:[a-z]+:.+$/.test(p), 'bad draw spec');

const PUBLIC_DIR = join(import.meta.dirname, '..', '..', 'public');

export const WordSchema = z.object({
  id: z.string().regex(/^[a-z]+$/),
  en: z.string().min(1),
  ko: z.string().min(1),
  day: z.number().int().min(1).max(30),
  pic,
  sentence: z.string().regex(/[.!?]$/),
  category: z.string().min(1),
});
const CardSchema = z.object({ t: z.string().min(1), w: z.string().optional() });
export const PatternSchema = z.object({
  id: z.string().regex(/^p\d{2}$/),
  day: z.number().int().min(1).max(30),
  frame: z.string().includes('___').or(z.string().endsWith('?')),
  prompt: z.string().optional(),
  answer: z.string().optional(),
  distractors: z.array(z.string()).optional(),
  answerFromWords: z.array(z.string()).optional(),
  answerFrame: z.string().optional(),
});
export const SentenceSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  text: z.string().regex(/[.!?]$/),
  cards: z.array(CardSchema).min(2).max(6),
  words: z.array(z.string()),
  availableDay: z.number().int().min(1).max(30),
});
export const FriendSchema = z.object({
  id: z.string().regex(/^[a-z]+$/),
  day: z.number().int().min(1).max(30),
  name: z.string().min(2),
  base: z.enum(['circle', 'bean', 'drop', 'drop-up', 'drops', 'tri', 'cloud', 'segments']),
  colors: z.array(z.string().regex(/^#[0-9A-F]{6}$/i)).length(3),
  signature: z.string(),
  greeting: z.string(),
  greetingKo: z.string(),
  letter: z.string(),
});
export const PhonicsSchema = z.object({
  letters: z.array(
    z.object({
      letter: z.string().regex(/^[a-z]$/),
      day: z.number().int().min(1).max(30),
      sound: z.string(),
      position: z.enum(['initial', 'final']),
      keyword: z.string(),
      pictures: z.array(z.string()).min(2),
    }),
  ),
  extraPictures: z.record(z.string()),
  cvc: z.array(z.object({ word: z.string().length(3), letters: z.array(z.string()).length(3) })),
});
export const DaySchema = z.object({
  day: z.number().int(),
  chapter: z.number().int().min(1).max(4),
  friend: z.string(),
  words: z.array(z.string()).length(5),
  pattern: z.string(),
  letters: z.array(z.string()),
  unlocks: z.array(z.string().regex(/^[a-z-]+:[a-z0-9-]+$/)),
  party: z.boolean(),
  finale: z.boolean(),
});

export function validateAll(): string[] {
  const errors: string[] = [];
  const check = (name: string, schema: z.ZodTypeAny, data: unknown) => {
    const r = schema.safeParse(data);
    if (!r.success) errors.push(...r.error.issues.map((i) => `${name}: ${i.path.join('.')} ${i.message}`));
  };
  check('words', z.object({ words: z.array(WordSchema) }), wordsJson);
  check(
    'sentences',
    z.object({ patterns: z.array(PatternSchema), sentences: z.array(SentenceSchema) }),
    sentencesJson,
  );
  check('friends', z.object({ friends: z.array(FriendSchema) }), friendsJson);
  check('phonics', PhonicsSchema, phonicsJson);
  check('curriculum.days', z.array(DaySchema).length(30), curriculumJson.days);
  check(
    'praise',
    z.object({
      en: z.array(z.string()).min(8),
      ko: z.array(z.string()).min(4),
      big: z.array(z.string()),
      process: z.array(z.string()).min(2),
      together: z.string(),
    }),
    praiseJson,
  );
  check('voice-lines', z.object({ ko: z.record(z.string()), en: z.record(z.string()) }), voiceLinesJson);
  check(
    'hangul',
    z
      .object({
        wordsOpen: z.array(z.object({ word: z.string(), pic: z.string() })).min(20),
        wordsClosed: z.array(z.object({ word: z.string(), pic: z.string() })).min(20),
      })
      .passthrough(),
    hangulJson,
  );

  const words = wordsJson.words;
  const wordIds = new Set(words.map((w) => w.id));
  const extra = new Set(Object.keys(phonicsJson.extraPictures));
  const err = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };

  // --- vocabulary invariants
  err(words.length === 150, `expected 150 words, got ${words.length}`);
  err(wordIds.size === words.length, 'duplicate word ids');
  err(new Set(words.map((w) => w.pic)).size === words.length, 'two words share a picture');
  for (let d = 1; d <= 30; d++)
    err(words.filter((w) => w.day === d).length === 5, `day ${d} must have 5 words`);

  // --- patterns / sentences
  const pats = sentencesJson.patterns;
  err(pats.length === 30, 'expected 30 patterns');
  err(new Set(pats.map((p) => p.frame)).size === 30, 'duplicate pattern frames');
  for (const p of pats) {
    const inst = sentencesJson.sentences.filter((s) => s.pattern === p.id);
    err(inst.length >= 1, `${p.id} has no sentences`);
    err(
      inst.some((s) => s.availableDay <= p.day),
      `${p.id} has no sentence usable on its own day`,
    );
    for (const w of p.answerFromWords ?? []) err(wordIds.has(w), `${p.id} answer word ${w} unknown`);
  }
  for (const s of sentencesJson.sentences) {
    for (const c of s.cards) if (c.w) err(wordIds.has(c.w), `${s.id}: card word ${c.w} unknown`);
    const joined = s.cards.map((c) => c.t).join(' ');
    err(s.text.replace(/[.,!?]/g, '') === joined, `${s.id}: cards "${joined}" do not spell "${s.text}"`);
  }

  // --- friends
  const fr = friendsJson.friends;
  err(
    fr.length === 30 && new Set(fr.map((f) => f.name.toLowerCase())).size === 30,
    'need 30 uniquely named friends',
  );
  const banned = [
    'momo',
    'coco',
    'kiki',
    'nemo',
    'lala',
    'toto',
    'wally',
    'pikachu',
    'kitty',
    'pororo',
    'pinkfong',
    'ruby',
    'mimi',
    'gomo',
    'luma',
  ];
  for (const f of fr)
    err(!banned.includes(f.name.toLowerCase()), `friend name ${f.name} too close to an existing IP`);

  // --- curriculum
  const cdays = curriculumJson.days;
  for (const d of cdays) {
    err(
      fr.some((f) => f.id === d.friend && f.day === d.day),
      `day ${d.day}: friend mismatch`,
    );
    err(
      pats.some((p) => p.id === d.pattern && p.day === d.day),
      `day ${d.day}: pattern mismatch`,
    );
    for (const w of d.words)
      err(wordIds.has(w) && words.find((x) => x.id === w)!.day === d.day, `day ${d.day}: word ${w}`);
    for (const u of d.unlocks) {
      const [g, lvl] = u.split(':');
      if (g !== 'feature')
        err(
          (GAME_IDS as readonly string[]).includes(g!) && Number(lvl) >= 1,
          `day ${d.day}: bad unlock ${u}`,
        );
    }
  }
  // friend name starts with the day's letter (review/finale days excepted)
  for (const f of fr) {
    if (f.letter.length === 1 && f.letter !== 'x')
      err(f.name[0]!.toLowerCase() === f.letter, `${f.name} should start with ${f.letter}`);
  }

  // --- phonics
  const letters = phonicsJson.letters.map((l) => l.letter);
  err(new Set(letters).size === 26, 'phonics must cover 26 distinct letters');
  for (const l of phonicsJson.letters) {
    for (const p of l.pictures)
      err(wordIds.has(p) || extra.has(p), `phonics ${l.letter}: unknown picture ${p}`);
    err(
      l.pictures.includes(l.keyword),
      `phonics ${l.letter}: keyword ${l.keyword} must be one of its pictures`,
    );
    const cd = cdays.find((d) => d.day === l.day)!;
    err(cd.letters.includes(l.letter), `phonics ${l.letter}: missing from day ${l.day}`);
  }
  for (const c of phonicsJson.cvc)
    err(wordIds.has(c.word) || extra.has(c.word), `cvc ${c.word} has no picture`);

  // --- chants use learned words only
  for (const c of chantsJson.chants) {
    const chapterEnd = curriculumJson.chapters[c.chapter - 1]!.days[1];
    for (const l of c.lines)
      for (const w of l.words) {
        err(wordIds.has(w), `chant ${c.id}: unknown word ${w}`);
        err(words.find((x) => x.id === w)!.day <= (chapterEnd ?? 30), `chant ${c.id}: ${w} not learned yet`);
      }
  }

  // --- levels (≥30 per game, in sync with generator)
  for (const g of GAME_IDS) {
    err(levelCount(g) >= 30, `${g}: needs ≥30 levels`);
    err(levelCount(g) === LEVEL_COUNT, `${g}: level table out of date (run npm run gen:levels)`);
    const gen = generateLevels(g);
    err(
      JSON.stringify(gen.levels[LEVEL_COUNT - 1]!.params) === JSON.stringify(levelParams(g, LEVEL_COUNT)),
      `${g}: level JSON differs from generator`,
    );
  }

  // --- audio manifest covers every voice line
  const manifest = audioManifestJson as {
    entries: Record<string, { lang: string; text: string; file: string | null }>;
  };
  for (const e of buildVoiceEntries()) {
    const m = manifest.entries[e.id];
    err(
      !!m && m.text === e.text && m.lang === e.lang,
      `audio manifest missing/out of date: ${e.id} (run npm run gen:audio)`,
    );
    if (m?.file) err(existsSync(join(PUBLIC_DIR, m.file)), `audio file missing on disk: ${m.file}`);
  }
  return errors;
}
