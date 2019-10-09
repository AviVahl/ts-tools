import { expect } from 'chai';
import { join, sep } from 'path';
import { platform } from 'os';
import { spawnSync } from 'child_process';
import { fixturesRoot, noTsconfigFixture } from '@ts-tools/fixtures';

export function runCommand(command: string): { output: string; exitCode: number } {
    const [execName, ...args] = command.split(' ');
    const { output, status: exitCode } = spawnSync(execName, args);
    return { output: output.join('\n'), exitCode: exitCode || 0 };
}

describe('using node -r @ts-tools/node/r [file]', function() {
    this.timeout(5000);

    it('allows using imports (with default interop)', () => {
        const filePath = join(fixturesRoot, 'imports.ts');

        const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

        expect(exitCode).to.equal(0);
        expect(output).to.include(`Current platform is: ${platform()}`);
        expect(output).to.include(`Path separator is: ${sep}`);
    });

    it('maps stack traces using source maps', () => {
        const filePath = join(fixturesRoot, 'throwing.ts');

        const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

        expect(exitCode).to.not.equal(0);
        expect(output).to.include(`at runMe (${filePath}:11:15)`);
    });

    it('does not throw on empty files', () => {
        const filePath = join(fixturesRoot, 'empty.ts');

        const { exitCode, output } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

        expect(exitCode, output).to.equal(0);
    });

    it('handles tsx as react by default', () => {
        const filePath = join(noTsconfigFixture, 'react.tsx');

        const { exitCode, output } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

        expect(exitCode, output).to.equal(0);
        expect(output).to.include(`<div style="width:10px;height:20px"></div>`);
    });
});
