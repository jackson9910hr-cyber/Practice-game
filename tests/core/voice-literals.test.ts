import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../../src/data/audio-manifest.json';

const SRC = join(import.meta.dirname, '../../src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.ts$/.test(f) ? [p] : [];
  });
}

describe('voice ids used in code', () => {
  const ids = new Set(Object.keys((manifest as { entries: Record<string, unknown> }).entries));
  const used = new Map<string, string>();
  for (const f of files(SRC)) {
    const code = readFileSync(f, 'utf8');
    for (const m of code.matchAll(/vid\.(ko|en)\('([^']+)'\)/g)) used.set(`${m[1]}.${m[2]}`, f);
    for (const m of code.matchAll(/'((?:ko|en)\.[a-zA-Z]+\.[a-zA-Z0-9.-]+)'/g)) used.set(m[1]!, f);
    // template ids with a small known range
    for (const m of code.matchAll(/vid\.(ko|en)\(`([a-zA-Z]+)\.\$\{/g)) used.set(`${m[1]}.${m[2]}.*`, f);
  }

  it('finds the literals it scans for', () => {
    expect(used.size).toBeGreaterThan(40);
  });

  it('every literal id exists in the audio manifest', () => {
    const missing = [...used]
      .filter(([id]) =>
        id.endsWith('.*') ? ![...ids].some((x) => x.startsWith(id.slice(0, -1))) : !ids.has(id),
      )
      .map(([id, f]) => `${id} (${f.replace(SRC, 'src')})`);
    expect(missing).toEqual([]);
  });
});
