import pluginJs from '@eslint/js';
import configPrettier from 'eslint-config-prettier';
import pluginNoOnlyTests from 'eslint-plugin-no-only-tests';
import pluginTypescript from 'typescript-eslint';

for (const config of pluginTypescript.configs.recommendedTypeChecked) {
  config.files = ['**/*.{ts,tsx,mts,cts}']; // ensure config only targets TypeScript files
}

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['**/dist/', 'packages/fixtures'] },
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
  ...pluginTypescript.configs.recommendedTypeChecked,
  { languageOptions: { parserOptions: { projectService: true, warnOnUnsupportedTypeScriptVersion: false } } },
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
];
