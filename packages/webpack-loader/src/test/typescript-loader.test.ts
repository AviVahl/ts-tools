import { describe, it } from 'node:test';
import { equal, notEqual } from 'node:assert/strict';
import { join, dirname } from 'node:path';
import type ts from 'typescript';
import { bundleWithLoader } from './bundle-with-loader';

const fixturesRoot = dirname(require.resolve('@ts-tools/fixtures/package.json'));

describe('webpack loader', { timeout: 10_000 }, () => {
  describe('when tsconfig.json is found', () => {
    it('allows bundling .ts files', async () => {
      const entry = join(fixturesRoot, 'file-with-types.ts');
      const { stats, statsText } = await bundleWithLoader({ entry });

      equal(stats.hasErrors(), false, statsText);
      equal(stats.hasWarnings(), false, statsText);
    });

    it(`allows bundling .tsx files (when specifying jsx: "react-jsx")`, async () => {
      const entry = join(fixturesRoot, 'react.tsx');
      const { stats, statsText } = await bundleWithLoader({
        entry,
        options: {
          compilerOptions: {
            jsx: 'react-jsx',
          },
        },
      });

      equal(stats.hasErrors(), false, statsText);
      equal(stats.hasWarnings(), false, statsText);
    });

    it(`allows specifying transformers`, async () => {
      let transpileCtx: ts.TransformationContext | undefined;
      const entry = join(fixturesRoot, 'empty.ts');
      const { stats, statsText } = await bundleWithLoader({
        entry,
        options: {
          cache: false,
          transformers: {
            before: [
              (ctx) => (node) => {
                transpileCtx = ctx;
                return node;
              },
            ],
          },
        },
      });

      equal(stats.hasErrors(), false, statsText);
      equal(stats.hasWarnings(), false, statsText);
      notEqual(transpileCtx?.getCompilerOptions(), undefined);
    });

    it('allows bundling an empty file', async () => {
      const entry = join(fixturesRoot, 'empty.ts');
      const { stats, statsText } = await bundleWithLoader({ entry });

      equal(stats.hasErrors(), false, statsText);
      equal(stats.hasWarnings(), false, statsText);
    });
  });

  describe('when tsconfig.json is not found', () => {
    it('allows bundling .ts files', async () => {
      const entry = join(fixturesRoot, 'file-with-types.ts');
      const { stats, statsText } = await bundleWithLoader({
        entry,
        options: {
          configFileName: 'tsconfig.non-existing.json',
        },
      });

      equal(stats.hasErrors(), false, statsText);
      equal(stats.hasWarnings(), false, statsText);
    });

    it(`allows bundling .tsx files (assumes "jsx": "react-jsx" by default)`, async () => {
      const entry = join(fixturesRoot, 'react.tsx');
      const { stats, statsText } = await bundleWithLoader({
        entry,
        options: {
          configFileName: 'tsconfig.non-existing.json',
        },
      });

      equal(stats.hasErrors(), false, statsText);
      equal(stats.hasWarnings(), false, statsText);
    });
  });

  describe('with the default tsconfig.json `tsc --init` generates', () => {
    it(`fails bundling .tsx files ("jsx" is not set by default)`, async () => {
      const entry = join(fixturesRoot, 'react.tsx');
      const { stats, statsText } = await bundleWithLoader({
        entry,
        options: { configFileName: 'tsconfig.tsc-init.json' },
      });

      equal(stats.hasErrors(), true, statsText);
      equal(stats.hasWarnings(), false, statsText);
    });
  });
});
