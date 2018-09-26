import * as ts from 'typescript'

export interface ITypeScriptServiceHost {
    /**
     * Default newLine character(s) for the current host
     */
    newLine: string

    /**
     * Whether the host's fs is case-sensitive
     */
    useCaseSensitiveFileNames: boolean

    /**
     * Check whether `path` points to a file
     */
    fileExists(path: string): boolean

    /**
     * Check whether `path` points to a directory
     */
    directoryExists(path: string): boolean

    /**
     * Read contents of the file pointed to by `path` and return its
     * string representation (using `encoding` to decode the text).
     *
     * Default encoding is 'utf8'.
     * If file doesn't exist, return `undefined`.
     */
    readFile(path: string, encoding?: string): string | undefined
    readDirectory(
        rootDir: string,
        extensions: ReadonlyArray<string>,
        excludes: ReadonlyArray<string> | undefined,
        includes: ReadonlyArray<string>,
        depth?: number
    ): string[]

    /**
     * Get names of directories inside `path`.
     */
    getDirectories(path: string): string[]

    /**
     * Get modfied time of `path`.
     *
     * If path doesn't exist, return `undefined`.
     */
    getModifiedTime(path: string): Date | undefined

    /**
     * Returns the directory name of a path.
     */
    dirname(path: string): string,

    /**
     * Normalizes the given `path`, resolving `..` and `.` segments.
     */
    normalize(path: string): string

    /**
     * Returns absolute path to the default global lib .d.ts per provided `options`.
     */
    getDefaultLibFilePath(options: ts.CompilerOptions): string

    /**
     * Returns absolute path to the current working directory.
     */
    getCurrentDirectory(): string

    /**
     * Optional. Returns the real path of a provided `path`.
     * Used to resolve the original path of symlinks.
     */
    realpath?(path: string): string
}
