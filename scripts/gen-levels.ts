/** Writes src/data/levels/<game>.json from the difficulty rules in src/core/levelgen.ts. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateLevels } from '../src/core/levelgen';
import { GAME_IDS } from '../src/core/types';

const dir = join(import.meta.dirname, '..', 'src', 'data', 'levels');
mkdirSync(dir, { recursive: true });
for (const g of GAME_IDS) {
  const table = generateLevels(g);
  writeFileSync(join(dir, `${g}.json`), JSON.stringify(table, null, 2) + '\n');
  console.log(`${g}: ${table.levels.length} levels`);
}
