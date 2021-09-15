import { dirname } from 'path';
import ts from 'typescript';

/**
 * loads a tsconfig file
 * @returns adjusted compiler options (suitable for esm execution)
 */

export function loadTsconfig(tsconfigPath: string): ts.CompilerOptions {
  const { options } = ts.parseJsonSourceFileConfigFileContent(
    ts.readJsonConfigFile(tsconfigPath, ts.sys.readFile),
    ts.sys,
    dirname(tsconfigPath)
  );
  if (options.module === undefined || options.module < ts.ModuleKind.ES2015) {
    options.module = ts.ModuleKind.ES2020;
  }
  options.inlineSourceMap = true;
  options.sourceMap = options.inlineSources = undefined;
  options.mapRoot = options.sourceRoot = undefined;
  options.outDir = options.outFile = undefined;
  options.noEmit = undefined;
  return options;
}
