import { describe, it } from 'node:test';
import { equal, notEqual, ok } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { platform } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

const require = createRequire(import.meta.url);
const fixturesRoot = dirname(require.resolve('@ts-tools/fixtures/package.json'));

export function runCommand(command: string): { output: string; exitCode: number } {
  const [execName, ...args] = command.split(' ');
  const { output, status: exitCode } = spawnSync(execName!, args);
  return { output: stripVTControlCharacters(output.join('\n')), exitCode: exitCode || 0 };
}

describe('using node -r @ts-tools/node/r <file>', { timeout: 5_000 }, () => {
  describe('when tsconfig.json is found', () => {
    it('allows using imports (with default interop)', () => {
      const filePath = join(fixturesRoot, 'imports.ts');

      const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

      equal(exitCode, 0, output);
      ok(output.includes(`Current platform is: ${platform()}`), output);
      ok(output.includes(`Path separator is: ${sep}`), output);
    });

    it('maps stack traces using source maps', () => {
      const filePath = join(fixturesRoot, 'throwing.ts');

      const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

      notEqual(exitCode, 0, output);
      ok(output.includes(`runMe (${filePath}:10:11)`), output);
    });

    it('maps stack traces using source maps when specifying --enable-source-maps', () => {
      const filePath = join(fixturesRoot, 'throwing.ts');

      const { output, exitCode } = runCommand(`node -r @ts-tools/node/r --enable-source-maps ${filePath}`);

      notEqual(exitCode, 0, output);
      ok(output.includes(`runMe (${filePath}:10:11)`), output);
    });

    it('does not throw on empty files', () => {
      const filePath = join(fixturesRoot, 'empty.ts');

      const { exitCode, output } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

      equal(exitCode, 0, output);
    });

    it('handles tsx as react ("jsx" is specified)', () => {
      const filePath = join(fixturesRoot, 'react.tsx');

      const { exitCode, output } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

      equal(exitCode, 0, output);
      ok(output.includes(`<div style="width:10px;height:20px"></div>`), output);
    });
  });

  describe('with the default tsconfig.json `tsc --init` generates', () => {
    it('allows using imports (interop is on by default)', () => {
      const filePath = join(fixturesRoot, 'imports.ts');

      const { output, exitCode } = runCommand(`node -r @ts-tools/node/r ${filePath}`);

      equal(exitCode, 0, output);
      ok(output.includes(`Current platform is: ${platform()}`), output);
      ok(output.includes(`Path separator is: ${sep}`), output);
    });

    it(`fails running .tsx files ("jsx" is not set by default)`, () => {
      const registerTscInitConfig = join(fixturesRoot, 'register-init-config.js');
      const filePath = join(fixturesRoot, 'react.tsx');

      const { exitCode, output } = runCommand(`node -r ${registerTscInitConfig} ${filePath}`);

      equal(exitCode, 1, output);
      ok(output.includes(`Unexpected token`), output);
    });
  });
});
