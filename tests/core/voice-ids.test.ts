import { describe, expect, it } from 'vitest';
import { buildVoiceEntries, slug, vid } from '../../src/core/voice-ids';

describe('voice ids', () => {
  const entries = buildVoiceEntries();
  const byId = new Map(entries.map((e) => [e.id, e]));

  it('has unique ids with a language each', () => {
    expect(byId.size).toBe(entries.length);
    entries.forEach((e) => expect(['en-US', 'ko-KR']).toContain(e.lang));
  });

  it('covers words, sentences, greetings, numbers and Korean prompts', () => {
    expect(byId.get(vid.word('red'))?.text).toBe('red');
    expect(byId.get(vid.sentence('I like red.'))?.lang).toBe('en-US');
    expect(byId.get(vid.greet('sami'))?.text).toContain('Sami');
    expect(byId.get(vid.num(17))?.text).toBe('seventeen');
    expect(byId.get(vid.ko('together'))?.lang).toBe('ko-KR');
    expect(byId.get(vid.hangul('가'))?.text).toBe('가');
    expect(byId.get(vid.pic('ant'))?.text).toBe('ant');
    expect(vid.pic('red')).toBe('en.word.red');
  });

  it('speaks letter names so TTS does not read "a" as an article', () => {
    expect(byId.get(vid.letter('a'))?.text).toBe('ay');
    expect(byId.get(vid.letter('b'))?.text).toBe('B');
  });

  it('slugifies sentences', () => {
    expect(slug("It's in the box!")).toBe('it-s-in-the-box');
  });
});
