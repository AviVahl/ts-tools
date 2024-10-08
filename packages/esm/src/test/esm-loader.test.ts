import { describe, it } from 'node:test';
import { equal, notEqual, ok } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { platform } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

const require = createRequire(import.meta.url);
const fixturesRoot = dirname(require.resolve('@ts-tools/fixtures/package.json'));

function runCommand(command: string): { output: string; exitCode: number } {
  const [execName, ...args] = command.split(' ');
  const { output, status: exitCode } = spawnSync(execName!, args);
  return { output: stripVTControlCharacters(output.join('\n')), exitCode: exitCode || 0 };
}

describe('using node --import @ts-tools/esm <file>', { timeout: 5_000 }, () => {
  describe('when tsconfig.json is found', () => {
    it('allows using imports (with default interop)', () => {
      const filePath = join(fixturesRoot, 'esm/imports.mts');

      const { output, exitCode } = runCommand(`node --import @ts-tools/esm ${filePath}`);

      equal(exitCode, 0, output);
      ok(output.includes(`Current platform is: ${platform()}`), output);
      ok(output.includes(`Path separator is: ${sep}`), output);
    });

    it('maps stack traces using source maps when specifying --enable-source-maps', () => {
      const filePath = join(fixturesRoot, 'esm/throwing.mts');

      const { output, exitCode } = runCommand(`node --import @ts-tools/esm --enable-source-maps ${filePath}`);

      notEqual(exitCode, 0, output);
      ok(output.includes(`runMe (${filePath}:10:11)`), output);
    });

    it('does not throw on empty files', () => {
      const filePath = join(fixturesRoot, 'esm/empty.mts');

      const { exitCode, output } = runCommand(`node --import @ts-tools/esm ${filePath}`);

      equal(exitCode, 0, output);
    });
  });
});
