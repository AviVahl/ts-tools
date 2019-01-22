import ts, { CompilerOptions } from 'typescript'
import { ITranspilationOptions } from '@ts-tools/service'
import { resolvedModulesTransformer } from '@ts-tools/robotrix'

const { sys } = ts
const platformHasColors = !!sys.writeOutputIsTTY && sys.writeOutputIsTTY()
export const tsFormatFn = platformHasColors ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics
export const inlineSourceMapPrefix = '//# sourceMappingURL=data:application/json;base64,'

export const forcedCompilerOptions: CompilerOptions = {
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

export const defaultTranspileOptions: Readonly<ITranspilationOptions> = {
    getCompilerOptions(_baseHost, tsconfigOptions) {
        const compilerOptions: ts.CompilerOptions = { ...tsconfigOptions, ...forcedCompilerOptions }

        if (compilerOptions.target === undefined || compilerOptions.target < ts.ScriptTarget.ES2017) {
            // we support Node 8+, so force newer syntax even if we found a tsconfig with target: 'es5'
            compilerOptions.target = ts.ScriptTarget.ES2017
        }

        if (!tsconfigOptions) {
            compilerOptions.esModuleInterop = true
            compilerOptions.jsx = ts.JsxEmit.React
        }

        return compilerOptions
    },
    getCustomTransformers(_baseHost, compilerOptions): ts.CustomTransformers | undefined {
        return compilerOptions && compilerOptions.baseUrl ? { after: [resolvedModulesTransformer] } : undefined
    }
}

export const isolatedCompilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    esModuleInterop: true,
    jsx: ts.JsxEmit.React,
    ...forcedCompilerOptions
}

export const isolatedTranspileOptions: Readonly<ITranspilationOptions> = {
    isolated: true,
    getCompilerOptions: () => isolatedCompilerOptions
}
