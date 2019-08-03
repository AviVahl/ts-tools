import { ITranspilationOptions } from '@ts-tools/service';
import { inlineSourceMapPrefix, tsFormatFn, sharedBaseHost } from './constants';
import { packageState } from './package-state';

export interface IRegisterExtensionOptions {
    transpileOptions: ITranspilationOptions;
    onDiagnostics?: (diagnosticsText: string) => void;
}

export function registerNodeExtension({ transpileOptions, onDiagnostics }: IRegisterExtensionOptions): void {
    if (require.extensions['.ts'] || require.extensions['.tsx']) {
        return; // avoid double registeration
    }

    const { tsService, sourceMaps } = packageState;
    const { readFile } = sharedBaseHost;
    // our require extension transpiles the file to js using the service
    // and then runs the resulting js like any regular js
    function requireExtension(nodeModule: NodeModule, filePath: string): void {
        if (filePath.endsWith('.d.ts')) {
            const fileContents = readFile(filePath);
            nodeModule._compile(
                `Object.defineProperty(exports, "__esModule", { value: true });\n` +
                    `exports.default = ${JSON.stringify(fileContents)};`,
                filePath
            );
            return;
        }

        const { diagnostics, outputText, baseHost } = tsService.transpileFile(filePath, transpileOptions);

        if (diagnostics && diagnostics.length && onDiagnostics) {
            onDiagnostics(tsFormatFn(diagnostics, baseHost));
        }

        // search for inline sourcemap, and save it in cache
        const inlineSourceMapIdx = outputText.lastIndexOf(inlineSourceMapPrefix);
        if (inlineSourceMapIdx !== -1) {
            const base64SourceMap = outputText.slice(inlineSourceMapIdx + inlineSourceMapPrefix.length).trimRight();
            sourceMaps.set(filePath, base64SourceMap);
        } else {
            sourceMaps.delete(filePath);
        }
        if (!packageState.pendingVersionBump) {
            packageState.pendingVersionBump = true;
            process.nextTick(() => {
                packageState.version++;
                packageState.pendingVersionBump = false;
            });
        }
        nodeModule._compile(outputText, filePath);
    }

    // register our extension for the two default supported extensions
    require.extensions['.ts'] = require.extensions['.tsx'] = requireExtension;
}
