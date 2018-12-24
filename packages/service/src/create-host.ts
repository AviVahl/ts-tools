import ts, { sys } from 'typescript'
import { ICustomFs, IBaseHost } from './types'

const identity = (val: string) => val
const toLowerCase = (val: string) => val.toLowerCase()

export function createBaseHost(cwd: string): IBaseHost {
    return {
        fileExists: sys.fileExists,
        directoryExists: sys.directoryExists,
        readFile: sys.readFile,
        readDirectory: sys.readDirectory,
        getDirectories: sys.getDirectories,
        realpath: sys.realpath,
        useCaseSensitiveFileNames: sys.useCaseSensitiveFileNames,
        getCanonicalFileName: sys.useCaseSensitiveFileNames ? identity : toLowerCase,
        getCurrentDirectory: () => cwd,
        getNewLine: () => sys.newLine,
        dirname: ts.getDirectoryPath,
        normalize: ts.sys.resolvePath
    }
}

export function createCustomFsBaseHost(cwd: string, customFs: ICustomFs): IBaseHost {
    const { caseSensitive, statSync, readFileSync, readdirSync, join, dirname, normalize, realpathSync } = customFs

    function getFileSystemEntries(path: string): { files: string[], directories: string[] } {
        const files: string[] = []
        const directories: string[] = []

        try {
            const dirEntries = readdirSync(path)
            for (const entryName of dirEntries) {
                const entryStats = statSync(join(path, entryName))
                if (!entryStats) {
                    continue
                }
                if (entryStats.isFile()) {
                    files.push(entryName)
                } else if (entryStats.isDirectory()) {
                    directories.push(entryName)
                }
            }
        } catch { /* */ }
        return { files, directories }
    }

    return {
        readDirectory(rootDir, extensions, excludes, includes, depth) {
            return ts.matchFiles(
                rootDir, extensions, excludes, includes, caseSensitive, rootDir, depth, getFileSystemEntries
            )
        },
        getDirectories(path) {
            return getFileSystemEntries(path).directories
        },
        fileExists(path) {
            try {
                return statSync(path).isFile()
            } catch {
                return false
            }
        },
        directoryExists(path) {
            try {
                return statSync(path).isDirectory()
            } catch {
                return false
            }
        },
        readFile(path) {
            try {
                return readFileSync(path, 'utf8')
            } catch {
                return undefined
            }
        },
        useCaseSensitiveFileNames: caseSensitive,
        getCanonicalFileName: caseSensitive ? identity : toLowerCase,
        getCurrentDirectory: () => cwd,
        getNewLine: () => ts.sys ? ts.sys.newLine : '\n',
        realpath: realpathSync,
        dirname,
        normalize
    }
}

export function createLanguageServiceHost(
    baseHost: IBaseHost,
    fileNames: string[],
    compilerOptions: ts.CompilerOptions,
    customTransformers?: ts.CustomTransformers
): ts.LanguageServiceHost {
    const targetNewLine = ts.getNewLineCharacter(compilerOptions, baseHost.getNewLine)

    return {
        ...baseHost,
        getCompilationSettings: () => compilerOptions,
        getScriptFileNames: () => fileNames,
        getScriptVersion(filePath) {
            const stats = sys.getModifiedTime!(filePath)
            return stats ? `${stats.getTime()}` : `${Date.now()}`
        },
        getScriptSnapshot(filePath) {
            const fileContents = sys.readFile(filePath)
            return fileContents !== undefined ? ts.ScriptSnapshot.fromString(fileContents) : undefined
        },
        getDefaultLibFileName: ts.getDefaultLibFilePath,
        useCaseSensitiveFileNames: () => sys.useCaseSensitiveFileNames,
        getCustomTransformers: customTransformers ? () => customTransformers : undefined,
        getNewLine: () => targetNewLine
    }
}

export function createCustomFsLanguageServiceHost(
    baseHost: IBaseHost,
    fileNames: string[],
    compilerOptions: ts.CompilerOptions,
    customFs: ICustomFs,
    customTransformers?: ts.CustomTransformers,
): ts.LanguageServiceHost {
    const { statSync, readFileSync, join, defaultLibsDirectory, caseSensitive } = customFs
    const targetNewLine = ts.getNewLineCharacter(compilerOptions, baseHost.getNewLine)

    return {
        ...baseHost,
        getCompilationSettings: () => compilerOptions,
        getScriptFileNames: () => fileNames,
        getScriptVersion(filePath) {
            const stats = statSync(filePath)
            return stats ? `${stats.mtime.getTime()}` : `${Date.now()}`
        },
        getScriptSnapshot(filePath) {
            const fileContents = readFileSync(filePath)
            return fileContents ? ts.ScriptSnapshot.fromString(fileContents) : undefined
        },
        getDefaultLibFileName: options => join(defaultLibsDirectory, ts.getDefaultLibFileName(options)),
        useCaseSensitiveFileNames: () => caseSensitive,
        getCustomTransformers: customTransformers ? () => customTransformers : undefined,
        getNewLine: () => targetNewLine
    }
}
