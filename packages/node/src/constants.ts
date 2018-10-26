import ts, { CompilerOptions } from 'typescript'
import { ITranspilationOptions } from '@ts-tools/typescript-service'
import { createRemapImportsTransformer } from '@ts-tools/robotrix'

const { sys } = ts
const platformHasColors = !!sys.writeOutputIsTTY && sys.writeOutputIsTTY()
export const tsFormatFn = platformHasColors ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics
export const inlineSourceMapPrefix = '//# sourceMappingURL=data:application/json;base64,'

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
    },
    getCustomTransformers(_baseHost, compilerOptions): ts.CustomTransformers | undefined {
        if (compilerOptions && compilerOptions.baseUrl) {
            const transformer = createRemapImportsTransformer({
                remapTarget(request, _containingFile, { resolvedModules }) {
                    if (!resolvedModules || request.startsWith('./') || request.startsWith('../')) {
                        // relative request or no typescript mapping.
                        return request
                    }

                    const resolvedModule = resolvedModules.get(request)
                    if (
                        resolvedModule &&
                        !resolvedModule.isExternalLibraryImport &&
                        resolvedModule.extension !== ts.Extension.Dts
                    ) {
                        // remap request to absolute resolved file
                        return resolvedModule.resolvedFileName
                    }
                    return request
                }
            })

            return { before: [transformer] }
        }
        return undefined
    }
}
