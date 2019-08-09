import ts from 'typescript';

export interface ITranspilationOptions {
    /**
     * TypeScript configuration file name. Used when looking up configurations.
     * Passing in a function allows customizing the config per directory.
     *
     * @default 'tsconfig.json'
     */
    configFileName?: string | ((directoryPath: string) => string);

    /**
     * Configuration file lookup (when no loaded config is relevant).
     * Process will search for the closest config file to the currently transpiled
     * file, and load it.
     *
     * @default true
     */
    configLookup?: boolean;

    /**
     * Perform type check, if possible (config is available and targets the file).
     *
     * @default true
     */
    typeCheck?: boolean;

    /**
     * Provided callback should return the final resolved compiler options.
     *
     * @param tsconfigOptions user's own tsconfig options, if found.
     */
    getCompilerOptions(
        baseHost: IBaseHost,
        tsconfigOptions?: Readonly<ts.CompilerOptions>
    ): Readonly<ts.CompilerOptions>;

    /**
     * This can be provided so that hosts are built around a custom fs.
     * See `createCustomBaseHost`.
     *
     * @default createBaseHost()
     */
    getBaseHost?(): IBaseHost;

    /**
     * Transformers to apply during transpilation.
     *
     * @param tsconfigOptions user's own tsconfig options, if found
     */
    getCustomTransformers?(
        baseHost: IBaseHost,
        tsconfigOptions?: Readonly<ts.CompilerOptions>
    ): ts.CustomTransformers | undefined;
}

/**
 * Minimum native APIs and information required for service functionality.
 */
export interface ICustomFs {
    /**
     * Whether paths are case-sensitive.
     */
    caseSensitive: boolean;

    /**
     * Absolute path to the directory where typescript's
     * lib `.d.ts` files reside.
     */
    defaultLibsDirectory: string;

    /**
     * Read contents of the file pointed to by `path` and return its
     * string representation (using `encoding` to decode the text).
     *
     * Default encoding is 'utf8'.
     * @throws if file doesn't exist or error.
     */
    readFileSync(path: string, encoding?: string): string;

    /**
     * Get base names of files and directories inside `path`.
     */
    readdirSync(path: string): string[];

    /**
     * Get stats of `path`.
     *
     * @throws if path doesn't exist or error.
     */
    statSync(path: string): { mtime: Date; isFile(): boolean; isDirectory(): boolean };

    /**
     * Optional. Returns the real path of a provided `path`.
     * Used to resolve the original path of symlinks.
     */
    realpathSync?(path: string): string;

    /**
     * Returns the directory name of a path.
     */
    dirname(path: string): string;

    /**
     * Normalizes the given `path`, resolving `..` and `.` segments.
     */
    normalize(path: string): string;

    /**
     * Join all path segments together and normalize the resulting path.
     */
    join(...pathSegments: string[]): string;

    /**
     * Returns the current working directory path.
     */
    getCurrentDirectory(): string;
}

export interface ITranspilationOutput {
    /** Absolute file path to the input typescript file */
    filePath: string;

    /** transpiled JavaScript code */
    outputText: string;

    /** optional, separate source-maps (stringified JSON) */
    sourceMapText?: string;

    /** Transpilation process diagnostics  */
    diagnostics?: ts.Diagnostic[];

    /** Host used during transpilation. Useful for formatting diagnostics.  */
    baseHost: IBaseHost;

    /** Resolved module requests, if possible to extract */
    resolvedModules?: Map<string, ts.ResolvedModuleFull | undefined>;
}

/**
 * Same as `ts.LanguageServiceHost`, but without:
 * - `useCaseSensitiveFileNames` - conflicts with `ts.ParseConfigHost` (where it's not a function).
 * - `getCompilerOptions`/`getScriptFileNames` - require parsing of a tsconfig.
 */
export type ParitalLanguageService = Pick<
    ts.LanguageServiceHost,
    Exclude<keyof ts.LanguageServiceHost, 'useCaseSensitiveFileNames' | 'getCompilationSettings' | 'getScriptFileNames'>
>;

/**
 * Combines all required functionality for parsing config files,
 * formatting diagnostics, and resolving modules.
 */
export interface IBaseHost
    extends ts.ParseConfigHost,
        ts.FormatDiagnosticsHost,
        ts.ModuleResolutionHost,
        ParitalLanguageService {
    fileExists(path: string): boolean;
    readFile(path: string, encoding?: string): string | undefined;
    readDirectory(
        path: string,
        extensions?: ReadonlyArray<string>,
        exclude?: ReadonlyArray<string>,
        include?: ReadonlyArray<string>,
        depth?: number
    ): string[];
    getCurrentDirectory(): string;
    directoryExists(directoryPath: string): boolean;
    getDirectories(path: string): string[];
    getNewLine(): string;

    dirname(path: string): string;
    normalize(path: string): string;
}

/**
 * Contains information about managed lanaguage service.
 */
export interface IParsedConfig {
    /**
     * Absolute path to the config file.
     */
    configFilePath: string;

    /**
     * Compiler options, as specified by the config file.
     */
    compilerOptions: ts.CompilerOptions;

    /**
     * Raw list of file paths returned when parsing the `tsconfig.json`.
     */
    rootFileNames: string[];

    /**
     * A set containing `rootFileNames` normalized using `baseHost.normalize`.
     */
    normalizedFileNames: Set<string>;

    /**
     * The matching `baseHost` for the `lanuageService`. Reference is kept for formatting diagnostics.
     */
    baseHost: IBaseHost;
}
