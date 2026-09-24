import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'public/sw.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // core must stay pure: no browser/rendering APIs
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['pixi.js', 'idb', '../engine/*', '../audio/*', '../storage/*', '../ui/*', '../scenes/*'],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'indexedDB', 'localStorage'],
    },
  },
  {
    files: ['scripts/**/*.{ts,mjs}', 'vite.config.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },
);
