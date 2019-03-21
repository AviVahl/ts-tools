import ts from 'typescript';
import { remapSourceFileImports } from './remap-imports-transformer';

/**
 * Remaps static/dynamic esm imports/re-exports in a source file
 * to the actual files resolved by TypeScript.
 *
 * It ignores relative targets or ones resolved to definition (.d.ts) files.
 *
 */
export function resolvedModulesTransformer(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
    return sourceFile => sourceFile.resolvedModules ?
        remapSourceFileImports(sourceFile, context, remapImportsToResolvedModules) : sourceFile;
}

function remapImportsToResolvedModules(request: string, _containingFile: string, { resolvedModules }: ts.SourceFile) {
    if (!resolvedModules || request.startsWith('./') || request.startsWith('../')) {
        // relative request or no typescript mapping.
        return request;
    }

    const resolvedModule = resolvedModules.get(request);

    if (resolvedModule && resolvedModule.extension !== ts.Extension.Dts) {
        // remap request to absolute resolved file
        return resolvedModule.resolvedFileName;
    }
    return request;
}
