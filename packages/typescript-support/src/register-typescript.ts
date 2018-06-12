import * as ts from 'typescript'
import * as sourceMapSupport from 'source-map-support'
import chalk from 'chalk'
import { NodeTypeScriptService } from 'node-typescript-service'

// // Used for printing transpilation errors
const { red } = chalk

// a map holding `file path` to its `matching source maps` (stringified JSON)
const sourceMaps = new Map<string, string>()

// Node 8+ compatible compiler options
const nodeCompilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    sourceMap: true,
    jsx: ts.JsxEmit.React, // opinionated, but we want built-in support for .tsx without tsconfig.json
}

const formatDiagnosticsHost = ts.createCompilerHost(nodeCompilerOptions)

// our service instance, to be used foby the require hook
const nodeTsService = new NodeTypeScriptService({
    noConfigOptions: nodeCompilerOptions,
    overrideOptions: {
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,

        sourceMap: true,
        inlineSourceMap: false,
        inlineSources: false,
        sourceRoot: undefined,
        mapRoot: undefined,

        declaration: false,
        declarationMap: false,

        outDir: undefined,
        outFile: undefined
    }
})

// connects source maps of the service to source-map-support
sourceMapSupport.install({
    environment: 'node',
    retrieveSourceMap: (filePath) => {
        const fileSourceMap = sourceMaps.get(filePath)
        return fileSourceMap ? { map: fileSourceMap, url: filePath } : null
    }
})

// our require extension transpiles the file to js using the service
// and then runs the resulting js like any regular js
function requireExtension(nodeModule: NodeModule, filePath: string): void {
    const { diagnostics, outputText, sourceMapText } = nodeTsService.transpileFile(filePath)

    if (diagnostics && diagnostics.length) {
        throw new Error(
            `${red('Transpilation Errors')} in ${filePath}:\n` +
            ts.formatDiagnostics(diagnostics, formatDiagnosticsHost)
        )
    }

    if (sourceMapText) {
        sourceMaps.set(filePath, sourceMapText)
    } else {
        sourceMaps.delete(filePath)
    }

    nodeModule._compile(outputText, filePath)
}

// register our extension for the two default supported extensions
require.extensions['.ts'] = require.extensions['.tsx'] = requireExtension
