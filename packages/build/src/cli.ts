import { dirname, resolve } from 'path';
import { writeFileSync, statSync, mkdirSync } from 'fs';

import ts from 'typescript';
import chalk from 'chalk';
import yargs from 'yargs';
import { build, IBuildFormat } from './build';

// eslint-disable-next-line
const { version } = require('../package.json') as { version: string };
process.on('unhandledRejection', printErrorAndMarkFailed);

const { argv } = yargs
  .usage(`Usage: $0 <src folder> [options]`)
  .version(version)
  .option('out-dir', { default: '.', description: 'output directory' })
  .option('config-name', { default: 'tsconfig.json', description: 'tsconfig file name' })
  .option('cjs', { type: 'boolean', description: 'compile a "cjs" folder containing commonjs module target' })
  .option('esm', { type: 'boolean', description: 'compile an "esm" folder containing esnext module target' })
  .alias('h', 'help')
  .alias('v', 'version')
  .help()
  .strict();

const { _, 'config-name': configName, 'out-dir': outDir, cjs, esm } = argv;

if (_.length !== 1) {
  printErrorAndMarkFailed(chalk.red(`A single <src folder> has to be provided.`));
} else if (!cjs && !esm) {
  printErrorAndMarkFailed(chalk.red(`Must specify --cjs, --esm, or both`));
} else {
  const [srcDirName] = _ as [string | number];
  const srcDirectoryPath = resolve(`${srcDirName}`);
  const outputDirectoryPath = resolve(outDir);

  const formats: IBuildFormat[] = [];
  if (cjs) {
    formats.push({
      folderName: 'cjs',
      getCompilerOptions(tsconfigOptions) {
        return {
          ...tsconfigOptions,
          module: ts.ModuleKind.CommonJS,
        };
      },
    });
  }
  if (esm) {
    formats.push({
      folderName: 'esm',
      getCompilerOptions(tsconfigOptions) {
        return {
          ...tsconfigOptions,
          module: ts.ModuleKind.ESNext,
        };
      },
    });
  }

  try {
    const targetFiles = build({
      srcDirectoryPath,
      outputDirectoryPath,
      formats,
      configName,
    });
    // eslint-disable-next-line no-console
    console.log(`Done transpiling. Writing ${targetFiles.length} files...`);
    for (const { name: filePath, text } of targetFiles) {
      ensureDirectorySync(dirname(filePath));
      writeFileSync(filePath, text);
    }
  } catch (e) {
    printErrorAndMarkFailed(e);
  }
}

function printErrorAndMarkFailed(message: unknown) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exitCode = 1;
}

function ensureDirectorySync(directoryPath: string): void {
  try {
    if (statSync(directoryPath).isDirectory()) {
      return;
    }
  } catch {
    /**/
  }
  try {
    mkdirSync(directoryPath);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') {
      const parentPath = dirname(directoryPath);
      if (parentPath === directoryPath) {
        throw e;
      }
      ensureDirectorySync(parentPath);
      mkdirSync(directoryPath);
    }
  }
}
