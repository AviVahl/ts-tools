import * as ts from 'typescript'
import { TypeScriptService } from '@ts-tools/typescript-service'
import { loader } from 'webpack'
import { getOptions, getRemainingRequest } from 'loader-utils'
import { externalSourceMapPrefix, platformHasColors, transpilationOptions } from './constants'

/**
 * Loader options which can be provided via webpack configuration
 * or a specific request query string
 */
export interface ITypeScriptLoaderOptions {
    /**
     * Expose diagnostics as webpack warnings.
     *
     * @default false exposes diagnostics as webpack errors
     */
    warnOnly?: boolean

    /**
     * Use colors when formatting diagnostics.
     *
     * @default true (if current platform supports it)
     */
    colors?: boolean

    /**
     * Keys to override in the `compilerOptions` section of the
     * `tsconfig.json` file.
     */
    compilerOptions?: object

    /**
     * Configuration file name to look for.
     *
     * @default 'tsconfig.json'
     */
    tsconfigFileName?: string
}

export const tsService = new TypeScriptService()

export const typescriptLoader: loader.Loader = function(/* source */) {
    const loaderOptions: ITypeScriptLoaderOptions = {
        colors: platformHasColors,
        warnOnly: false,
        compilerOptions: {},
        ...getOptions(this) // webpack's recommended method to parse loader options
    }

    const tsFormatFn = loaderOptions.colors ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics

    const { errors: optionsDiagnostics, options: overrideOptions } = ts.convertCompilerOptionsFromJson(
        loaderOptions.compilerOptions,
        this.rootContext
    )

    if (optionsDiagnostics.length) {
        this.callback(new Error(tsFormatFn(optionsDiagnostics, ts.createCompilerHost({}))))
        return
    }

    const tsConfigOverride = { ...transpilationOptions.tsConfigOverride, ...overrideOptions }
    const noConfigOptions = { ...transpilationOptions.noConfigOptions, ...overrideOptions }
    // atm, the loader does not use webpack's `inputFileSystem` to create a custom language service
    // instead, it uses native node APIs (via @ts-tools/typescript-service)
    // so we use the file path directly (this.resourcePath) instead of the `source` passed to us
    // this also means we do not support other loaders before us
    // not ideal, but works for most use cases
    // will be changed in near future
    const { diagnostics, outputText, sourceMapText, baseHost } = tsService.transpileFile(this.resourcePath, {
        cwd: this.rootContext,
        tsConfigOverride,
        noConfigOptions,
        tsconfigFileName: loaderOptions.tsconfigFileName
    })

    // expose diagnostics
    if (diagnostics && diagnostics.length) {
        const transpileError = new Error(tsFormatFn(diagnostics, baseHost))
        if (loaderOptions.warnOnly) {
            this.emitWarning(transpileError)
        } else {
            this.emitError(transpileError)
        }
    }

    const rawSourceMap = JSON.parse(sourceMapText!) as import ('source-map').RawSourceMap

    if (rawSourceMap.sources.length === 1) {
        rawSourceMap.sources[0] = getRemainingRequest(this)
    }

    const sourceMappingIdx = outputText.lastIndexOf(externalSourceMapPrefix)

    // provide webpack with the transpilation result
    this.callback(null, sourceMappingIdx === -1 ? outputText : outputText.slice(0, sourceMappingIdx), rawSourceMap)
}
