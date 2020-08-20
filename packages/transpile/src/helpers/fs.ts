import ts from 'typescript';
import { existsSync, mkdirSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';

const { sys } = ts;
export const getCanonicalPath: (path: string) => string = sys.useCaseSensitiveFileNames
  ? (v) => v
  : (v) => v.toLowerCase();

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
