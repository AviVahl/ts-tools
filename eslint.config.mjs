// @ts-check

import pluginJs from '@eslint/js';
import configPrettier from 'eslint-config-prettier';
import pluginNoOnlyTests from 'eslint-plugin-no-only-tests';
import { defineConfig, globalIgnores } from 'eslint/config';
import pluginTypescript from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/dist/', 'packages/fixtures']),
  pluginJs.configs.recommended,
  { plugins: { 'no-only-tests': pluginNoOnlyTests } },
  {
    rules: {
      'no-console': 'error',
      'no-only-tests/no-only-tests': 'error',
      'no-undef': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  ...pluginTypescript.configs.recommendedTypeChecked.map((config) => ({ ...config, files: ['**/*.{ts,tsx,mts,cts}'] })),
  { languageOptions: { parserOptions: { projectService: true } } },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx,mts,cts}'],
    rules: {
      // native node test runner types for describe() and it() return a promise, so disable this rule in tests
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  configPrettier,
]);
