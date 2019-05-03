import ts from 'typescript';
import webpack from 'webpack';
import { TypeScriptService, ITranspilationOptions, createBaseHost } from '@ts-tools/service';
import { resolvedModulesTransformer } from '@ts-tools/robotrix';
import { getOptions, getRemainingRequest } from 'loader-utils';

const { sys } = ts;
const externalSourceMapPrefix = `//# sourceMappingURL=`;
const platformHasColors = !!sys && !!sys.writeOutputIsTTY && sys.writeOutputIsTTY();

/**
 * Loader options which can be provided via webpack configuration
 * or a specific request query string
 */
export interface ITypeScriptLoaderOptions {
    /**
     * Configuration file lookup (when no already loaded config is relevant).
     * Loader will search for the closest config file to the currently bundled
     * file, and load it.
     *
     * @default true
     */
    configLookup?: boolean;

    /**
     * Perform type check, if possible (loaded config is relevant).
     *
     * @default true
     */
    typeCheck?: boolean;

    /**
     * Expose diagnostics as webpack warnings.
     *
     * @default false exposes diagnostics as webpack errors
     */
    warnOnly?: boolean;

    /**
     * Use colors when formatting diagnostics.
     *
     * @default true (if current platform supports it)
     */
    colors?: boolean;

    /**
     * Keys to override in the `compilerOptions` section of the
     * `tsconfig.json` file.
     */
    compilerOptions?: object;

    /**
     * Configuration file name to look for.
     *
     * @default 'tsconfig.json'
     */
    configFileName?: string;
}

export const tsService = new TypeScriptService();

export const typescriptLoader: webpack.loader.Loader = function(/* source */) {
    const loaderOptions: ITypeScriptLoaderOptions = {
        colors: platformHasColors,
        warnOnly: false,
        compilerOptions: {},
        ...getOptions(this) // webpack's recommended method to parse loader options
    };
    const tsFormatFn = loaderOptions.colors ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics;

    const transpileOptions: ITranspilationOptions = {
        getBaseHost: () => ({
            ...createBaseHost(),
            getCurrentDirectory: () => this.rootContext,
            getProjectVersion: createGetProjectVersion(getTopParentCompiler(this._compiler))
        }),
        getCompilerOptions: (formatHost, tsconfigOptions) => {
            const compilerOptions: ts.CompilerOptions = {
                ...tsconfigOptions,
                module: ts.ModuleKind.ESNext // webpack supports it and we want tree shaking out of the box
            };

            if (tsconfigOptions && (!tsconfigOptions.module || tsconfigOptions.module === ts.ModuleKind.CommonJS)) {
                if (tsconfigOptions.esModuleInterop) {
                    // allowSyntheticDefaultImports is not implicitly turned on for ts<3.1
                    compilerOptions.allowSyntheticDefaultImports = true;
                }
                if (!tsconfigOptions.moduleResolution) {
                    // moduleResolution is no longer implicitly set to NodeJs
                    compilerOptions.moduleResolution = ts.ModuleResolutionKind.NodeJs;
                }
            } else if (!tsconfigOptions) {
                // no config was found, so assume es2017+jsx. opinionated, but can be overidden via loader options.
                compilerOptions.target = ts.ScriptTarget.ES2017;
                compilerOptions.jsx = ts.JsxEmit.React;
            }

            const { errors: optionsDiagnostics, options: overrideOptions } = ts.convertCompilerOptionsFromJson(
                loaderOptions.compilerOptions,
                this.rootContext
            );

            if (optionsDiagnostics.length) {
                this.emitError(new Error(tsFormatFn(optionsDiagnostics, formatHost)));
            } else {
                Object.assign(compilerOptions, overrideOptions);
            }

            // we dont accept any user overrides of sourcemap configuration
            // instead, we force external sourcemaps (with inline sources) on/off based on webpack signals.
            compilerOptions.sourceMap = compilerOptions.inlineSources = this.sourceMap;
            compilerOptions.inlineSourceMap = false;
            compilerOptions.mapRoot = compilerOptions.sourceRoot = undefined;

            // force declarations off, as we don't have .d.ts bundling.
            // noEmit will not give us any output, so force that off.
            // output locations are irrelevant, as we bundle. this ensures source maps have proper relative paths.
            compilerOptions.declaration = compilerOptions.declarationMap = compilerOptions.noEmit = false;
            compilerOptions.outDir = compilerOptions.out = compilerOptions.outFile = undefined;

            return compilerOptions;
        },
        configFileName: loaderOptions.configFileName,
        getCustomTransformers(_baseHost, compilerOptions) {
            return compilerOptions && compilerOptions.baseUrl ? { after: [resolvedModulesTransformer] } : undefined;
        },
        typeCheck: loaderOptions.typeCheck,
        configLookup: loaderOptions.configLookup
    };

    // transpile using `this.resourcePath`, ignoring the `source` provided to loader.
    // this means no support for preceding loaders changing source yet
    const { diagnostics, outputText, sourceMapText, baseHost, resolvedModules } = tsService.transpileFile(
        this.resourcePath,
        transpileOptions
    );

    // make sure files we import types from are declared as deps and watched
    // these can be .d.ts in node_modules or even .ts/x files in our project
    if (resolvedModules) {
        for (const resolvedModule of resolvedModules.values()) {
            if (resolvedModule) {
                this.addDependency(resolvedModule.resolvedFileName);
            }
        }
    }

    // expose diagnostics
    if (diagnostics && diagnostics.length) {
        const transpileError = new Error(tsFormatFn(diagnostics, baseHost));
        if (loaderOptions.warnOnly) {
            this.emitWarning(transpileError);
        } else {
            this.emitError(transpileError);
        }
    }

    if (sourceMapText) {
        const rawSourceMap = JSON.parse(sourceMapText) as import('source-map').RawSourceMap;
        if (rawSourceMap.sources.length === 1) {
            rawSourceMap.sources[0] = getRemainingRequest(this);
        }
        const sourceMappingIdx = outputText.lastIndexOf(externalSourceMapPrefix);

        this.callback(null, sourceMappingIdx === -1 ? outputText : outputText.slice(0, sourceMappingIdx), rawSourceMap);
    } else {
        this.callback(null, outputText);
    }
};

const getProjectVersionCache = new WeakMap<webpack.Compiler, () => string>();

function createGetProjectVersion(compiler: webpack.Compiler): () => string {
    const existingGetVersion = getProjectVersionCache.get(compiler);
    if (existingGetVersion) {
        return existingGetVersion;
    }
    let projectVersion = 0;
    compiler.hooks.done.tap('@ts-tools/webpack-loader (GetProjectVersion)', () => projectVersion++);
    const getProjectVersion = () => `${projectVersion}`;
    getProjectVersionCache.set(compiler, getProjectVersion);
    return getProjectVersion;
}

function getTopParentCompiler(compiler: any /* webpack.Compiler */) {
    while (compiler.isChild()) {
        compiler = compiler.parentCompilation.compiler;
    }
    return compiler;
}
