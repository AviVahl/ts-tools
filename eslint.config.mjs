import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import configPrettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['**/dist/', '**/*.{js,mjs,cjs}', 'packages/fixtures/'] },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  { languageOptions: { parserOptions: { projectService: true } } },
  { rules: { 'no-console': 'error', '@typescript-eslint/unbound-method': 'off' } },
  {
    files: ['**/*.test.{ts,mts,mts}'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  configPrettier,
];
