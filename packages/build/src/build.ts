import path from 'path';
import chalk from 'chalk';
import { createBaseHost, createLanguageServiceHost } from '@ts-tools/service';
import ts from 'typescript';

export interface IOutputFile {
    /**
     * Expected absolute path of file
     */
    filePath: string;

    /**
     * Generated contents of file.
     */
    contents: string;
}

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
}

export function build(options: IBuildOptions): IOutputFile[] {
    const { formats, outputDirectoryPath, srcDirectoryPath } = options;
    const tsConfigPath = path.join(srcDirectoryPath, 'tsconfig.json');

    const baseHost = createBaseHost();
    const { dirname, fileExists, directoryExists, readFile } = baseHost;

    if (!directoryExists(srcDirectoryPath)) {
        throw chalk.red(`Cannot find directory ${srcDirectoryPath}`);
    } else if (!fileExists(tsConfigPath)) {
        throw chalk.red(`Cannot find ${tsConfigPath}`);
    }

    // read and parse config
    const jsonSourceFile = ts.readJsonConfigFile(tsConfigPath, readFile);
    const configDirectoryPath = dirname(tsConfigPath);

    const {
        errors,
        fileNames,
        options: tsconfigOptions
    } = ts.parseJsonSourceFileConfigFileContent(jsonSourceFile, baseHost, configDirectoryPath);

    if (errors.length) {
        throw ts.formatDiagnosticsWithColorAndContext(errors, baseHost);
    }

    const documentRegistry = ts.createDocumentRegistry(
        baseHost.useCaseSensitiveFileNames,
        baseHost.getCurrentDirectory()
    );
    const formatCompilers: Array<{ folderName: string, languageService: ts.LanguageService }> = [];

    for (const { folderName, getCompilerOptions } of formats) {
        const compilerOptions: ts.CompilerOptions = {
            ...getCompilerOptions(tsconfigOptions),
            outDir: undefined,
            outFile: undefined,
            out: undefined,
            noEmit: false
        };
        const languageServiceHost = createLanguageServiceHost(
            baseHost,
            () => fileNames,
            () => compilerOptions
        );
        const languageService = ts.createLanguageService(
            {
                ...languageServiceHost,
                // no watch, so ensure language service doesn't sync
                getProjectVersion: () => '0'
            },
            documentRegistry
        );
        formatCompilers.push({
            folderName,
            languageService
        });
    }

    const syntacticDiagnostics: ts.Diagnostic[] = [];
    const semanticDiagnostics: ts.Diagnostic[] = [];
    const outputFiles: IOutputFile[] = [];

    for (const { folderName, languageService } of formatCompilers) {
        const formatOutDir = path.join(outputDirectoryPath, folderName);
        for (const srcFilePath of fileNames) {
            const nativeSrcFilePath = path.normalize(srcFilePath);

            arrayAssign(syntacticDiagnostics, languageService.getSyntacticDiagnostics(srcFilePath));
            arrayAssign(semanticDiagnostics, languageService.getSemanticDiagnostics(srcFilePath));

            const { emitSkipped, outputFiles: compilationOutput } = languageService.getEmitOutput(srcFilePath);
            if (!emitSkipped) {
                for (const { name: outputFilePath, text } of compilationOutput) {
                    const relativeToSrc = path.relative(srcDirectoryPath, outputFilePath);
                    const targetFilePath = path.join(formatOutDir, relativeToSrc);
                    const targetFileDirectoryPath = path.dirname(targetFilePath);
                    const relativeRequestToSrc = path.relative(
                        targetFileDirectoryPath,
                        nativeSrcFilePath
                    ).replace(/\\/g, '/');
                    const contents = outputFilePath.endsWith('.map') ?
                        remapSourceMap(text, relativeRequestToSrc) : text;
                    outputFiles.push({
                        filePath: targetFilePath,
                        contents
                    });
                }
            }
        }
        if (syntacticDiagnostics.length) {
            throw ts.formatDiagnosticsWithColorAndContext(syntacticDiagnostics, baseHost);
        } else if (semanticDiagnostics.length) {
            throw ts.formatDiagnosticsWithColorAndContext(semanticDiagnostics, baseHost);
        }
    }

    return outputFiles;
}

function arrayAssign<T>(targetArr: T[], sourceArr: T[]): void {
    for (const item of sourceArr) {
        targetArr.push(item);
    }
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
