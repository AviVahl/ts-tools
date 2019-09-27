import { CompilerOptions, ScriptTarget, ModuleKind } from 'typescript';

export function getEmitScriptTarget(compilerOptions: CompilerOptions): ScriptTarget {
    return compilerOptions.target || ScriptTarget.ES3;
}

export function getEmitModuleKind(compilerOptions: CompilerOptions): ModuleKind {
    return typeof compilerOptions.module === 'number'
        ? compilerOptions.module
        : getEmitScriptTarget(compilerOptions) >= ScriptTarget.ES2015
        ? ModuleKind.ES2015
        : ModuleKind.CommonJS;
}
