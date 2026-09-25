/**
 * Writes src/data/audio-manifest.json from every voice line in the game.
 * Recordings (`file`) are preserved. A generated recording whose text changed is dropped so
 * `npm run gen:voice` makes a fresh one; a native recording is kept but reported.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildVoiceEntries } from '../src/core/voice-ids';

const path = join(import.meta.dirname, '..', 'src', 'data', 'audio-manifest.json');
type Entry = { lang: string; text: string; file: string | null; source?: string };
const prevDoc = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { entries: {} };
const prev: Record<string, Entry> = prevDoc.entries;
const entries: Record<string, Entry> = {};
const stale: string[] = [];
for (const e of buildVoiceEntries()) {
  const p = prev[e.id];
  const entry: Entry = { lang: e.lang, text: e.text, file: null };
  if (p?.file) {
    if (p.text === e.text) {
      entry.file = p.file;
      if (p.source) entry.source = p.source;
    } else if (p.source?.startsWith('generated:')) {
      stale.push(e.id); // regenerate with the new text
    } else {
      entry.file = p.file; // a human recording: keep, but someone should re-record it
      stale.push(`${e.id} (native recording — text changed, please re-record)`);
    }
  }
  entries[e.id] = entry;
}
const recorded = Object.values(entries).filter((e) => e.file).length;
writeFileSync(
  path,
  JSON.stringify(
    {
      $comment:
        'Voice lines by id. "file" is a recording under public/ (played instead of the device voice). See docs/audio.md.',
      version: 1,
      ...(prevDoc.attribution ? { attribution: prevDoc.attribution } : {}),
      entries,
    },
    null,
    1,
  ) + '\n',
);
console.log(`audio manifest: ${Object.keys(entries).length} lines, ${recorded} recorded`);
if (stale.length) console.log(`needs a new recording (run npm run gen:voice):\n  ${stale.join('\n  ')}`);
