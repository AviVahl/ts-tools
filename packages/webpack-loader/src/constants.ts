import * as ts from 'typescript'
import { normalize, dirname } from 'path'
import { ITypeScriptServiceHost, ITranspilationOptions } from '@ts-tools/typescript-service'

const noConfigOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.ESNext,
    sourceMap: true,
    inlineSources: true,
    jsx: ts.JsxEmit.React, // opinionated, but we want built-in support for .tsx without tsconfig.json
}

const tsConfigOverride: ts.CompilerOptions = {
    // webpack supports it and we want tree shaking out of the box
    module: ts.ModuleKind.ESNext,

    // make sure source maps work out-of-the-box
    sourceMap: true,
    inlineSourceMap: false,
    inlineSources: true,
    sourceRoot: undefined,
    mapRoot: undefined,

    // we are not going to generate .d.ts files for the bundle
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

export const transpilationOptions: ITranspilationOptions = {
    tsConfigOverride,
    noConfigOptions,
    host: nativeNodeHost
}

export const externalSourceMapPrefix = `//# sourceMappingURL=`

export const platformHasColors = !!ts.sys.writeOutputIsTTY && ts.sys.writeOutputIsTTY()
export const formatDiagnosticsHost = ts.createCompilerHost(noConfigOptions)
