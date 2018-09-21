import * as ts from 'typescript'
import { TypeScriptService } from '@ts-tools/typescript-service'
import { loader } from 'webpack'
import { getOptions, getRemainingRequest } from 'loader-utils'

const sourceMappingPrefix = `//# sourceMappingURL=`

const noConfigOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.ESNext,
    sourceMap: true,
    inlineSources: true,
    jsx: ts.JsxEmit.React, // opinionated, but we want built-in support for .tsx without tsconfig.json
}

const overrideOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,

    // make sure source maps work out-of-the-box
    // currently, `devtool` being set to `source-map` or `inline-source-map` works well
    // `eval` fails, which is a shame
    sourceMap: true,
    inlineSourceMap: false,
    inlineSources: true,
    sourceRoot: undefined,
    mapRoot: undefined,

    declaration: false,
    declarationMap: false,

    outDir: undefined,
    outFile: undefined
}

const tsService = new TypeScriptService({ noConfigOptions, overrideOptions })

const useColoredOutput = !!ts.sys.writeOutputIsTTY && ts.sys.writeOutputIsTTY()
const formatDiagnosticsHost = ts.createCompilerHost(noConfigOptions)

/**
 * Loader options that con be provided from the webpack config or specifc request query string
 */
export interface ITypeScriptLoaderOptions {
    warnOnly?: boolean
    colors?: boolean
}

export const typescriptLoader: loader.Loader = function(/* source */) {
    // atm, the loader does not use webpack's `inputFileSystem` to create a custom language service
    // instead, it uses native node APIs (via @ts-tools/typescript-service)
    // so we use the file path directly (this.resourcePath) instead of the `source` passed to us
    // this also means we do not support other loaders before us
    // not ideal, but works for most use cases
    // will be changed in near future
    const { diagnostics, outputText, sourceMapText } = tsService.transpileFile(this.resourcePath)

    // webpack's recommended method of parsing loader options, with our defaults
    const loaderOptions = { colors: true, warnOnly: false, ...getOptions(this) } as ITypeScriptLoaderOptions

    // expose diagnostics
    if (diagnostics && diagnostics.length) {
        const formattedDiagnostics = useColoredOutput && loaderOptions.colors ?
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
