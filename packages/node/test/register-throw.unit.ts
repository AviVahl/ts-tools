import { expect } from 'chai';
import { join, dirname, sep } from 'path';
import { platform } from 'os';
import { runCommand } from './run-command';

const fixturesRoot = dirname(require.resolve('@ts-tools/fixtures/package.json'));

describe('using node -r @ts-tools/node/r [file]', () => {
    describe('with tsconfig.json', () => {
        it('throws on syntactic errors', () => {
            const filePath = join(fixturesRoot, 'errors', 'file-with-syntax-error.ts');

            const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

            expect(exitCode).to.not.equal(0);
            expect(output).to.include(`')' expected`);
        });

        it('throws on semantic errors', () => {
            const filePath = join(fixturesRoot, 'errors', 'file-with-type-error.ts');

            const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

            expect(exitCode).to.not.equal(0);
            expect(output).to.include(`Type '123' is not assignable to type 'string'`);
        });

        it('maps stack traces using source maps', () => {
            const filePath = join(fixturesRoot, 'source-maps', 'with-tsconfig', 'throwing.ts');

            const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

            expect(exitCode).to.not.equal(0);
            expect(output).to.include(`at runMe (${filePath}:11:15)`);
        });

        it('isolates two folders with different configs and throws errors', () => {
            const filePath = join(fixturesRoot, 'type-isolation', 'with-tsconfig-b', 'passes-type-check.ts');

            const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

            expect(exitCode).to.not.equal(0);
            expect(output).to.include(`Cannot find name 'describe'`);
            expect(output).to.include('should-error.ts');
        });

        it('supports baseUrl in tsconfig', () => {
            const filePath = join(fixturesRoot, 'base-url', 'second', 'imports-via-base-url.ts');

            const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

            expect(output).to.include(`Test PASSED!`);
            expect(exitCode).to.equal(0);
        });

        it('does not throw on empty files', () => {
            const filePath = join(fixturesRoot, 'default-config', 'empty-file.ts');

            const { exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

            expect(exitCode).to.equal(0);
        });
    });

    describe('no tsconfig.json', () => {
        it('maps stack traces using source maps', () => {
            const filePath = join(fixturesRoot, 'source-maps', 'throwing-without-tsconfig.ts');

            const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

            expect(exitCode).to.not.equal(0);
            expect(output).to.include(`at runMe (${filePath}:9:11)`);
        });

        it('allows using imports', () => {
            const filePath = join(fixturesRoot, 'no-tsconfig', 'imports.ts');

            const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

            expect(exitCode).to.equal(0);
            expect(output).to.include(`Current platform is: ${platform()}`);
            expect(output).to.include(`Path separator is: ${sep}`);
        });

        it('does not throw on empty files', () => {
            const filePath = join(fixturesRoot, 'no-tsconfig', 'empty-file.ts');

            const { exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

            expect(exitCode).to.equal(0);
        });
    });
});
