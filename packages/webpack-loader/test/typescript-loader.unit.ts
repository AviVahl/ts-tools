import { join } from 'path';
import ts from 'typescript';
import { expect } from 'chai';
import { fixturesRoot } from '@ts-tools/fixtures';
import { bundleWithLoader } from './bundle-with-loader';

describe('webpack loader', () => {
  describe('when tsconfig.json is found', () => {
    it('allows bundling an empty file', async () => {
      const entry = join(fixturesRoot, 'empty.ts');
      const { stats, statsText } = await bundleWithLoader({ entry });

      expect(stats.hasErrors(), statsText).to.equal(false);
      expect(stats.hasWarnings(), statsText).to.equal(false);
    });

    it('allows bundling .ts files', async () => {
      const entry = join(fixturesRoot, 'file-with-types.ts');
      const { stats, statsText } = await bundleWithLoader({ entry });

      expect(stats.hasErrors(), statsText).to.equal(false);
      expect(stats.hasWarnings(), statsText).to.equal(false);
    });

    it(`allows bundling .tsx files (when specifying jsx: "react")`, async () => {
      const entry = join(fixturesRoot, 'react.tsx');
      const { stats, statsText } = await bundleWithLoader({
        entry,
        options: {
          compilerOptions: {
            jsx: 'react',
          },
        },
      });

      expect(stats.hasErrors(), statsText).to.equal(false);
      expect(stats.hasWarnings(), statsText).to.equal(false);
    });

    it(`allows specifying transformers`, async () => {
      let transpileCtx: ts.TransformationContext | undefined;
      const entry = join(fixturesRoot, 'transformed.ts');
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

      expect(stats.hasErrors(), statsText).to.equal(false);
      expect(stats.hasWarnings(), statsText).to.equal(false);
      expect(transpileCtx?.getCompilerOptions()).to.not.equal(undefined);
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

      expect(stats.hasErrors(), statsText).to.equal(false);
      expect(stats.hasWarnings(), statsText).to.equal(false);
    });

    it(`allows bundling .tsx files (assumes "jsx": "react" by default)`, async () => {
      const entry = join(fixturesRoot, 'react.tsx');
      const { stats, statsText } = await bundleWithLoader({
        entry,
        options: {
          configFileName: 'tsconfig.non-existing.json',
        },
      });

      expect(stats.hasErrors(), statsText).to.equal(false);
      expect(stats.hasWarnings(), statsText).to.equal(false);
    });
  });

  describe('with the default tsconfig.json `tsc --init` generates', () => {
    it(`fails bundling .tsx files ("jsx" is not set by default)`, async () => {
      const entry = join(fixturesRoot, 'react.tsx');
      const { stats, statsText } = await bundleWithLoader({
        entry,
        options: { configFileName: 'tsconfig.tsc-init.json' },
      });

      expect(stats.hasErrors(), statsText).to.equal(true);
      expect(stats.hasWarnings(), statsText).to.equal(false);
    });
  });
});
