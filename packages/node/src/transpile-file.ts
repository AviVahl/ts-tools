import { join } from 'path';
import { statSync, readFileSync, writeFileSync, existsSync } from 'fs';
import ts from 'typescript';
import { stringify, calcSha1, getCanonicalPath, readJsonFileSync } from './helpers';

const tsVersion = ts.version;

interface ICachedTranspileOutput extends ts.TranspileOutput {
    filePath: string;
    mtime: number;
    tsVersion: string;
}

export interface ITranspileFileOptions extends ts.TranspileOptions {
    fileName: string;
}

export function transpileFile(options: ITranspileFileOptions): ts.TranspileOutput {
    return ts.transpileModule(readFileSync(options.fileName, 'utf8'), options);
}

export function transpileFileWithCache(cacheDirectoryPath: string, options: ITranspileFileOptions): ts.TranspileOutput {
    const { fileName: filePath } = options;
    const mtime = statSync(filePath).mtime.getTime();
    const cacheFilePath = resolveCachePath(cacheDirectoryPath, filePath);
    const cachedOutput = loadCachedOutput(cacheFilePath);
    if (cachedOutput && cachedOutput.mtime === mtime) {
        return cachedOutput;
    }

    const transpiledOutput = transpileFile(options);

    try {
        writeFileSync(
            cacheFilePath,
            stringify({
                filePath,
                ...transpiledOutput,
                diagnostics: undefined,
                mtime,
                tsVersion
            } as ICachedTranspileOutput)
        );
    } catch {
        /**/
    }

    return transpiledOutput;
}

export function resolveCachePath(cacheDirectoryPath: string, filePath: string) {
    return join(cacheDirectoryPath, `${calcSha1(getCanonicalPath(filePath))}.json`);
}

export function loadCachedOutput(cacheFilePath: string): ICachedTranspileOutput | undefined {
    if (existsSync(cacheFilePath)) {
        try {
            const cachedOutput = readJsonFileSync(cacheFilePath);
            if (typeof cachedOutput === 'object' && cachedOutput !== null) {
                return cachedOutput as ICachedTranspileOutput;
            }
        } catch {
            /**/
        }
    }
    return undefined;
}
