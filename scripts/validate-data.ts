import { validateAll } from '../src/schema/validate';

const errors = validateAll();
if (errors.length) {
  console.error(`✗ ${errors.length} data problem(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('✓ all content data valid (150 words, 30 patterns, 26 letters, 30 friends, 7×32 levels)');
