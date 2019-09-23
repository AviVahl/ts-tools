import { statSync } from 'fs';

import ts from 'typescript';
import sourceMapSupport from 'source-map-support';

import { extractInlineSourceMap, findCacheDirectory, ensureDirectorySync } from './helpers';
import { transpileFileWithCache, transpileFile, resolveCachePath, loadCachedOutput } from './transpile-file';

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
     * Turn persistent caching on/off.
     *
     *  @default true
     */
    cache?: boolean;

    /**
     * Absolute path of an existing directory to use for persistent cache.
     *
     * @default uses `find-cache-dir` to search for caching path.
     */
    cacheDirectoryPath?: string;
}

export type NodeExtension = (module: NodeModule, filePath: string) => unknown;

interface ICompilerModule extends NodeModule {
    _compile(code: string, filePath: string): void;
}

const cacheDirName = (compilerOptions: ts.CompilerOptions) => {
    const module = ts.ModuleKind[compilerOptions.module || ts.ModuleKind.CommonJS];
    const target = ts.ScriptTarget[compilerOptions.target || ts.ScriptTarget.ESNext];
    return `ts-${module.toLowerCase()}-${target.toLowerCase()}`;
};

export const createNodeExtension = ({
    compilerOptions = defaultCompilerOptions,
    cache = true,
    cacheDirectoryPath = findCacheDirectory(process.cwd(), cacheDirName(compilerOptions))
}: ICreateNodeExtensionOptions = {}): NodeExtension => {
    const shouldCache = cache && typeof cacheDirectoryPath === 'string';

    if (shouldCache) {
        try {
            ensureDirectorySync(cacheDirectoryPath!);
        } catch {
            /**/
        }
        sourceMapSupport.install({
            environment: 'node',
            retrieveSourceMap(filePath) {
                const cacheFilePath = resolveCachePath(cacheDirectoryPath!, filePath);
                const cachedOutput = loadCachedOutput(cacheFilePath);
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
    const transpileFn = shouldCache ? transpileFileWithCache.bind(undefined, cacheDirectoryPath!) : transpileFile;

    return (nodeModule, filePath) => {
        (nodeModule as ICompilerModule)._compile(
            transpileFn({ fileName: filePath, compilerOptions }).outputText,
            filePath
        );
    };
};
