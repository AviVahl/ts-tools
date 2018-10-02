import * as ts from 'typescript'
import { ITranspilationOptions } from '@ts-tools/typescript-service'

// Node 8+ compatible compiler options
const noConfigOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    inlineSourceMap: true,
    jsx: ts.JsxEmit.React,
}

const tsConfigOverride = {
    module: ts.ModuleKind.CommonJS,
    sourceMap: false,
    inlineSourceMap: true,
    inlineSources: false,
    sourceRoot: undefined,
    mapRoot: undefined,
    declaration: false,
    declarationMap: false,
    outDir: undefined,
    outFile: undefined
}

export const transpilationOptions: ITranspilationOptions = { noConfigOptions, tsConfigOverride }

export const inlineSourceMapPrefix = '//# sourceMappingURL=data:application/json;base64,'
const { sys } = ts
const platformHasColors = !!sys.writeOutputIsTTY && sys.writeOutputIsTTY()
export const tsFormatFn = platformHasColors ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics
