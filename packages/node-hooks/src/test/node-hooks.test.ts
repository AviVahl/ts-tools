import { equal, notEqual, ok } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

describe('@ts-tools/node-hooks', { timeout: 5_000 }, () => {
  const spawnOptions = { encoding: 'utf-8' } as const;

  function createTempDirectory(prefix = 'fixture-') {
    const path = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
    return { path, [Symbol.dispose]: () => rmSync(path, { recursive: true, force: true }) };
  }

  async function initNpmPackage(directoryPath: string, moduleType?: 'commonjs' | 'module') {
    const packageJson = { name: 'test-package', version: '1.0.0', type: moduleType };
    writeFileSync(join(directoryPath, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
  }

  for (const moduleType of ['module', 'commonjs', undefined] as const) {
    const moduleTypeDescription = moduleType ? `with "type": "${moduleType}"` : 'without explicit "type"';

    describe(`npm package ${moduleTypeDescription} in package.json`, () => {
      for (const fileExtension of ['.ts', '.tsx', '.mts', '.cts'] as const) {
        it(`executes basic ${fileExtension} files`, () => {
          using tempDir = createTempDirectory();
          initNpmPackage(tempDir.path, moduleType);
          const filePath = join(tempDir.path, `main${fileExtension}`);
          writeFileSync(filePath, `console.log('Hello from ${fileExtension}');`);

          const { status, output } = spawnSync('node', ['--import', '@ts-tools/node-hooks', filePath], spawnOptions);
          const outputText = stripVTControlCharacters(output.join('\n'));

          equal(status, 0, outputText);
          equal(outputText.trim(), `Hello from ${fileExtension}`);
        });

        it(`handles empty ${fileExtension} files`, () => {
          using tempDir = createTempDirectory();
          initNpmPackage(tempDir.path, moduleType);
          const filePath = join(tempDir.path, `main${fileExtension}`);
          writeFileSync(filePath, ``);

          const { status, output } = spawnSync('node', ['--import', '@ts-tools/node-hooks', filePath], spawnOptions);
          const outputText = stripVTControlCharacters(output.join('\n'));

          equal(status, 0, outputText);
        });

        it(`transpiles ${fileExtension} files with types`, () => {
          using tempDir = createTempDirectory();
          initNpmPackage(tempDir.path, moduleType);
          const filePath = join(tempDir.path, `main${fileExtension}`);
          writeFileSync(filePath, `export const a: string = 'Hello';`);

          const { status, output } = spawnSync('node', ['--import', '@ts-tools/node-hooks', filePath], spawnOptions);
          const outputText = stripVTControlCharacters(output.join('\n'));

          equal(status, 0, outputText);
        });

        it(`handles ${fileExtension} files with imports`, () => {
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

          const { status, output } = spawnSync('node', ['--import', '@ts-tools/node-hooks', filePath], spawnOptions);
          const outputText = stripVTControlCharacters(output.join('\n'));

          equal(status, 0, outputText);
        });

        it(`maps source-maps for ${fileExtension} files that throw errors`, () => {
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

          const { status, output } = spawnSync(
            'node',
            ['--import', '@ts-tools/node-hooks', '--enable-source-maps', filePath],
            spawnOptions,
          );
          const outputText = stripVTControlCharacters(output.join('\n'));

          notEqual(status, 0, outputText);
          ok(outputText.includes(`runMe (${filePath}:9:11)`), outputText);
        });
      }

      it(`executes .tsx files with jsx syntax`, () => {
        using tempDir = createTempDirectory();
        initNpmPackage(tempDir.path, moduleType);
        spawnSync('npm install react react-dom', { cwd: tempDir.path, shell: true });

        const filePath = join(tempDir.path, `main.tsx`);
        const fileContents = `
import ReactDOMServer from 'react-dom/server';
console.log(ReactDOMServer.renderToStaticMarkup(<div style={{ width: 10, height: 20 }} />));
`;
        writeFileSync(filePath, fileContents);

        const { status, output } = spawnSync('node', ['--import', '@ts-tools/node-hooks', filePath], spawnOptions);
        const outputText = stripVTControlCharacters(output.join('\n'));

        equal(status, 0, outputText);
        equal(outputText.trim(), `<div style="width:10px;height:20px"></div>`, outputText);
      });
    });
  }
});
