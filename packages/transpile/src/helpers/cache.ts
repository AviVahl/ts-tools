import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import ts from 'typescript';
import { findAllUp, getCanonicalPath } from './fs';
import { getEmitModuleKind, getEmitScriptTarget } from './typescript';

export const filePathToCacheFileName = (filePath: string): string => `${calcSha1(getCanonicalPath(filePath))}.json`;

export function findCacheDirectory(workDirPath: string): string | undefined {
  const packageJsonPaths = findAllUp(workDirPath, 'package.json');
  const rootPackageJson = packageJsonPaths[packageJsonPaths.length - 1];
  return rootPackageJson ? join(dirname(rootPackageJson), 'node_modules', '.cache') : undefined;
}

export function compilerOptionsToCacheName(compilerOptions: ts.CompilerOptions): string {
  const moduleKind = ts.ModuleKind[getEmitModuleKind(compilerOptions)]!;
  const scriptTarget = ts.ScriptTarget[getEmitScriptTarget(compilerOptions)]!;
  return `ts-${moduleKind.toLowerCase()}-${scriptTarget.toLowerCase()}`;
}

export function calcSha1(data: string): string {
  return createHash('sha1').update(data).digest('hex');
}

// eslint-disable-next-line
export function createCachedFn<FN extends (...args: any[]) => unknown>(
  fn: FN,
  argsToCacheKey: (...args: Parameters<FN>) => string,
): [FN, Map<string, ReturnType<FN>>] {
  const cache = new Map<string, ReturnType<FN>>();
  const cachedFn = (...args: Parameters<FN>) => {
    const cacheKey = argsToCacheKey(...args);
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    const item = fn(...args) as ReturnType<FN>;
    cache.set(cacheKey, item);
    return item;
  };
  return [cachedFn as FN, cache];
}
