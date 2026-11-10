import { equal, notEqual, ok } from 'node:assert/strict';
import { spawnSync, type SpawnSyncOptionsWithBufferEncoding } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

function runCommand(
  command: string,
  options?: SpawnSyncOptionsWithBufferEncoding,
): { output: string; exitCode: number } {
  const [execName, ...args] = command.split(' ');
  const { output, status: exitCode } = options?.shell
    ? spawnSync(command, options)
    : spawnSync(execName!, args, options);
  return { output: stripVTControlCharacters(output.join('\n')), exitCode: exitCode || 0 };
}

function createTempDirectory(prefix = 'fixture-') {
  const path = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  return { path, [Symbol.dispose]: () => rmSync(path, { recursive: true, force: true }) };
}

async function initNpmPackage(directoryPath: string, moduleType?: 'commonjs' | 'module') {
  runCommand('npm init -y', { cwd: directoryPath, shell: true });
  if (moduleType) runCommand(`npm pkg set type=${moduleType}`, { cwd: directoryPath, shell: true });
}

describe('@ts-tools/node-hooks', { timeout: 5_000 }, () => {
  for (const moduleType of ['module', 'commonjs', undefined] as const) {
    const moduleTypeDescription = moduleType ? `with "type": "${moduleType}"` : 'without "type"';

    describe(`npm package ${moduleTypeDescription}`, () => {
      for (const fileExtension of ['.ts', '.tsx', '.mts', '.cts'] as const) {
        it(`<file>${fileExtension}`, () => {
          using tempDir = createTempDirectory();
          initNpmPackage(tempDir.path, moduleType);
          const filePath = join(tempDir.path, `main${fileExtension}`);
          writeFileSync(filePath, `console.log('Hello from ${fileExtension}');`);

          const { exitCode, output } = runCommand(`node --import @ts-tools/node-hooks ${filePath}`);

          equal(exitCode, 0, output);
          equal(output.trim(), `Hello from ${fileExtension}`);
        });

        it(`<empty file>${fileExtension}`, () => {
          using tempDir = createTempDirectory();
          initNpmPackage(tempDir.path, moduleType);
          const filePath = join(tempDir.path, `main${fileExtension}`);
          writeFileSync(filePath, ``);

          const { exitCode, output } = runCommand(`node --import @ts-tools/node-hooks ${filePath}`);

          equal(exitCode, 0, output);
        });

        it(`<file with types>${fileExtension}`, () => {
          using tempDir = createTempDirectory();
          initNpmPackage(tempDir.path, moduleType);
          const filePath = join(tempDir.path, `main${fileExtension}`);
          writeFileSync(filePath, `export const a: string = 'Hello';`);

          const { exitCode, output } = runCommand(`node --import @ts-tools/node-hooks ${filePath}`);

          equal(exitCode, 0, output);
        });

        it(`<file with imports>${fileExtension}`, () => {
          using tempDir = createTempDirectory();
          initNpmPackage(tempDir.path, moduleType);
          const filePath = join(tempDir.path, `main${fileExtension}`);
          const fileContents = `
import { platform } from 'node:os';
import * as osNamespace from 'node:os';
import osDefault from 'node:os';
console.log('Current platform is: ' + platform());
console.log('Current platform is: ' + osNamespace.platform());
console.log('Current platform is: ' + osDefault.platform());
`;
          writeFileSync(filePath, fileContents);

          const { exitCode, output } = runCommand(`node --import @ts-tools/node-hooks ${filePath}`);

          equal(exitCode, 0, output);
        });

        it(`<file that throws>${fileExtension}`, () => {
          using tempDir = createTempDirectory();
          initNpmPackage(tempDir.path, moduleType);
          const filePath = join(tempDir.path, `main${fileExtension}`);
          const fileContents = ` // tests source-maps locations
interface ITest {
  name: string;
  age: number;
}

function runMe() {
  if (true) {
    throw new Error("this should be line 9, col 11");
  }
}

runMe();
`;
          writeFileSync(filePath, fileContents);

          const { exitCode, output } = runCommand(
            `node --import @ts-tools/node-hooks --enable-source-maps ${filePath}`,
          );

          notEqual(exitCode, 0, output);
          ok(output.includes(`runMe (${filePath}:9:11)`), output);
        });
      }

      it(`<file with JSX>.tsx`, () => {
        using tempDir = createTempDirectory();
        initNpmPackage(tempDir.path, moduleType);
        runCommand(`npm install react react-dom`, { cwd: tempDir.path, shell: true });

        const filePath = join(tempDir.path, `main.tsx`);
        const fileContents = `
import ReactDOMServer from 'react-dom/server';
console.log(ReactDOMServer.renderToStaticMarkup(<div style={{ width: 10, height: 20 }} />));
`;
        writeFileSync(filePath, fileContents);

        const { exitCode, output } = runCommand(`node --import @ts-tools/node-hooks ${filePath}`);

        equal(exitCode, 0, output);
        equal(output.trim(), `<div style="width:10px;height:20px"></div>`, output);
      });
    });
  }
});
