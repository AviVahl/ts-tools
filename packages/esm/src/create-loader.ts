import { readFileSync } from 'node:fs';
import { dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const { Extension } = ts;

const moduleKindsWithAutoDetection = new Set<ts.ModuleKind>([
  ts.ModuleKind.Node16,
  ts.ModuleKind.NodeNext,
  ts.ModuleKind.Preserve,
]);

const isTypescriptFile = (url: string) =>
  url.endsWith(Extension.Ts) ||
  url.endsWith(Extension.Tsx) ||
  url.endsWith(Extension.Mts) ||
  url.endsWith(Extension.Cts);

export type ModuleFormat = 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm';

/** @url https://nodejs.org/docs/latest-v16.x/api/esm.html#resolvespecifier-context-defaultresolve */
export type ResolveHook = (
  specifier: string,
  context: { parentURL?: string; conditions: string[] },
  defaultResolve: ResolveHook,
) => { url: string; format?: ModuleFormat | undefined; shortCircuit?: boolean };

/** @url https://nodejs.org/docs/latest-v16.x/api/esm.html#loadurl-context-defaultload */
export type LoadHook = (
  url: string,
  context: { format?: ModuleFormat },
  defaultTransformSource: LoadHook,
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
  const resolve: ResolveHook = (specifier, context, defaultResolve) => {
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

    return defaultResolve(specifier, context, defaultResolve);
  };

  const load: LoadHook = (url, context, defaultTransformSource) => {
    if (isTypescriptFile(url)) {
      const filePath = fileURLToPath(url);
      const source = readFileSync(filePath, 'utf8');
      const format =
        context.format ??
        extensionToModuleFormat(extname(filePath)) ??
        detectModuleFormat(filePath, compilerOptions.module ?? ts.ModuleKind.ESNext);

      return {
        source: ts.transpileModule(source, {
          fileName: filePath,
          compilerOptions: {
            ...compilerOptions,
            module: format === 'module' ? ts.ModuleKind.ESNext : ts.ModuleKind.CommonJS,
          },
        }).outputText,
        format,
        shortCircuit: true,
      };
    } else {
      return defaultTransformSource(url, context, defaultTransformSource);
    }
  };

  return {
    resolve,
    load,
  };
}

function extensionToModuleFormat(extension: string): ModuleFormat | undefined {
  switch (extension as ts.Extension) {
    case Extension.Cts:
      return 'commonjs';
    case Extension.Mts:
      return 'module';
    default:
      return;
  }
}

function detectModuleFormat(filePath: string, moduleKind: ts.ModuleKind): ModuleFormat {
  if (moduleKind === ts.ModuleKind.CommonJS) {
    return 'commonjs';
  } else if (moduleKind >= ts.ModuleKind.ES2015 && moduleKind <= ts.ModuleKind.ESNext) {
    return 'module';
  } else if (moduleKindsWithAutoDetection.has(moduleKind)) {
    const closestPackageJson = ts.findConfigFile(dirname(filePath), ts.sys.fileExists, 'package.json');
    if (closestPackageJson !== undefined) {
      const packageJsonContents = readFileSync(closestPackageJson, 'utf8');
      const packageJson = safeParseJson(packageJsonContents);
      const isObjectLike = typeof packageJson === 'object' && packageJson !== null;
      if (isObjectLike) {
        return 'type' in packageJson && packageJson['type'] === 'module' ? 'module' : 'commonjs';
      }
    }
  }
  return 'module';
}

function safeParseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}
