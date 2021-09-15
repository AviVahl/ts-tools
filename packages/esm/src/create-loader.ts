import { pathToFileURL, fileURLToPath } from 'url';
import ts from 'typescript';

const isTypescriptFile = (url: string) => url.endsWith('.ts') || url.endsWith('.tsx');

/** @url https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_resolve_specifier_context_defaultresolve */
export type ResolveHook = (
  specifier: string,
  context: { parentURL: string; conditions: string[] },
  defaultResolve: ResolveHook
) => { url: string };

/** @url https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_getformat_url_context_defaultgetformat */
export type FormatHook = (url: string, context: {}, defaultGetFormat: FormatHook) => { format: ModuleFormat };
export type ModuleFormat = 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm';

/** @url https://nodejs.org/docs/latest-v16.x/api/esm.html#esm_transformsource_source_context_defaulttransformsource */
export type TransformHook = (
  source: string | SharedArrayBuffer | Uint8Array,
  context: { url: string; format: ModuleFormat },
  defaultTransformSource: TransformHook
) => { source: string | SharedArrayBuffer | Uint8Array };

export interface CreateLoaderOptions {
  compilerOptions: ts.CompilerOptions;
  cwd: string;
}

export function createLoader({ compilerOptions, cwd }: CreateLoaderOptions) {
  const moduleResolutionCache = ts.createModuleResolutionCache(
    cwd,
    ts.sys.useCaseSensitiveFileNames ? (s) => s : (s) => s.toLowerCase(),
    compilerOptions
  );
  const resolve: ResolveHook = (specifier, context, defaultResolve) => {
    const { parentURL } = context;
    if (parentURL !== undefined && isTypescriptFile(parentURL)) {
      const { resolvedModule } = ts.resolveModuleName(
        specifier,
        fileURLToPath(parentURL),
        compilerOptions,
        ts.sys,
        moduleResolutionCache
      );

      if (resolvedModule && resolvedModule.extension !== '.d.ts') {
        return {
          url: pathToFileURL(resolvedModule.resolvedFileName).href,
        };
      }
    }

    return defaultResolve(specifier, context, defaultResolve);
  };

  const getFormat: FormatHook = (url, context, defaultGetFormat) => {
    return isTypescriptFile(url) ? { format: 'module' } : defaultGetFormat(url, context, defaultGetFormat);
  };

  const transformSource: TransformHook = (source, context, defaultTransformSource) => {
    const { url } = context;

    return isTypescriptFile(url)
      ? {
          source: ts.transpileModule(source.toString(), {
            fileName: fileURLToPath(url),
            compilerOptions,
          }).outputText,
        }
      : defaultTransformSource(source, context, defaultTransformSource);
  };
  return {
    resolve,
    getFormat,
    transformSource,
  };
}
