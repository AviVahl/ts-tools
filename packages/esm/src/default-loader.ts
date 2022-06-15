import ts from 'typescript';
import { createLoader } from './create-loader.js';
import { loadTsconfig } from './load-tsconfig.js';

const defaultCompilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  inlineSourceMap: true,
  module: ts.ModuleKind.Node16,
  moduleResolution: ts.ModuleResolutionKind.Node16,
  jsx: ts.JsxEmit.ReactJSX,
};

const cwd = process.cwd();
const tsconfigPath = ts.findConfigFile(cwd, ts.sys.fileExists);
const compilerOptions = tsconfigPath !== undefined ? loadTsconfig(tsconfigPath) : defaultCompilerOptions;

const { resolve, load } = createLoader({ compilerOptions, cwd });

export { resolve, load };
