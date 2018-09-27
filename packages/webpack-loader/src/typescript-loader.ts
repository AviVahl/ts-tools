import * as ts from 'typescript'
import { TypeScriptService } from '@ts-tools/typescript-service'
import { loader } from 'webpack'
import { getOptions, getRemainingRequest } from 'loader-utils'
import {
    noConfigOptions,
    overrideOptions,
    nativeNodeHost,
    sourceMappingPrefix,
    platformHasColors,
    formatDiagnosticsHost
} from './constants'

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
     * `tsconfig.json` file. This is not the `ts.CompilerOptions` interface,
     * the values there are resolved.
     */
    compilerOptions?: object
}

const tsService = new TypeScriptService({ noConfigOptions, overrideOptions, host: nativeNodeHost })

export const typescriptLoader: loader.Loader = function(/* source */) {
    // atm, the loader does not use webpack's `inputFileSystem` to create a custom language service
    // instead, it uses native node APIs (via @ts-tools/typescript-service)
    // so we use the file path directly (this.resourcePath) instead of the `source` passed to us
    // this also means we do not support other loaders before us
    // not ideal, but works for most use cases
    // will be changed in near future
    const { diagnostics, outputText, sourceMapText } = tsService.transpileFile(this.resourcePath)

    // webpack's recommended method of parsing loader options, with our defaults
    const loaderOptions: ITypeScriptLoaderOptions = { colors: platformHasColors, warnOnly: false, ...getOptions(this) }

    // expose diagnostics
    if (diagnostics && diagnostics.length) {
        const formattedDiagnostics = loaderOptions.colors ?
            ts.formatDiagnosticsWithColorAndContext(diagnostics, formatDiagnosticsHost) :
            ts.formatDiagnostics(diagnostics, formatDiagnosticsHost)

        const diagnosticsError = new Error(formattedDiagnostics)

        if (loaderOptions.warnOnly) {
            this.emitWarning(diagnosticsError)
        } else {
            this.emitError(diagnosticsError)
        }
    }

    const rawSourceMap = JSON.parse(sourceMapText!) as import ('source-map').RawSourceMap

    if (rawSourceMap.sources.length === 1) {
        rawSourceMap.sources[0] = getRemainingRequest(this)
    }

    const sourceMappingIdx = outputText.lastIndexOf(sourceMappingPrefix)

    // provide webpack with the transpilation result
    this.callback(null, sourceMappingIdx === -1 ? outputText : outputText.slice(0, sourceMappingIdx), rawSourceMap)
}
