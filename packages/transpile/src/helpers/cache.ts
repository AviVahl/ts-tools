import { createHash } from 'crypto';
import ts from 'typescript';
import { join, dirname } from 'path';
import { findAllUp, getCanonicalPath } from './fs';
import { getEmitModuleKind, getEmitScriptTarget } from './typescript';

export const filePathToCacheFileName = (filePath: string) => `${calcSha1(getCanonicalPath(filePath))}.json`;

export function findCacheDirectory(workDirPath: string): string | undefined {
    const packageJsonPaths = findAllUp(workDirPath, 'package.json');
    const rootPackageJson = packageJsonPaths[packageJsonPaths.length - 1];
    return rootPackageJson ? join(dirname(rootPackageJson), 'node_modules', '.cache') : undefined;
}

export function compilerOptionsToCacheName(compilerOptions: ts.CompilerOptions): string {
    const moduleKind = ts.ModuleKind[getEmitModuleKind(compilerOptions)];
    const scriptTarget = ts.ScriptTarget[getEmitScriptTarget(compilerOptions)];
    return `ts-${moduleKind.toLowerCase()}-${scriptTarget.toLowerCase()}`;
}

export function calcSha1(data: string) {
    return createHash('sha1')
        .update(data)
        .digest('hex');
}
