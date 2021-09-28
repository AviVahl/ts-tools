import { expect } from 'chai';
import { dirname, join, sep } from 'path';
import { platform } from 'os';
import { spawnSync } from 'child_process';
import Module from 'module';

const require = Module.createRequire(import.meta.url);
const fixturesRoot = dirname(require.resolve('@ts-tools/fixtures/package.json'));
const nodeMajorVersion = parseInt(process.versions.node.split('.')[0]!, 10);

export function runCommand(command: string): { output: string; exitCode: number } {
  const [execName, ...args] = command.split(' ');
  const { output, status: exitCode } = spawnSync(execName!, args);
  return { output: output.join('\n'), exitCode: exitCode || 0 };
}

describe('using node --experimental-loader @ts-tools/esm <file>', function () {
  this.timeout(5000);

  describe('when tsconfig.json is found', () => {
    it('allows using imports (with default interop)', () => {
      const filePath = join(fixturesRoot, 'imports.ts');

      const { output, exitCode } = runCommand(`node --experimental-loader @ts-tools/esm ${filePath}`);

      expect(exitCode).to.equal(0);
      expect(output).to.include(`Current platform is: ${platform()}`);
      expect(output).to.include(`Path separator is: ${sep}`);
    });

    if (nodeMajorVersion >= 14) {
      it('maps stack traces using source maps when specifying --enable-source-maps', () => {
        const filePath = join(fixturesRoot, 'throwing.ts');

        const { output, exitCode } = runCommand(
          `node --experimental-loader @ts-tools/esm --enable-source-maps ${filePath}`
        );

        expect(exitCode).to.not.equal(0);
        expect(output).to.include(`runMe (${filePath}:10:11)`);
      });
    }

    it('does not throw on empty files', () => {
      const filePath = join(fixturesRoot, 'empty.ts');

      const { exitCode, output } = runCommand(`node --experimental-loader @ts-tools/esm ${filePath}`);

      expect(exitCode, output).to.equal(0);
    });
  });
});