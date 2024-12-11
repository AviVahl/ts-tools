import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const { Extension } = ts;

const isTypescriptFile = (url: string) =>
  url.endsWith(Extension.Ts) ||
  url.endsWith(Extension.Tsx) ||
  url.endsWith(Extension.Mts) ||
  url.endsWith(Extension.Cts);

export type ModuleFormat = 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm';

/** @url https://nodejs.org/docs/latest-v22.x/api/module.html#resolvespecifier-context-nextresolve */
export type ResolveHook = (
  specifier: string,
  context: { parentURL?: string; conditions: string[] },
  nextResolve: ResolveHook,
) => { url: string; format?: ModuleFormat; shortCircuit?: boolean };

/** @url https://nodejs.org/docs/latest-v22.x/api/module.html#loadurl-context-nextload */
export type LoadHook = (
  url: string,
  context: { format?: ModuleFormat },
  nextLoad: LoadHook,
) => { source: string | SharedArrayBuffer | Uint8Array; format: ModuleFormat; shortCircuit?: boolean };

export interface CreateLoaderOptions {
  compilerOptions: ts.CompilerOptions;
  cwd: string;
}

const definitionExtensions = new Set<string>([Extension.Dts, Extension.Dcts, Extension.Dmts]);

export function createLoader({ compilerOptions, cwd }: CreateLoaderOptions) {
  const moduleResolutionCache = ts.createModuleResolutionCache(
    cwd,
    ts.sys.useCaseSensitiveFileNames ? (s) => s : (s) => s.toLowerCase(),
    compilerOptions,
  );
  const resolve: ResolveHook = (specifier, context, nextResolve) => {
    const { parentURL } = context;
    if (parentURL !== undefined && isTypescriptFile(parentURL)) {
      const { resolvedModule } = ts.resolveModuleName(
        specifier,
        fileURLToPath(parentURL),
        compilerOptions,
        ts.sys,
        moduleResolutionCache,
      );

      if (resolvedModule && !definitionExtensions.has(resolvedModule.extension)) {
        return {
          url: pathToFileURL(resolvedModule.resolvedFileName).href,
          shortCircuit: true,
        };
      }
    }

    return nextResolve(specifier, context, nextResolve);
  };

  const load: LoadHook = (url, context, nextLoad) => {
    if (isTypescriptFile(url)) {
      const filePath = fileURLToPath(url);
      const source = readFileSync(filePath, 'utf8');
      return {
        source: ts.transpileModule(source, {
          fileName: filePath,
          compilerOptions,
        }).outputText,
        format: 'module',
        shortCircuit: true,
      };
    } else {
      return nextLoad(url, context, nextLoad);
    }
  };

  return {
    resolve,
    load,
  };
}
