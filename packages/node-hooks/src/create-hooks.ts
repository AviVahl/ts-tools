import { readFileSync } from 'node:fs';
import type { LoadHookSync, RegisterHooksOptions, ResolveHookSync } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as ts from 'typescript/sync';

const isTypescriptFile = (url: string) =>
  url.endsWith('.ts') || url.endsWith('.tsx') || url.endsWith('.mts') || url.endsWith('.cts');

export interface CreateHooksOptions {
  compilerOptions: ts.CompilerOptions;
  cwd: string;
}

const definitionExtensions = new Set<string>(['.d.ts', '.d.cts', '.d.mts']);

export function createHooks({ compilerOptions, cwd }: CreateHooksOptions): RegisterHooksOptions {
  const api = new ts.API({ cwd });

  const moduleResolver = api.createModuleResolver(compilerOptions);

  const resolve: ResolveHookSync = (specifier, context, nextResolve) => {
    const { parentURL } = context;
    if (parentURL !== undefined && isTypescriptFile(parentURL)) {
      const { resolvedModule } = moduleResolver.resolveModuleName(specifier, fileURLToPath(parentURL));

      if (resolvedModule && !definitionExtensions.has(resolvedModule.extension)) {
        return {
          url: pathToFileURL(resolvedModule.resolvedFileName).href,
          shortCircuit: true,
        };
      }
    }

    return nextResolve(specifier, context);
  };

  const load: LoadHookSync = (url, context, nextLoad) => {
    if (isTypescriptFile(url)) {
      const filePath = fileURLToPath(url);
      const source = readFileSync(filePath, 'utf8');
      return {
        source: api.transpileModule(source, {
          fileName: filePath,
          compilerOptions,
        }).outputText,
        format: filePath.endsWith('.cts') ? 'commonjs' : 'module',
        shortCircuit: true,
      };
    } else {
      return nextLoad(url, context);
    }
  };

  return {
    resolve,
    load,
  };
}
