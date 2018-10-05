import ts, { CompilerOptions } from 'typescript'
import { ITranspilationOptions } from '@ts-tools/typescript-service'

const forcedOptions: CompilerOptions = {
    module: ts.ModuleKind.CommonJS,

    inlineSourceMap: true,
    sourceMap: false,
    inlineSources: false,
    sourceRoot: undefined,
    mapRoot: undefined,

    outDir: undefined,
    outFile: undefined,
    out: undefined,
    noEmit: false,

    declaration: false,
    declarationMap: false
}

export const transpilationOptions: ITranspilationOptions = {
    getCompilerOptions(_baseHost, tsconfigOptions) {
        const compilerOptions: ts.CompilerOptions = { ...tsconfigOptions, ...forcedOptions }

        if (compilerOptions.target === undefined || compilerOptions.target < ts.ScriptTarget.ES2017) {
            // we support Node 8+, so force newer syntax even if we found a tsconfig with target: 'es5'
            compilerOptions.target = ts.ScriptTarget.ES2017
        }

        if (!tsconfigOptions) {
            compilerOptions.esModuleInterop = true
            compilerOptions.jsx = ts.JsxEmit.React
        }

        return compilerOptions
    }
}

export const inlineSourceMapPrefix = '//# sourceMappingURL=data:application/json;base64,'
const { sys } = ts
const platformHasColors = !!sys.writeOutputIsTTY && sys.writeOutputIsTTY()
export const tsFormatFn = platformHasColors ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics
