import { dirname } from 'node:path';
import ts from 'typescript';

/**
 * loads a tsconfig file
 * @returns adjusted compiler options (suitable for esm execution)
 */

export function loadTsconfig(tsconfigPath: string): ts.CompilerOptions {
  const { options } = ts.parseJsonSourceFileConfigFileContent(
    ts.readJsonConfigFile(tsconfigPath, ts.sys.readFile),
    ts.sys,
    dirname(tsconfigPath),
  );

  options.inlineSourceMap = true;
  options.sourceMap = options.inlineSources = undefined!;
  options.mapRoot = options.sourceRoot = undefined!;
  options.outDir = options.outFile = undefined!;
  options.noEmit = undefined!;
  return options;
}
