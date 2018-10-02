import * as sourceMapSupport from 'source-map-support'
import { TypeScriptService } from '@ts-tools/typescript-service'
import { transpilationOptions, inlineSourceMapPrefix, tsFormatFn } from './constants'

export function registerNodeExtension(onDiagnostics?: (diagnosticsText: string) => void) {

    // a map holding `file path` to its `matching source maps` (base64-encoded, stringified JSON)
    const sourceMaps = new Map<string, string>()

    // our service instance, to be used by the require hook
    const tsService = new TypeScriptService()

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
        const { diagnostics, outputText, baseHost } = tsService.transpileFile(filePath, transpilationOptions)

        if (diagnostics && diagnostics.length && onDiagnostics) {
            onDiagnostics(tsFormatFn(diagnostics, baseHost))
        }

        const inlineSourceMapIdx = outputText.lastIndexOf(inlineSourceMapPrefix)
        if (inlineSourceMapIdx !== -1) {
            sourceMaps.set(
                filePath,
                outputText.slice(inlineSourceMapIdx + inlineSourceMapPrefix.length).trimRight()
            )
        } else {
            sourceMaps.delete(filePath)
        }

        nodeModule._compile(outputText, filePath)
    }

    // register our extension for the two default supported extensions
    require.extensions['.ts'] = require.extensions['.tsx'] = requireExtension
}
