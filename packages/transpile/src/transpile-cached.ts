import { join } from 'path';
import { statSync, readFileSync, writeFileSync, existsSync } from 'fs';
import ts from 'typescript';
import { filePathToCacheFileName } from './helpers';

const tsVersion = ts.version;

export interface ITranspileCachedOptions extends ts.TranspileOptions {
    cacheDirectoryPath: string;
    fileName: string;
    fileContents?: string;
}

export function transpileCached(options: ITranspileCachedOptions): ts.TranspileOutput {
    const { fileName: filePath, cacheDirectoryPath, fileContents } = options;
    const mtime = statSync(filePath).mtime.getTime();
    const cacheFilePath = join(cacheDirectoryPath, filePathToCacheFileName(filePath));
    const cachedOutput = readCacheFileSync(cacheFilePath);

    if (cachedOutput && cachedOutput.mtime === mtime) {
        return cachedOutput;
    }

    const transpiledOutput = ts.transpileModule(
        typeof fileContents === 'string' ? fileContents : readFileSync(filePath, 'utf8'),
        options
    );

    writeCacheFileSync(cacheFilePath, {
        filePath,
        mtime,
        tsVersion,
        outputText: transpiledOutput.outputText,
        sourceMapText: transpiledOutput.sourceMapText
    });

    return transpiledOutput;
}

export interface ICachedTranspileOutput {
    filePath: string;
    outputText: string;
    sourceMapText?: string;
    mtime: number;
    tsVersion: string;
}

export function writeCacheFileSync(cacheFilePath: string, output: ICachedTranspileOutput): void {
    try {
        writeFileSync(cacheFilePath, JSON.stringify(output, null, 2));
    } catch {
        /**/
    }
}

export function readCacheFileSync(cacheFilePath: string): ICachedTranspileOutput | undefined {
    if (existsSync(cacheFilePath)) {
        try {
            const cachedOutput = JSON.parse(readFileSync(cacheFilePath, 'utf8'));
            if (typeof cachedOutput === 'object' && cachedOutput !== null) {
                return cachedOutput as ICachedTranspileOutput;
            }
        } catch {
            /**/
        }
    }
    return undefined;
}
