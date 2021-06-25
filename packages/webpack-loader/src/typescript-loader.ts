import type webpack from 'webpack';
import { delimiter, join } from 'path';
import ts from 'typescript';
import {
  externalSourceMapPrefix,
  readAndParseConfigFile,
  getCanonicalPath,
  getNewLine,
  transpileCached,
  findCacheDirectory,
  ensureDirectorySync,
  compilerOptionsToCacheName,
  createCachedFn,
} from '@ts-tools/transpile';

const { fileExists } = ts.sys;
const identity = (value: string) => value;

const [cachedFindConfigFile] = createCachedFn(
  ts.findConfigFile,
  (searchPath, _, configName) => searchPath + delimiter + String(configName)
);
const [cachedReadAndParseConfigFile] = createCachedFn(readAndParseConfigFile, identity);
const [cachedFindCacheDirectory] = createCachedFn(findCacheDirectory, identity);
const ensuredDirectories = new Set<string>();

/**
 * Loader options which can be provided via webpack configuration
 * or a specific request query string
 */
export interface ITypeScriptLoaderOptions {
  /**
   * Keys to override in the `compilerOptions` section of the
   * `tsconfig.json` file.
   */
  compilerOptions?: Record<string, unknown>;

  /**
   * Turn persistent caching on/off.
   *
   *  @default true unless `transformers` is provided.
   */
  cache?: boolean;

  /**
   * Absolute path of an existing directory to use for persistent cache.
   *
   * @default uses `find-cache-dir` to search for caching path.
   */
  cacheDirectoryPath?: string;

  /**
   * Path to `tsconfig.json` file.
   * Specifying it will skip config lookup
   */
  configFilePath?: string;

  /**
   * Name of config file to search for when looking up config.
   *
   * @default 'tsconfig.json'
   */
  configFileName?: string;

  /**
   * Should loader search for config.
   * Loader will search for the closest tsconfig file to the root context, and load it.
   *
   * @default true
   */
  configLookup?: boolean;

  /**
   * Custom transformers to use when transpiling a module.
   *
   * @default undefined
   */
  transformers?: ts.CustomTransformers;
}

export const typescriptLoader: webpack.LoaderDefinition = function (source) {
  const fileContents = source.toString();
  const { resourcePath, rootContext, sourceMap } = this;
  const options: ITypeScriptLoaderOptions = {
    ...this.getOptions(),
  };
  const {
    configFileName,
    configLookup = true,
    configFilePath = configLookup ? cachedFindConfigFile(rootContext, fileExists, configFileName) : undefined,
    transformers,
    cache = !transformers,
    cacheDirectoryPath = cache ? cachedFindCacheDirectory(rootContext) : undefined,
    compilerOptions: overrideOptions,
  } = options;

  const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: () => rootContext,
    getCanonicalFileName: getCanonicalPath,
    getNewLine,
  };

  // compiler options

  const compilerOptions: ts.CompilerOptions = {};

  if (typeof configFilePath === 'string') {
    const { options, errors } = cachedReadAndParseConfigFile(configFilePath);
    if (errors.length) {
      this.emitError(new Error(ts.formatDiagnostics(errors, formatDiagnosticsHost)));
    }
    Object.assign(compilerOptions, options);
  } else {
    compilerOptions.target = ts.ScriptTarget.ES2018;
    compilerOptions.jsx = ts.JsxEmit.ReactJSXDev || ts.JsxEmit.React;
  }

  // webpack supports, validates, and tree-shakes es modules.
  // apply it before overrides, so user can customize it
  compilerOptions.module = ts.ModuleKind.ESNext;

  if (overrideOptions) {
    const { options, errors } = ts.convertCompilerOptionsFromJson(overrideOptions, rootContext);
    if (errors.length) {
      this.emitError(new Error(ts.formatDiagnostics(errors, formatDiagnosticsHost)));
    }
    Object.assign(compilerOptions, options);
  }

  // we dont accept any user overrides of sourcemap configuration
  // instead, we force external sourcemaps (with inline sources) on/off based on webpack signals.
  compilerOptions.sourceMap = compilerOptions.inlineSources = sourceMap;
  compilerOptions.inlineSourceMap = compilerOptions.mapRoot = compilerOptions.sourceRoot = undefined;

  // force declarations off, as we don't have .d.ts bundling.
  // output locations are irrelevant, as we bundle. this ensures source maps have proper relative paths.
  // noEmit will not give us any output, so force that off.
  compilerOptions.declaration = compilerOptions.declarationMap = undefined;
  compilerOptions.outDir = compilerOptions.out = compilerOptions.outFile = undefined;
  compilerOptions.noEmit = compilerOptions.noEmitOnError = compilerOptions.emitDeclarationOnly = undefined;

  // caching
  const optionsScopedCachePath = cacheDirectoryPath
    ? join(cacheDirectoryPath, compilerOptionsToCacheName(compilerOptions))
    : undefined;

  if (optionsScopedCachePath && !ensuredDirectories.has(optionsScopedCachePath)) {
    try {
      ensureDirectorySync(optionsScopedCachePath);
    } catch {
      /**/
    }
    ensuredDirectories.add(optionsScopedCachePath);
  }

  const transpileOptions = {
    fileName: resourcePath,
    compilerOptions,
    transformers,
    reportDiagnostics: true,
  };

  // transpile
  const { sourceMapText, outputText, diagnostics } = optionsScopedCachePath
    ? transpileCached({
        ...transpileOptions,
        cacheDirectoryPath: optionsScopedCachePath,
        fileContents,
      })
    : ts.transpileModule(fileContents, transpileOptions);

  if (diagnostics && diagnostics.length) {
    this.emitError(new Error(ts.formatDiagnostics(diagnostics, formatDiagnosticsHost)));
  }

  if (sourceMapText) {
    const rawSourceMap = JSON.parse(sourceMapText) as SourceMap;
    if (rawSourceMap.sources.length === 1) {
      // ensure source maps point to the correct target in a loader chain
      rawSourceMap.sources[0] = this.remainingRequest;
    }

    // find/remove inline comment linking to sourcemap
    const sourceMappingIdx = outputText.lastIndexOf(externalSourceMapPrefix);
    this.callback(null, sourceMappingIdx === -1 ? outputText : outputText.slice(0, sourceMappingIdx), rawSourceMap);
  } else {
    this.callback(null, outputText);
  }
};

interface SourceMap {
  version: number;
  sources: string[];
  mappings: string;
  file?: string;
  sourceRoot?: string;
  sourcesContent?: string[];
  names?: string[];
}
