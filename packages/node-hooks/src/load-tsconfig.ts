import * as ts from 'typescript/sync';

/**
 * loads a tsconfig file
 * @returns adjusted compiler options (suitable for esm execution)
 */

export function loadTsconfig(tsconfigPath: string): ts.CompilerOptions {
  const api = new ts.API();
  const { options } = api.parseConfigFile(tsconfigPath);

  if (options.module === undefined || !isESModuleKind(options.module)) {
    options.module = ts.ModuleKind.ESNext;
  }

  if (options.moduleResolution === undefined) {
    options.moduleResolution = ts.ModuleResolutionKind.Bundler;
  }
  options.inlineSourceMap = true;
  options.sourceMap = options.inlineSources = undefined!;
  options.mapRoot = options.sourceRoot = undefined!;
  options.outDir = undefined!;
  options.noEmit = undefined!;
  return options;
}

function isESModuleKind(moduleKind: ts.ModuleKind): boolean {
  return moduleKind >= ts.ModuleKind.ES2015 && moduleKind <= ts.ModuleKind.ESNext;
}
