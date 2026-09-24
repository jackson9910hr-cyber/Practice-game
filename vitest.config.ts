import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'src/core/**/*.ts',
        'src/games/**/logic.ts',
        'src/storage/migrations.ts',
        'src/storage/backup.ts',
      ],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
      reporter: ['text-summary', 'text'],
    },
  },
});
