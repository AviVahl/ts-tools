import * as ts from 'typescript/sync';
import * as tsAst from 'typescript/ast';
import { createHooks } from './create-hooks.ts';
import { loadTsconfig } from './load-tsconfig.ts';

const defaultCompilerOptions: ts.CompilerOptions = {
  target: tsAst.ScriptTarget.ESNext,
  inlineSourceMap: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  jsx: ts.JsxEmit.ReactJSX,
};

const cwd = process.cwd();
// const tsconfigPath = ts.findConfigFile(cwd, ts.sys.fileExists);
const tsconfigPath = undefined; // TODO: implement tsconfig discovery
const compilerOptions = tsconfigPath !== undefined ? loadTsconfig(tsconfigPath) : defaultCompilerOptions;

const hooks = createHooks({ compilerOptions, cwd });

export { hooks };
