/**
 * Writes src/data/audio-manifest.json from every voice line in the game.
 * Existing `file` values (native recordings) are preserved, so re-running is safe.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildVoiceEntries } from '../src/core/voice-ids';

const path = join(import.meta.dirname, '..', 'src', 'data', 'audio-manifest.json');
type Entry = { lang: string; text: string; file: string | null };
const prev: Record<string, Entry> = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')).entries : {};
const entries: Record<string, Entry> = {};
for (const e of buildVoiceEntries())
  entries[e.id] = { lang: e.lang, text: e.text, file: prev[e.id]?.file ?? null };
const recorded = Object.values(entries).filter((e) => e.file).length;
writeFileSync(
  path,
  JSON.stringify(
    {
      $comment:
        'Voice lines by id. Set "file" to a path under public/ (e.g. "audio/en/word/red.m4a") to replace TTS. See docs/audio.md.',
      version: 1,
      entries,
    },
    null,
    1,
  ) + '\n',
);
console.log(`audio manifest: ${Object.keys(entries).length} lines, ${recorded} recorded`);
