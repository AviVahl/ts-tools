import { dirname, normalize, join, relative } from 'path';
import chalk from 'chalk';
import ts from 'typescript';
import { getCanonicalPath, getNewLine, readAndParseConfigFile } from '@ts-tools/transpile';

const { directoryExists, fileExists, getCurrentDirectory } = ts.sys;

export interface IBuildFormat {
    /**
     * Name of directory to create for the format.
     */
    folderName: string;

    /**
     * Callback that returns the compiler options to be used when transpiling.
     *
     * @param tsconfigOptions existing options found in tsconfig
     */
    getCompilerOptions(tsconfigOptions: Readonly<ts.CompilerOptions>): ts.CompilerOptions;
}

export interface IBuildOptions {
    /**
     * Absolute path to src directory, which should contain a `tsconfig.json` file.
     */
    srcDirectoryPath: string;

    /**
     * Absolute path to output directory, where formats folders are created.
     */
    outputDirectoryPath: string;

    /**
     * Formats to build.
     */
    formats: IBuildFormat[];

    /**
     * Config file name.
     * @default "tsconfig.json"
     */
    configName?: string;
}

export function build({ formats, outputDirectoryPath, srcDirectoryPath, configName }: IBuildOptions): ts.OutputFile[] {
    if (!directoryExists(srcDirectoryPath)) {
        throw chalk.red(`Cannot find directory ${srcDirectoryPath}`);
    }

    const tsConfigPath = ts.findConfigFile(srcDirectoryPath, fileExists, configName);

    if (!tsConfigPath) {
        throw chalk.red(`Cannot find a ${configName} file for ${srcDirectoryPath}`);
    }

    const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
        getCurrentDirectory,
        getCanonicalFileName: getCanonicalPath,
        getNewLine: getNewLine
    };
    
    const { errors, fileNames, options: tsconfigOptions } = readAndParseConfigFile(tsConfigPath);

    if (errors.length) {
        throw ts.formatDiagnosticsWithColorAndContext(errors, formatDiagnosticsHost);
    }

    const canonicalSrcPath = getCanonicalPath(srcDirectoryPath);
    const filesInSrcDirectory = fileNames
        .map(filePath => ({ filePath, normalizedPath: normalize(filePath) }))
        .filter(({ normalizedPath }) => getCanonicalPath(normalizedPath).startsWith(canonicalSrcPath));

    const programs: Array<{ folderName: string; program: ts.Program }> = [];

    for (const { folderName, getCompilerOptions } of formats) {
        const compilerOptions: ts.CompilerOptions = {
            ...getCompilerOptions(tsconfigOptions),
            outDir: undefined,
            outFile: undefined,
            out: undefined,
            noEmit: false
        };

        programs.push({
            folderName,
            program: ts.createProgram({
                rootNames: fileNames,
                options: compilerOptions
            })
        });
    }

    const outputFiles: ts.OutputFile[] = [];

    for (const { folderName, program } of programs) {
        const optionsDiagnostics = program.getOptionsDiagnostics();
        if (optionsDiagnostics.length) {
            throw ts.formatDiagnosticsWithColorAndContext(optionsDiagnostics, formatDiagnosticsHost);
        }
        const globalDiagnostics = program.getGlobalDiagnostics();
        if (globalDiagnostics.length) {
            throw ts.formatDiagnosticsWithColorAndContext(globalDiagnostics, formatDiagnosticsHost);
        }
        const syntacticDiagnostics = program.getSyntacticDiagnostics();
        if (syntacticDiagnostics.length) {
            throw ts.formatDiagnosticsWithColorAndContext(syntacticDiagnostics, formatDiagnosticsHost);
        }
        const semanticDiagnostics = program.getSemanticDiagnostics();
        if (semanticDiagnostics.length) {
            throw ts.formatDiagnosticsWithColorAndContext(semanticDiagnostics, formatDiagnosticsHost);
        }

        const formatOutDir = join(outputDirectoryPath, folderName);
        for (const { filePath, normalizedPath } of filesInSrcDirectory) {
            const { emitSkipped, outputFiles: compilationOutput } = getFileEmitOutput(program, filePath);
            if (!emitSkipped) {
                for (const { name: outputFilePath, text, writeByteOrderMark } of compilationOutput) {
                    const relativeToSrc = relative(srcDirectoryPath, outputFilePath);
                    const targetFilePath = join(formatOutDir, relativeToSrc);
                    const targetFileDirectoryPath = dirname(targetFilePath);
                    const relativeRequestToSrc = relative(targetFileDirectoryPath, normalizedPath).replace(/\\/g, '/');
                    const contents = outputFilePath.endsWith('.map')
                        ? remapSourceMap(text, relativeRequestToSrc)
                        : text;
                    outputFiles.push({
                        name: targetFilePath,
                        text: contents,
                        writeByteOrderMark
                    });
                }
            }
        }
    }

    return outputFiles;
}

function remapSourceMap(originalSourceMap: string, mappedSrcRequest: string): string {
    try {
        const sourceMap = JSON.parse(originalSourceMap);
        if (Array.isArray(sourceMap.sources) && sourceMap.sources.length === 1) {
            sourceMap.sources[0] = mappedSrcRequest;
        }
        return JSON.stringify(sourceMap);
    } catch {
        return originalSourceMap;
    }
}

function getFileEmitOutput(program: ts.Program, filePath: string): ts.EmitOutput {
    const outputFiles: ts.OutputFile[] = [];
    const sourcefile = program.getSourceFile(filePath);
    const emitResult = program.emit(sourcefile, (name, text, writeByteOrderMark) =>
        outputFiles.push({ name, text, writeByteOrderMark })
    );

    return { outputFiles: outputFiles, emitSkipped: emitResult.emitSkipped };
}
