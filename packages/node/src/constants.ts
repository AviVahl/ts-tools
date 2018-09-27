import { normalize, dirname } from 'path'
import * as ts from 'typescript'
const { sys } = ts

import { ITranspilationOptions } from '@ts-tools/typescript-service'

export const inlineMapPrefix = '//# sourceMappingURL=data:application/json;base64,'

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

const platformHasColors = !!sys.writeOutputIsTTY && sys.writeOutputIsTTY()
export const tsFormatFn = platformHasColors ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics
export const formatDiagnosticsHost = ts.createCompilerHost(noConfigOptions)

export const nativeNodeHost = {
    directoryExists: sys.directoryExists,
    fileExists: sys.fileExists,
    getCurrentDirectory: sys.getCurrentDirectory,
    getDefaultLibFilePath: ts.getDefaultLibFilePath,
    getDirectories: sys.getDirectories,
    getModifiedTime: sys.getModifiedTime!,
    newLine: sys.newLine,
    readDirectory: sys.readDirectory,
    readFile: sys.readFile,
    realpath: sys.realpath,
    useCaseSensitiveFileNames: !sys.fileExists(__filename.toUpperCase()),
    dirname,
    normalize
}
