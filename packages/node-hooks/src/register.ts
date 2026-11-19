import { registerHooks } from 'node:module';
import * as tsAst from 'typescript/ast';
import * as ts from 'typescript/sync';
import { createHooks } from './create-hooks.ts';

const cwd = process.cwd();
const compilerOptions: ts.CompilerOptions = {
  target: tsAst.ScriptTarget.ESNext,
  inlineSourceMap: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  jsx: ts.JsxEmit.ReactJSX,
};

registerHooks(createHooks({ compilerOptions, cwd }));
