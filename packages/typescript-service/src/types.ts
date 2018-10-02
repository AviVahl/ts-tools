import ts from 'typescript'

/**
 * Minimum native APIs and information required for service functionality.
 */
export interface ICustomFs {
    /**
     * Whether paths are case-sensitive.
     */
    isCaseSensitive: boolean

    /**
     * Absolute path to the directory where typescript's
     * lib `.d.ts` files reside.
     */
    defaultLibsDirectory: string

    /**
     * Read contents of the file pointed to by `path` and return its
     * string representation (using `encoding` to decode the text).
     *
     * Default encoding is 'utf8'.
     * If file doesn't exist, return `undefined`.
     */
    readFileSync(path: string, encoding?: string): string | undefined

    /**
     * Get base names of files and directories inside `path`.
     */
    readdirSync(path: string): string[]

    /**
     * Get stats of `path`. Returns `undefined` if path doesn't exist or error.
     */
    statSync(path: string): { mtime: Date, isFile(): boolean, isDirectory(): boolean } | undefined

    /**
     * Optional. Returns the real path of a provided `path`.
     * Used to resolve the original path of symlinks.
     */
    realpathSync?(path: string): string

    /**
     * Returns the directory name of a path.
     */
    dirname(path: string): string

    /**
     * Normalizes the given `path`, resolving `..` and `.` segments.
     */
    normalize(path: string): string

    /**
     * Join all path segments together and normalize the resulting path.
     */
    join(...pathSegments: string[]): string
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

    /** Host used during transpilation. Useful for formatting diagnostics.  */
    baseHost: IBaseHost
}

/**
 * Combines all required functionality for parsing config files,
 * formatting diagnostics, and resolving modules.
 */
export interface IBaseHost extends ts.ParseConfigHost, ts.FormatDiagnosticsHost, ts.ModuleResolutionHost {
    getCurrentDirectory(): string
    directoryExists(directoryPath: string): boolean
    getDirectories(path: string): string[]

    dirname(path: string): string
    normalize(path: string): string
}

/**
 * Contains information about managed lanaguage service.
 */
export interface ILanguageServiceInstance {
    /**
     * Instance of the actual typescript language service.
     * Used to transpile files and get diagnostics.
     */
    languageService: ts.LanguageService

    /**
     * Absolute file paths returned when parsing the `tsconfig.json`.
     * Upon transpilation request, this field is used to search for an existing, already instanciated, language service.
     * All paths are normalized using `baseHost.normalize`.
     */
    rootFileNames: ReadonlySet<string>

    /**
     * The matching `baseHost` for the `lanuageService`. Reference is kept for formatting diagnostics.
     */
    baseHost: IBaseHost
}
