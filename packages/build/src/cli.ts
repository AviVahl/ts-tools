// tslint:disable:no-console no-var-requires
import ts from 'typescript';
import path from 'path';
import { writeFileSync, ensureDirectorySync } from 'proper-fs';
import chalk from 'chalk';
import program from 'commander';
import { build, IBuildFormat } from './build';

const { version } = require('../package.json');
process.on('unhandledRejection', printErrorAndExit);

program
    .version(version, '-v, --version')
    .description('Build multi-target TypeScript libraries.')
    .usage('<src folder>')
    .option('--out-dir <output folder>', 'output directory', '.')
    .option('--cjs', 'compile a "cjs" folder containing commonjs module target')
    .option('--esm', 'compile an "esm" folder containing esnext module target')
    .parse(process.argv);

const { args, cjs, esm, outDir } = program;

if (args.length !== 1) {
    printErrorAndExit(chalk.red(`A single src folder has to be provided`));
} else if (!cjs && !esm) {
    printErrorAndExit(chalk.red(`Must specify --cjs, --esm, or both`));
}

const [srcDirName] = args;
const srcDirectoryPath = path.resolve(srcDirName);
const outputDirectoryPath = path.resolve(outDir);

const formats: IBuildFormat[] = [];
if (cjs) {
    formats.push({
        folderName: 'cjs',
        getCompilerOptions(tsconfigOptions) {
            return {
                ...tsconfigOptions,
                module: ts.ModuleKind.CommonJS
            };
        }
    });
}
if (esm) {
    formats.push({
        folderName: 'esm',
        getCompilerOptions(tsconfigOptions) {
            return {
                ...tsconfigOptions,
                module: ts.ModuleKind.ESNext
            };
        }
    });
}

try {
    const targetFiles = build({ srcDirectoryPath, outputDirectoryPath, formats });
    console.log(`Done transpiling. Writing ${targetFiles.length} files...`);
    for (const { filePath, contents: content } of targetFiles) {
        ensureDirectorySync(path.dirname(filePath));
        writeFileSync(filePath, content);
    }
} catch (e) {
    printErrorAndExit(e);
}

function printErrorAndExit(message: unknown) {
    console.error(message);
    process.exit(1);
}
