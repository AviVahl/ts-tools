import ts, { sys } from 'typescript';
import { IBaseHost, ICustomFs } from './types';

const UNIX_EOL = '\n';
const identity = (val: string) => val;
const toLowerCase = (val: string) => val.toLowerCase();

function defaultGetScriptVersion(filePath: string): string {
  const stats = sys.getModifiedTime ? sys.getModifiedTime(filePath) : undefined;
  return stats !== undefined ? `${stats.getTime()}` : `${Date.now()}`;
}

function defaultGetScriptSnapshot(filePath: string) {
  const fileContents = sys.readFile(filePath);
  return fileContents !== undefined ? ts.ScriptSnapshot.fromString(fileContents) : undefined;
}

export function createBaseHost(): IBaseHost {
  return {
    fileExists: sys.fileExists,
    directoryExists: sys.directoryExists,
    readFile: sys.readFile,
    readDirectory: sys.readDirectory,
    getDirectories: sys.getDirectories,
    realpath: sys.realpath,
    useCaseSensitiveFileNames: sys.useCaseSensitiveFileNames,
    getCanonicalFileName: sys.useCaseSensitiveFileNames ? identity : toLowerCase,
    getCurrentDirectory: sys.getCurrentDirectory,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    getNewLine: () => sys.newLine,
    dirname: ts.getDirectoryPath,
    normalize: sys.resolvePath,
    getScriptVersion: defaultGetScriptVersion,
    getScriptSnapshot: defaultGetScriptSnapshot,
  };
}

export function createCustomBaseHost(fs: ICustomFs): IBaseHost {
  const {
    caseSensitive,
    statSync,
    readFileSync,
    readdirSync,
    join,
    dirname,
    normalize,
    realpathSync = identity,
    defaultLibsDirectory,
    getCurrentDirectory,
  } = fs;

  function getFileSystemEntries(path: string): { files: string[]; directories: string[] } {
    const files: string[] = [];
    const directories: string[] = [];

    try {
      const dirEntries = readdirSync(path);
      for (const entryName of dirEntries) {
        const entryStats = statSync(join(path, entryName));
        if (!entryStats) {
          continue;
        }
        if (entryStats.isFile()) {
          files.push(entryName);
        } else if (entryStats.isDirectory()) {
          directories.push(entryName);
        }
      }
    } catch {
      /* */
    }
    return { files, directories };
  }

  return {
    readDirectory(rootDir, extensions, excludes, includes, depth) {
      return ts.matchFiles(
        rootDir,
        extensions,
        excludes,
        includes,
        caseSensitive,
        rootDir,
        depth,
        getFileSystemEntries,
        realpathSync
      );
    },
    getDirectories(path) {
      return getFileSystemEntries(path).directories;
    },
    fileExists(path) {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    },
    directoryExists(path) {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    },
    readFile(path, encoding = 'utf8') {
      try {
        return readFileSync(path, encoding);
      } catch {
        return undefined;
      }
    },
    useCaseSensitiveFileNames: caseSensitive,
    getCanonicalFileName: caseSensitive ? identity : toLowerCase,
    getCurrentDirectory,
    getNewLine: sys ? () => sys.newLine : () => UNIX_EOL,
    getScriptVersion(filePath) {
      try {
        return `${statSync(filePath).mtime.getTime()}`;
      } catch {
        return `${Date.now()}`;
      }
    },
    getScriptSnapshot(filePath) {
      try {
        return ts.ScriptSnapshot.fromString(readFileSync(filePath, 'utf8'));
      } catch {
        return undefined;
      }
    },
    getDefaultLibFileName: (options) => join(defaultLibsDirectory, ts.getDefaultLibFileName(options)),

    realpath: realpathSync,
    dirname,
    normalize,
  };
}

export function createLanguageServiceHost(
  baseHost: IBaseHost,
  getScriptFileNames: () => string[],
  getCompilationSettings: () => ts.CompilerOptions,
  getCustomTransformers?: () => ts.CustomTransformers | undefined
): ts.LanguageServiceHost {
  const { useCaseSensitiveFileNames, getNewLine } = baseHost;

  return {
    ...baseHost,
    getCompilationSettings,
    getScriptFileNames,
    getCustomTransformers,
    useCaseSensitiveFileNames: () => useCaseSensitiveFileNames,
    getNewLine: () => ts.getNewLineCharacter(getCompilationSettings(), getNewLine),
  };
}
