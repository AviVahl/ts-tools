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

    /**
     * Config file name.
     * @default "tsconfig.json"
     */
    configName?: string;
}

export function build({ formats, outputDirectoryPath, srcDirectoryPath, configName }: IBuildOptions): IOutputFile[] {
    const baseHost = createBaseHost();
    const { fileExists, directoryExists, readFile, getCanonicalFileName } = baseHost;

    if (!directoryExists(srcDirectoryPath)) {
        throw chalk.red(`Cannot find directory ${srcDirectoryPath}`);
    }

    const tsConfigPath = ts.findConfigFile(srcDirectoryPath, fileExists, configName);

    if (!tsConfigPath) {
        throw chalk.red(`Cannot find a ${configName} file for ${srcDirectoryPath}`);
    }

    // read and parse config
    const jsonSourceFile = ts.readJsonConfigFile(tsConfigPath, readFile);

    const { errors, fileNames, options: tsconfigOptions } = ts.parseJsonSourceFileConfigFileContent(
        jsonSourceFile,
        baseHost,
        path.dirname(tsConfigPath)
    );

    const canonicalSrcPath = getCanonicalFileName(srcDirectoryPath);
    const filesInSrcDirectory = fileNames
        .map(filePath => ({ filePath, normalizedPath: path.normalize(filePath) }))
        .filter(({ normalizedPath }) => getCanonicalFileName(normalizedPath).startsWith(canonicalSrcPath));

    if (errors.length) {
        throw ts.formatDiagnosticsWithColorAndContext(errors, baseHost);
    }

    const documentRegistry = ts.createDocumentRegistry(
        baseHost.useCaseSensitiveFileNames,
        baseHost.getCurrentDirectory()
    );
    const formatCompilers: Array<{ folderName: string; languageService: ts.LanguageService }> = [];

    for (const { folderName, getCompilerOptions } of formats) {
        const compilerOptions: ts.CompilerOptions = {
            ...getCompilerOptions(tsconfigOptions),
            outDir: undefined,
            outFile: undefined,
            out: undefined,
            noEmit: false
        };
        const languageServiceHost = createLanguageServiceHost(baseHost, () => fileNames, () => compilerOptions);
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
        for (const { filePath, normalizedPath } of filesInSrcDirectory) {
            arrayAssign(syntacticDiagnostics, languageService.getSyntacticDiagnostics(filePath));
            arrayAssign(semanticDiagnostics, languageService.getSemanticDiagnostics(filePath));

            const { emitSkipped, outputFiles: compilationOutput } = languageService.getEmitOutput(filePath);
            if (!emitSkipped) {
                for (const { name: outputFilePath, text } of compilationOutput) {
                    const relativeToSrc = path.relative(srcDirectoryPath, outputFilePath);
                    const targetFilePath = path.join(formatOutDir, relativeToSrc);
                    const targetFileDirectoryPath = path.dirname(targetFilePath);
                    const relativeRequestToSrc = path
                        .relative(targetFileDirectoryPath, normalizedPath)
                        .replace(/\\/g, '/');
                    const contents = outputFilePath.endsWith('.map')
                        ? remapSourceMap(text, relativeRequestToSrc)
                        : text;
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
