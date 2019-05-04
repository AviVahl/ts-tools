import ts, { CompilerOptions } from 'typescript';
import { ITranspilationOptions, createBaseHost, IBaseHost } from '@ts-tools/service';
import { resolvedModulesTransformer } from '@ts-tools/robotrix';
import { packageState } from './package-state';

const { sys } = ts;
const platformHasColors = !!sys.writeOutputIsTTY && sys.writeOutputIsTTY();
export const tsFormatFn = platformHasColors ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics;
export const inlineSourceMapPrefix = '//# sourceMappingURL=data:application/json;base64,';

export const defaultCompilerOptions: CompilerOptions = {
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
};

export const sharedBaseHost: IBaseHost = {
    ...createBaseHost(),
    getProjectVersion() {
        return `${packageState.version}`;
    }
};

export const defaultTranspileOptions: Readonly<ITranspilationOptions> = {
    getCompilerOptions(_baseHost, tsconfigOptions) {
        const compilerOptions: ts.CompilerOptions = { ...tsconfigOptions, ...defaultCompilerOptions };

        if (compilerOptions.target === undefined || compilerOptions.target < ts.ScriptTarget.ES2017) {
            // we support Node 8+, so force newer syntax even if we found a tsconfig with target: 'es5'
            compilerOptions.target = ts.ScriptTarget.ES2017;
        }

        if (!tsconfigOptions) {
            compilerOptions.esModuleInterop = true;
            compilerOptions.jsx = ts.JsxEmit.React;
        }

        return compilerOptions;
    },
    getCustomTransformers(_baseHost, compilerOptions): ts.CustomTransformers | undefined {
        return compilerOptions && compilerOptions.baseUrl ? { after: [resolvedModulesTransformer] } : undefined;
    },
    getBaseHost: () => sharedBaseHost
};

export const fastTranspileOptions: Readonly<ITranspilationOptions> = {
    typeCheck: false,
    getCompilerOptions: defaultTranspileOptions.getCompilerOptions
};
