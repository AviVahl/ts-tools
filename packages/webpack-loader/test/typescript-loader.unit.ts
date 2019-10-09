import { join } from 'path';
import { expect } from 'chai';
import { fixturesRoot, noTsconfigFixture, defaultTsconfigFixture, customTsconfigFixture } from '@ts-tools/fixtures';
import { bundleWithLoader } from './bundle-with-loader';

describe('webpack loader', () => {
    it('allows bundling an empty file', async () => {
        const entry = join(fixturesRoot, 'empty.ts');
        const { stats, statsText } = await bundleWithLoader({ entry });

        expect(stats.hasErrors(), statsText).to.equal(false);
        expect(stats.hasWarnings(), statsText).to.equal(false);
    });

    describe('when tsconfig is not found', () => {
        it('allows bundling .ts files', async () => {
            const entry = join(noTsconfigFixture, 'file-with-types.ts');
            const { stats, statsText } = await bundleWithLoader({
                entry,
                options: {
                    configFileName: 'tsconfig-non-existing.json'
                }
            });

            expect(stats.hasErrors(), statsText).to.equal(false);
            expect(stats.hasWarnings(), statsText).to.equal(false);
        });

        it(`allows bundling .tsx files (assumes "jsx": "react" by default)`, async () => {
            const entry = join(noTsconfigFixture, 'react.tsx');
            const { stats, statsText } = await bundleWithLoader({
                entry,
                options: {
                    configFileName: 'tsconfig-non-existing.json'
                }
            });

            expect(stats.hasErrors(), statsText).to.equal(false);
            expect(stats.hasWarnings(), statsText).to.equal(false);
        });
    });

    describe('with default tsconfig.json', () => {
        it('allows bundling .ts files', async () => {
            const entry = join(defaultTsconfigFixture, 'file-with-types.ts');
            const { stats, statsText } = await bundleWithLoader({ entry });

            expect(stats.hasErrors(), statsText).to.equal(false);
            expect(stats.hasWarnings(), statsText).to.equal(false);
        });

        it(`fails bundling .tsx files ("jsx" field isn't "react" by default)`, async () => {
            const entry = join(defaultTsconfigFixture, 'react.tsx');
            const { stats, statsText } = await bundleWithLoader({ entry });

            expect(stats.hasErrors(), statsText).to.equal(true);
            expect(stats.hasWarnings(), statsText).to.equal(false);
        });

        it(`allows bundling .tsx files when specifying compilerOptions`, async () => {
            const entry = join(defaultTsconfigFixture, 'react.tsx');
            const { stats, statsText } = await bundleWithLoader({
                entry,
                options: {
                    compilerOptions: {
                        jsx: 'react'
                    }
                }
            });

            expect(stats.hasErrors(), statsText).to.equal(false);
            expect(stats.hasWarnings(), statsText).to.equal(false);
        });
    });

    describe('with custom tsconfig.json', () => {
        it(`allows bundling .tsx files (reads "jsx":"react" from config)`, async () => {
            const entry = join(customTsconfigFixture, 'react.tsx');
            const { stats, statsText } = await bundleWithLoader({ entry });

            expect(stats.hasErrors(), statsText).to.equal(false);
            expect(stats.hasWarnings(), statsText).to.equal(false);
        });
    });
});
