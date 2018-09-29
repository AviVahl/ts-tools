import * as ts from 'typescript'

export interface ITypeScriptServiceHost {
    /**
     * Absolute path to the current working directory.
     */
    cwd: string

    /**
     * newLine character(s) of host
     */
    newLine: string

    /**
     * Whether host's paths are case-sensitive.
     */
    isCaseSensitive: boolean

    /**
     * Check whether `path` points to a file
     */
    fileExistsSync(path: string): boolean

    /**
     * Check whether `path` points to a directory
     */
    directoryExistsSync(path: string): boolean

    /**
     * Read contents of the file pointed to by `path` and return its
     * string representation (using `encoding` to decode the text).
     *
     * Default encoding is 'utf8'.
     * If file doesn't exist, return `undefined`.
     */
    readFileSync(path: string, encoding?: string): string | undefined

    /**
     * Get names of directories inside `path`.
     */
    readdirSync(path: string): string[]

    /**
     * Get modfied time of `path`.
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
     * Optional. Returns the real path of a provided `path`.
     * Used to resolve the original path of symlinks.
     */
    realpathSync?(path: string): string

    readDirectory(
        rootDir: string,
        extensions: ReadonlyArray<string>,
        excludes: ReadonlyArray<string> | undefined,
        includes: ReadonlyArray<string>,
        depth?: number
    ): string[]
}

export interface ITranspilationOutput {
    /** Absolute file path to the input typescript file */
    filePath: string

    /** transpiled JavaScript code */
    outputText: string

    /** optional, separate source-maps (stringified JSON) */
    sourceMapText?: string

    /** Transpilation process diagnostics  */
    diagnostics?: ts.Diagnostic[]
}

export interface ILanguageServiceInstance {
    languageService: ts.LanguageService
    rootFileNames: ReadonlySet<string>
}
