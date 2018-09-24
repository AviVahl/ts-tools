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

export interface ITypeScriptServiceOptions {
    host: ITypeScriptServiceHost

    /**
     * TypeScript configuration file name.
     *
     * @default 'tsconfig.json'
     */
    tsconfigFileName?: string,

    /**
     * Compiler options to use when transpiling files using tsconfig.
     * Overrides options defined in `tsconfig.json` files.
     *
     * @default {}
     */
    overrideOptions?: ts.CompilerOptions

    /**
     * Default compiler options to use when no tsconfig is found.
     *
     * @default {}
     */
    noConfigOptions?: ts.CompilerOptions

    /**
     * Transformers to apply during transpilation
     */
    customTransformers?: ts.CustomTransformers
}

const defaultOptions = {
    tsconfigFileName: 'tsconfig.json',
    overrideOptions: {},
    noConfigOptions: {},
    customTransformers: {}
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

/**
 * On-demand TypeScript tranpilation service
 * Options can be provided during construction
 *
 * @example
 * new TypeScriptService()
 * new TypeScriptService({ tsconfigFileName: 'tsconfig.test.json' })
 */
export class TypeScriptService {
    // resolved options used by the service
    public options: Required<ITypeScriptServiceOptions>

    // a map holding `tsconfig path` to a `language service` instance
    public runningServices = new Map<string, ts.LanguageService>()

    // we might create more than a single language service per service, so we share documents between them
    private documentRegistry: ts.DocumentRegistry

    // cache of `directory path` to `tsconfig lookup result`, to save disk operations
    private directoryToTsConfig = new Map<string, string | undefined>()

    constructor(options: ITypeScriptServiceOptions) {
        this.options = { ...defaultOptions, ...options }

        const { useCaseSensitiveFileNames, getCurrentDirectory } = this.options.host
        this.documentRegistry = ts.createDocumentRegistry(
            useCaseSensitiveFileNames,
            getCurrentDirectory()
        )
    }

    /**
     * Load a `tsconfig.json` file by providing a path to it.
     * A language service will be registered for th
     * @param configFilePath absolute path to the configuration file (usually `tsconfig.json`)
     */
    public loadConfigFile(
        configFilePath: string
    ): {
            diagnostics: ts.Diagnostic[],
            fileNames: string[],
            options: ts.CompilerOptions,
            languageService: ts.LanguageService
        } {

        const { host, overrideOptions } = this.options
        const jsonSourceFile = ts.readJsonConfigFile(configFilePath, host.readFile)
        const configDirectoryPath = host.dirname(configFilePath)

        const { fileNames: originalFileNames, options, errors: diagnostics } =
            ts.parseJsonSourceFileConfigFileContent(jsonSourceFile, host, configDirectoryPath)

        const fileNames = originalFileNames.map(host.normalize)

        // create the host
        const languageServiceHost = this.createLanguageServiceHost(fileNames, {
            ...options,
            ...overrideOptions
        })

        // create the language service using the host
        const languageService = ts.createLanguageService(languageServiceHost, this.documentRegistry)

        // register it in our running services
        this.runningServices.set(configFilePath, languageService)

        return {
            diagnostics,
            fileNames,
            options,
            languageService
        }
    }

    /**
     * Transpile a TypeScript file on the native file system
     *
     * @param filePath absolute path of the source file to transpile
     */
    public transpileFile(filePath: string): ITranspilationOutput {
        for (const existingLanguageService of this.runningServices.values()) {
            const program = existingLanguageService.getProgram()
            if (program && program.getRootFileNames().includes(filePath)) {
                return this.transpileUsingLanguageService(filePath, existingLanguageService)
            }
        }

        const fileDirectoryPath = this.options.host.dirname(filePath)
        const tsConfigPath = this.getTsConfigPath(fileDirectoryPath)

        if (!tsConfigPath) {
            return this.transpileUsingDefaultOptions(filePath)
        }

        const { fileNames, diagnostics, languageService } = this.loadConfigFile(tsConfigPath)

        if (diagnostics.length) {
            return {
                diagnostics,
                filePath,
                outputText: ''
            }
        }

        // verify the new service includes our file
        if (fileNames.includes(filePath)) {
            return this.transpileUsingLanguageService(filePath, languageService)
        }

        return this.transpileUsingDefaultOptions(filePath)
    }

    private transpileUsingLanguageService(
        filePath: string,
        languageService: ts.LanguageService
    ): ITranspilationOutput {
        const { outputFiles, emitSkipped } = languageService.getEmitOutput(filePath)

        if (emitSkipped) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic('Emit was skipped')
                ],
                outputText: ''
            }
        }

        const jsOutputFile = outputFiles.filter(outputFile => outputFile.name.endsWith('.js')).shift()

        if (!jsOutputFile) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic('No js output file was found')
                ],
                outputText: ''
            }
        }
        const sourceMapOutputFile = outputFiles.filter(outputFile => outputFile.name.endsWith('.js.map')).shift()
        const sourceMapText = sourceMapOutputFile && sourceMapOutputFile.text
        const syntacticDiagnostics = languageService.getSyntacticDiagnostics(filePath)

        if (syntacticDiagnostics.length) {
            return {
                diagnostics: syntacticDiagnostics,
                filePath,
                outputText: jsOutputFile.text,
                sourceMapText
            }
        }

        const semanticDiagnostics = languageService.getSemanticDiagnostics(filePath)
        if (semanticDiagnostics.length) {
            return {
                diagnostics: semanticDiagnostics,
                filePath,
                outputText: jsOutputFile.text,
                sourceMapText
            }
        }

        return {
            filePath,
            outputText: jsOutputFile.text,
            sourceMapText
        }
    }

    private transpileUsingDefaultOptions(
        filePath: string
    ): ITranspilationOutput {
        const { host, noConfigOptions: compilerOptions, customTransformers: transformers } = this.options

        const tsCode = host.readFile(filePath)
        if (!tsCode) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic(`Unable to read ${filePath}`)
                ],
                outputText: ''
            }
        }

        const { outputText, diagnostics, sourceMapText } = ts.transpileModule(tsCode, {
            fileName: filePath,
            compilerOptions,
            transformers
        })

        return {
            filePath,
            outputText,
            sourceMapText,
            diagnostics
        }
    }

    /**
     * Find the closest `tsconfig.json` file to the provided baseDirectory
     *
     * @param baseDirectory the directory to start looking from
     */
    private getTsConfigPath(
        baseDirectory: string
    ): string | undefined {
        if (this.directoryToTsConfig.has(baseDirectory)) {
            return this.directoryToTsConfig.get(baseDirectory)
        }
        const tsConfigPath = ts.findConfigFile(
            baseDirectory,
            this.options.host.fileExists,
            this.options.tsconfigFileName
        )
        this.directoryToTsConfig.set(baseDirectory, tsConfigPath)
        return tsConfigPath
    }

    private createLanguageServiceHost(
        fileNames: string[],
        compilerOptions: ts.CompilerOptions
    ): ts.LanguageServiceHost {

        const { host, customTransformers } = this.options
        const {
            newLine,
            getModifiedTime,
            readFile,
            getCurrentDirectory,
            fileExists,
            directoryExists,
            readDirectory,
            getDefaultLibFilePath: getDefaultLibFileName,
            useCaseSensitiveFileNames,
            getDirectories,
            realpath
        } = host

        return {
            getCompilationSettings: () => compilerOptions,
            getNewLine: () => {
                switch (compilerOptions.newLine) {
                    case ts.NewLineKind.CarriageReturnLineFeed:
                        return '\r\n'
                    case ts.NewLineKind.LineFeed:
                        return '\n'
                    default:
                        return newLine
                }
            },
            getScriptFileNames: () => fileNames,
            getScriptVersion: filePath => {
                const modifiedTime = getModifiedTime(filePath)
                return modifiedTime ? modifiedTime.toString() : `${Date.now()}`
            },
            getScriptSnapshot: filePath => ts.ScriptSnapshot.fromString(readFile(filePath) || ''),
            getCurrentDirectory,
            getDefaultLibFileName,
            useCaseSensitiveFileNames: () => useCaseSensitiveFileNames,
            readDirectory,
            readFile,
            fileExists,
            directoryExists,
            getDirectories,
            realpath,
            getCustomTransformers: () => customTransformers
        }
    }

    private createErrorDiagnostic(messageText: string) {
        return {
            messageText,
            category: ts.DiagnosticCategory.Error,
            code: ts.DiagnosticCategory.Error,
            file: undefined,
            start: 0,
            length: undefined
        }
    }
}
