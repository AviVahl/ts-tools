import { dirname } from 'path';
import {
    CompilerOptions,
    ScriptTarget,
    ModuleKind,
    readJsonConfigFile,
    parseJsonSourceFileConfigFileContent,
    sys,
    ParsedCommandLine
} from 'typescript';

const { readFile, newLine } = sys;

export const affectsEmit = new Set([
    // scoping cache path with these two
    // 'target',
    // 'module',
    'jsx',
    'sourceMap',
    'removeComments',
    'importHelpers',
    'downlevelIteration',
    'esModuleInterop',
    'inlineSourceMap',
    'inlineSources',
    'reactNamespace',
    'emitBOM',
    'newLine',
    'stripInternal',
    'noEmitHelpers',
    'preserveConstEnums'
]);

export function areEmitCompatible(oldOptions: CompilerOptions, options: CompilerOptions): boolean {
    for (const optionName of affectsEmit) {
        const newOptionValue = options[optionName];
        const oldOptionValue = oldOptions[optionName];
        if (!!newOptionValue === !!oldOptionValue) {
            continue;
        }
        if (newOptionValue !== oldOptionValue) {
            return false;
        }
    }
    return true;
}

export function filterAffectsEmit(compilerOptions: CompilerOptions): CompilerOptions {
    const filteredOptions: CompilerOptions = {};
    for (const [optionName, optionValue] of Object.entries(compilerOptions)) {
        if (affectsEmit.has(optionName)) {
            filteredOptions[optionName] = optionValue;
        }
    }
    return filteredOptions;
}

export function readAndParseConfigFile(filePath: string): ParsedCommandLine {
    const jsonSourceFile = readJsonConfigFile(filePath, readFile);
    return parseJsonSourceFileConfigFileContent(jsonSourceFile, sys, dirname(filePath));
}

export function getNewLine(): string {
    return newLine;
}

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
