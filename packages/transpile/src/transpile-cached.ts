import { join } from 'path';
import { statSync, readFileSync, writeFileSync, existsSync } from 'fs';
import ts from 'typescript';
import { filePathToCacheFileName, filterAffectsEmit, areEmitCompatible } from './helpers';

const tsVersion = ts.version;

export interface ITranspileCachedOptions extends ts.TranspileOptions {
  cacheDirectoryPath: string;
  fileName: string;
  fileContents?: string;
}

export function transpileCached(options: ITranspileCachedOptions): ts.TranspileOutput {
  const { fileName: filePath, cacheDirectoryPath, fileContents, compilerOptions = {} } = options;
  const mtime = statSync(filePath).mtime.getTime();
  const cacheFilePath = join(cacheDirectoryPath, filePathToCacheFileName(filePath));
  const cachedOutput = readCacheFileSync(cacheFilePath);

  if (
    cachedOutput &&
    cachedOutput.mtime === mtime &&
    cachedOutput.tsVersion === tsVersion &&
    areEmitCompatible(cachedOutput, compilerOptions)
  ) {
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
    sourceMapText: transpiledOutput.sourceMapText,
    ...filterAffectsEmit(compilerOptions),
  });

  return transpiledOutput;
}

export interface ICachedTranspileOutput extends ts.CompilerOptions {
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
      const cachedOutput = JSON.parse(readFileSync(cacheFilePath, 'utf8')) as unknown;
      if (typeof cachedOutput === 'object' && cachedOutput !== null) {
        return cachedOutput as ICachedTranspileOutput;
      }
    } catch {
      /**/
    }
  }
  return undefined;
}
