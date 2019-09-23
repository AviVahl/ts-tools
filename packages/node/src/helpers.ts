import { createHash } from 'crypto';
import ts from 'typescript';
import { readFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';

const inlineSourceMapPrefix = '//# sourceMappingURL=data:application/json;base64,';
const inlineSourceMapPrefixLength = inlineSourceMapPrefix.length;

export const decodeBase64 = (data: string) => Buffer.from(data, 'base64').toString();
export function extractInlineSourceMap(code: string): string | undefined {
    const inlineSourceMapIdx = code.lastIndexOf(inlineSourceMapPrefix);
    return inlineSourceMapIdx !== -1
        ? decodeBase64(code.slice(inlineSourceMapIdx + inlineSourceMapPrefixLength).trimRight())
        : undefined;
}

export const getCanonicalPath: (path: string) => string = ts.sys.useCaseSensitiveFileNames
    ? v => v
    : v => v.toLowerCase();
export const stringify = (data: unknown) => JSON.stringify(data, null, 2);
export const calcSha1 = (data: string) =>
    createHash('sha1')
        .update(data, 'utf8')
        .digest('hex');

export function readJsonFileSync(filePath: string): unknown | undefined {
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function ensureDirectorySync(directoryPath: string): void {
    if (existsSync(directoryPath)) {
        return;
    }
    try {
        mkdirSync(directoryPath);
    } catch (e) {
        const parentPath = dirname(directoryPath);
        if (parentPath === directoryPath) {
            throw e;
        }
        ensureDirectorySync(parentPath);
        mkdirSync(directoryPath);
    }
}

export function findAllUp(initialDirectoryPath: string, fileName: string): string[] {
    const filePaths: string[] = [];
    let currentPath = resolve(initialDirectoryPath);
    let lastPath: string | undefined;

    while (currentPath !== lastPath) {
        const filePath = join(currentPath, fileName);
        if (existsSync(filePath) && statSync(filePath).isFile()) {
            filePaths.push(filePath);
        }
        lastPath = currentPath;
        currentPath = dirname(currentPath);
    }

    return filePaths;
}

export function findCacheDirectory(workDirPath: string, cacheName: string): string | undefined {
    const packageJsonPaths = findAllUp(workDirPath, 'package.json');
    const rootPackageJson = packageJsonPaths[packageJsonPaths.length - 1];
    return rootPackageJson ? join(dirname(rootPackageJson), 'node_modules', '.cache', cacheName) : undefined;
}
