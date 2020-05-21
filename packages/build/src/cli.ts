import { dirname, resolve } from 'path';
import { writeFileSync, statSync, mkdirSync } from 'fs';

import ts from 'typescript';
import chalk from 'chalk';
import program from 'commander';
import { build, IBuildFormat } from './build';

// eslint-disable-next-line
const { version } = require('../package.json');
process.on('unhandledRejection', printErrorAndExit);

program
  .version(version, '-v, --version')
  .description('Build multi-target TypeScript libraries.')
  .usage('<src folder>')
  .option('--out-dir <output folder>', 'output directory', '.')
  .option('--config-name <config file name>', 'tsconfig file name', 'tsconfig.json')
  .option('--cjs', 'compile a "cjs" folder containing commonjs module target')
  .option('--esm', 'compile an "esm" folder containing esnext module target')
  .parse(process.argv);

const { args, cjs, esm, outDir, configName } = program;

if (args.length !== 1) {
  printErrorAndExit(chalk.red(`A single src folder has to be provided`));
} else if (!cjs && !esm) {
  printErrorAndExit(chalk.red(`Must specify --cjs, --esm, or both`));
}

const [srcDirName] = args;
const srcDirectoryPath = resolve(srcDirName);
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
    configName: configName as string | undefined,
  });
  // eslint-disable-next-line no-console
  console.log(`Done transpiling. Writing ${targetFiles.length} files...`);
  for (const { name, text } of targetFiles) {
    ensureDirectorySync(dirname(name));
    writeFileSync(name, text);
  }
} catch (e) {
  printErrorAndExit(e);
}

function printErrorAndExit(message: unknown) {
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
