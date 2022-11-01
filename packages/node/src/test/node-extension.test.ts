import { describe, it } from 'node:test';
import { join, sep, dirname } from 'node:path';
import { platform } from 'node:os';
import { spawnSync } from 'node:child_process';
import { expect } from 'chai';

const fixturesRoot = dirname(require.resolve('@ts-tools/fixtures/package.json'));

export function runCommand(command: string): { output: string; exitCode: number } {
  const [execName, ...args] = command.split(' ');
  const { output, status: exitCode } = spawnSync(execName!, args);
  return { output: output.join('\n'), exitCode: exitCode || 0 };
}

describe('using node -r @ts-tools/node/r <file>', { timeout: 5_000 }, () => {
  describe('when tsconfig.json is found', () => {
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
      expect(output).to.include(`runMe (${filePath}:10:11)`);
    });

    it('maps stack traces using source maps when specifying --enable-source-maps', () => {
      const filePath = join(fixturesRoot, 'throwing.ts');

      const { output, exitCode } = runCommand(`node -r @ts-tools/node/r --enable-source-maps ${filePath}`);

      expect(exitCode).to.not.equal(0);
      expect(output).to.include(`runMe (${filePath}:10:11)`);
    });

    it('does not throw on empty files', () => {
      const filePath = join(fixturesRoot, 'empty.ts');

      const { exitCode, output } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

      expect(exitCode, output).to.equal(0);
    });

    it('handles tsx as react ("jsx" is specified)', () => {
      const filePath = join(fixturesRoot, 'react.tsx');

      const { exitCode, output } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

      expect(exitCode, output).to.equal(0);
      expect(output).to.include(`<div style="width:10px;height:20px"></div>`);
    });
  });

  describe('with the default tsconfig.json `tsc --init` generates', () => {
    it('allows using imports (interop is on by default)', () => {
      const filePath = join(fixturesRoot, 'imports.ts');

      const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

      expect(exitCode).to.equal(0);
      expect(output).to.include(`Current platform is: ${platform()}`);
      expect(output).to.include(`Path separator is: ${sep}`);
    });

    it(`fails running .tsx files ("jsx" is not set by default)`, () => {
      const registerTscInitConfig = join(fixturesRoot, 'register-init-config.js');
      const filePath = join(fixturesRoot, 'react.tsx');

      const { exitCode, output } = runCommand(`node -r ${registerTscInitConfig} ${filePath}`);

      expect(exitCode, output).to.equal(1);
      expect(output).to.include(`Unexpected token`);
    });
  });
});
