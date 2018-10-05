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
    const { isCaseSensitive, statSync, readFileSync, readdirSync, join, dirname, normalize } = customFs

    function getFileSystemEntries(path: string): { files: string[], directories: string[] } {
        const files: string[] = []
        const directories: string[] = []

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
        return { files, directories }
    }

    return {
        readDirectory(rootDir, extensions, excludes, includes, depth) {
            return ts.matchFiles(
                rootDir, extensions, excludes, includes, isCaseSensitive, rootDir, depth, getFileSystemEntries
            )
        },
        getDirectories(path) {
            return getFileSystemEntries(path).directories
        },
        fileExists(path) {
            const stats = statSync(path)
            return !!stats && stats.isFile()
        },
        directoryExists(path) {
            const stats = statSync(path)
            return !!stats && stats.isDirectory()
        },
        readFile(path) {
            return readFileSync(path, 'utf8')
        },
        useCaseSensitiveFileNames: isCaseSensitive,
        getCanonicalFileName: isCaseSensitive ? identity : toLowerCase,
        getCurrentDirectory: () => cwd,
        getNewLine: () => ts.sys.newLine,
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
            return fileContents ? ts.ScriptSnapshot.fromString(fileContents) : undefined
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
    const { statSync, readFileSync, join, defaultLibsDirectory, isCaseSensitive } = customFs
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
        useCaseSensitiveFileNames: () => isCaseSensitive,
        getCustomTransformers: customTransformers ? () => customTransformers : undefined,
        getNewLine: () => targetNewLine
    }
}
