import { normalize, dirname } from 'path'
import * as ts from 'typescript'
import { ITranspilationOptions, ITypeScriptServiceHost } from '@ts-tools/typescript-service'

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

const { sys } = ts
const nativeNodeHost: ITypeScriptServiceHost = {
    directoryExistsSync: sys.directoryExists,
    fileExistsSync: sys.fileExists,
    cwd: sys.getCurrentDirectory(),
    getDefaultLibFilePath: ts.getDefaultLibFilePath,
    readdirSync: sys.getDirectories,
    getModifiedTime: sys.getModifiedTime!,
    newLine: sys.newLine,
    readDirectory: sys.readDirectory,
    readFileSync: sys.readFile,
    realpathSync: sys.realpath,
    isCaseSensitive: !sys.fileExists(__filename.toUpperCase()),
    dirname,
    normalize
}

export const transpilationOptions: ITranspilationOptions = { noConfigOptions, tsConfigOverride, host: nativeNodeHost }

export const inlineSourceMapPrefix = '//# sourceMappingURL=data:application/json;base64,'
const platformHasColors = !!sys.writeOutputIsTTY && sys.writeOutputIsTTY()
export const tsFormatFn = platformHasColors ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics
export const formatDiagnosticsHost = ts.createCompilerHost(noConfigOptions)
