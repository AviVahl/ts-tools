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
    extractInlineSourceMap,
    readAndParseConfigFile,
    getCanonicalPath,
    getNewLine
} from '@ts-tools/transpile';

const { fileExists } = ts.sys;

export const defaultCompilerOptions: ts.CompilerOptions = {
    // Node 8+.
    target: ts.ScriptTarget.ES2017,

    // Node has a CommonJS module system.
    module: ts.ModuleKind.CommonJS,

    // Pure commonjs libraries should be importable as default.
    // e.g `import express from 'express';`
    esModuleInterop: true,

    // Transpile jsx to React calls (opinionated).
    jsx: ts.JsxEmit.React
};

export type NodeExtension = (module: NodeModule, filePath: string) => unknown;

export interface ICreateNodeExtensionOptions {
    /**
     * Directory to start searching for `tsconfig.json` and cache directory.
     *
     * @default process.cwd()
     */
    contextPath?: string;

    /**
     * Absolute path of an existing directory to use for persistent cache.
     *
     * @default finds the top-most `package.json`, and uses `./node_modules/.config` next to it.
     */
    cacheDirectoryPath?: string;

    /**
     * Install `source-map-support` connected to the cache.
     *
     * @default true (if `--enable-source-maps` was not passed to node)
     */
    installSourceMapSupport?: boolean;

    /**
     * Search for the closest `configFileName` file to `contextPath`, and load it.
     *
     * @default true
     */
    configLookup?: boolean;

    /**
     * Path to `tsconfig.json` file.
     * Specifying it will skip config lookup.
     */
    configFilePath?: string;

    /**
     * Name of config file to search for when looking up config.
     *
     * @default 'tsconfig.json'
     */
    configFileName?: string;

    /**
     * Compiler options to use when config file (e.g. `tsconfig.json`) isn't found.
     *
     * @default `defaultCompilerOptions` (also exported from package)
     */
    compilerOptions?: ts.CompilerOptions;

    /**
     * Automatically pick target syntax matching running Node version.
     *
     * @default true
     */
    autoScriptTarget?: boolean;
}

/**
 * Creates a cachine TypeScript node extension.
 */
export function createNodeExtension({
    contextPath = process.cwd(),
    configLookup = true,
    configFileName,
    configFilePath = configLookup ? ts.findConfigFile(contextPath, fileExists, configFileName) : undefined,
    compilerOptions: noConfigOptions = defaultCompilerOptions,
    cacheDirectoryPath = findCacheDirectory(contextPath),
    installSourceMapSupport = !process.execArgv.includes('--enable-source-maps'),
    autoScriptTarget = true
}: ICreateNodeExtensionOptions = {}): NodeExtension {
    const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
        getCurrentDirectory: () => contextPath,
        getCanonicalFileName: getCanonicalPath,
        getNewLine
    };

    const compilerOptions: ts.CompilerOptions = {};

    if (typeof configFilePath === 'string') {
        const { options, errors } = readAndParseConfigFile(configFilePath);
        if (errors.length) {
            throw new Error(ts.formatDiagnostics(errors, formatDiagnosticsHost));
        }
        Object.assign(compilerOptions, options);
        if (compilerOptions.module !== ts.ModuleKind.CommonJS) {
            // force commonjs, for node
            compilerOptions.module = ts.ModuleKind.CommonJS;
        }
    } else {
        Object.assign(compilerOptions, noConfigOptions);
    }

    // Ensure source maps get picked up by v8 inspector (vscode/chrome debuggers) and node's `--enable-source-maps`.
    compilerOptions.inlineSourceMap = true;
    compilerOptions.sourceMap = compilerOptions.inlineSources = undefined;
    compilerOptions.mapRoot = compilerOptions.sourceRoot = undefined;
    compilerOptions.outDir = compilerOptions.outFile = undefined;

    if (autoScriptTarget) {
        const [nodeMajor] = process.versions.node.split('.'); // '12.0.0' => '12'
        compilerOptions.target = nodeVersionToScriptTarget(Number(nodeMajor));
    }

    if (typeof cacheDirectoryPath !== 'string') {
        // couldn't find a cache directory, so fall back to a non-caching implementation
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
}

interface ICompilerModule extends NodeModule {
    _compile(code: string, filePath: string): void;
}

export type TransformFn = (filePath: string) => string;

export function createTransformerExtension(transform: TransformFn): NodeExtension {
    return function nodeExtension(nodeModule, filePath) {
        (nodeModule as ICompilerModule)._compile(transform(filePath), filePath);
    };
}

// for older TypeScript versions without es2019/2020
const ES2019 = ts.ScriptTarget.ES2019 || ts.ScriptTarget.ES2018 || ts.ScriptTarget.ES2017;
const ES2020 = ts.ScriptTarget.ES2020 || ES2019;

export function nodeVersionToScriptTarget(major: number): ts.ScriptTarget {
    if (major >= 12) {
        return ES2020;
    } else if (major >= 10) {
        return ES2019;
    } else {
        return ts.ScriptTarget.ES2017;
    }
}
