import { statSync, readFileSync } from 'fs';
import { join } from 'path';

import ts from 'typescript';
import sourceMapSupport from 'source-map-support';
import {
    transpileCached,
    readCacheFileSync,
    findCacheDirectory,
    compilerOptionsToCacheName,
    ensureDirectorySync,
    filePathToCacheFileName,
    extractInlineSourceMap
} from '@ts-tools/transpile';

export const defaultCompilerOptions: ts.CompilerOptions = {
    // Node 8+.
    target: ts.ScriptTarget.ES2017,

    // Node has a CommonJS module system.
    module: ts.ModuleKind.CommonJS,

    // Pure commonjs libraries should be importable as default.
    // e.g `import express from 'express';`
    esModuleInterop: true,

    // Transpile jsx to React calls (opinionated).
    jsx: ts.JsxEmit.React,

    // Gets picked up by v8 inspector (vscode/chrome debuggers).
    inlineSourceMap: true
};

export interface ICreateNodeExtensionOptions {
    /**
     * Compiler options to use when transpiling.
     *
     * @default `defaultCompilerOptions` (also exported from package)
     */
    compilerOptions?: ts.CompilerOptions;

    /**
     * Absolute path of an existing directory to use for persistent cache.
     *
     * @default uses `find-cache-dir` to search for caching path.
     */
    cacheDirectoryPath?: string;

    /**
     * Installs `source-map-support` connected to the cache.
     */
    installSourceMapSupport?: boolean;
}

/**
 * Creates a cachine TypeScript node extension.
 */
export const createNodeExtension = (options: ICreateNodeExtensionOptions = {}): NodeExtension => {
    const {
        compilerOptions = defaultCompilerOptions,
        cacheDirectoryPath = findCacheDirectory(process.cwd()),
        installSourceMapSupport = true
    } = options;

    if (typeof cacheDirectoryPath !== 'string') {
        // couldn't find a cache directory, so fall back to a non-cachine implementation
        return createTransformerExtension(
            filePath =>
                ts.transpileModule(readFileSync(filePath, 'utf8'), { fileName: filePath, compilerOptions }).outputText
        );
    }

    const optionsScopedCachePath = join(cacheDirectoryPath, compilerOptionsToCacheName(compilerOptions));
    try {
        ensureDirectorySync(optionsScopedCachePath);
    } catch {
        /**/
    }

    if (installSourceMapSupport) {
        sourceMapSupport.install({
            environment: 'node',
            retrieveSourceMap(filePath) {
                const cacheFilePath = join(optionsScopedCachePath, filePathToCacheFileName(filePath));
                const cachedOutput = readCacheFileSync(cacheFilePath);
                if (cachedOutput && cachedOutput.mtime === statSync(filePath).mtime.getTime()) {
                    const { sourceMapText, outputText } = cachedOutput;
                    const map = sourceMapText || extractInlineSourceMap(outputText);
                    if (map) {
                        return { map, url: filePath };
                    }
                }
                return null;
            }
        });
    }

    return createTransformerExtension(
        filePath =>
            transpileCached({
                cacheDirectoryPath: optionsScopedCachePath,
                fileName: filePath,
                compilerOptions
            }).outputText
    );
};

interface ICompilerModule extends NodeModule {
    _compile(code: string, filePath: string): void;
}

export type NodeExtension = (module: NodeModule, filePath: string) => unknown;
export type TransformFn = (filePath: string) => string;

export function createTransformerExtension(transform: TransformFn): NodeExtension {
    return (nodeModule, filePath) => {
        (nodeModule as ICompilerModule)._compile(transform(filePath), filePath);
    };
}
