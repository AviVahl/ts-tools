import * as ts from 'typescript'
import * as sourceMapSupport from 'source-map-support'
import { NodeTypeScriptService } from 'node-typescript-service'

const inlineMapPrefix = '//# sourceMappingURL=data:application/json;base64,'

// Node 8+ compatible compiler options
const nodeCompilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.CommonJS,
    inlineSourceMap: true,
    jsx: ts.JsxEmit.React, // opinionated, but we want built-in support for .tsx without tsconfig.json
}

const useColoredOutput = !!ts.sys.writeOutputIsTTY && ts.sys.writeOutputIsTTY()
const tsFormatFn = useColoredOutput ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics

const formatDiagnosticsHost = ts.createCompilerHost(nodeCompilerOptions)
export const formatDiagnostics = (diagnostics: ts.Diagnostic[]) => tsFormatFn(diagnostics, formatDiagnosticsHost)

export function registerNodeExtension(onDiagnostics?: (diagnostics: ts.Diagnostic[]) => void) {

    // a map holding `file path` to its `matching source maps` (base64-encoded, stringified JSON)
    const sourceMaps = new Map<string, string>()

    // our service instance, to be used by the require hook
    const nodeTsService = new NodeTypeScriptService({
        noConfigOptions: nodeCompilerOptions,
        overrideOptions: {
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
    })

    // connects source maps of the service to source-map-support
    sourceMapSupport.install({
        environment: 'node',
        retrieveSourceMap: (filePath) => {
            const fileSourceMap = sourceMaps.get(filePath)
            return fileSourceMap ? { map: Buffer.from(fileSourceMap, 'base64').toString(), url: filePath } : null
        }
    })

    // our require extension transpiles the file to js using the service
    // and then runs the resulting js like any regular js
    function requireExtension(nodeModule: NodeModule, filePath: string): void {
        const { diagnostics, outputText } = nodeTsService.transpileFile(filePath)

        if (diagnostics && diagnostics.length && onDiagnostics) {
            onDiagnostics(diagnostics)
        }

        const inlineSourceMapIdx = outputText.lastIndexOf(inlineMapPrefix)
        if (inlineSourceMapIdx !== -1) {
            sourceMaps.set(
                filePath,
                outputText.slice(inlineSourceMapIdx + inlineMapPrefix.length).trimRight()
            )
        } else {
            sourceMaps.delete(filePath)
        }

        nodeModule._compile(outputText, filePath)
    }

    // register our extension for the two default supported extensions
    require.extensions['.ts'] = require.extensions['.tsx'] = requireExtension
}
