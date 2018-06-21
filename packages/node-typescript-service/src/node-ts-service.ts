import * as ts from 'typescript'
import { dirname, normalize } from 'path'

export interface INodeTypeScriptServiceOptions {
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

const defaultOptions: Required<INodeTypeScriptServiceOptions> = {
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
 * new NodeTypeScriptService()
 * new NodeTypeScriptService({tsconfigFileName: 'tsconfig.test.json'})
 */
export class NodeTypeScriptService {
    // resolved options used by the service
    public options: Required<INodeTypeScriptServiceOptions>

    // a map holding `tsconfig path` to a `language service` instance
    public runningServices = new Map<string, ts.LanguageService>()

    // we might create more than a single language service per service, so we share documents between them
    private sharedDocumentRegistry = ts.createDocumentRegistry(
        ts.sys.useCaseSensitiveFileNames,
        ts.sys.getCurrentDirectory()
    )

    // cache of `directory path` to `tsconfig lookup result`, to save disk operations
    private directoryToTsConfig = new Map<string, string | undefined>()

    constructor(options?: INodeTypeScriptServiceOptions) {
        this.options = { ...defaultOptions, ...options }
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
        const jsonSourceFile = ts.readJsonConfigFile(configFilePath, ts.sys.readFile)
        const configDirectoryPath = dirname(configFilePath)
        const { fileNames: originalFileNames, options, errors: diagnostics } =
            ts.parseJsonSourceFileConfigFileContent(jsonSourceFile, ts.sys, configDirectoryPath)

        const fileNames = originalFileNames.map(normalize)

        // create the host
        const languageServiceHost = this.createLanguageServiceHost(fileNames, {
            ...options,
            ...this.options.overrideOptions
        })

        // create the language service using the host
        const languageService = ts.createLanguageService(languageServiceHost, this.sharedDocumentRegistry)

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
            if (existingLanguageService.getProgram().getRootFileNames().includes(filePath)) {
                return this.transpileUsingLanguageService(filePath, existingLanguageService)
            }
        }

        const fileDirectoryPath = dirname(filePath)
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
        const tsCode = ts.sys.readFile(filePath)
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
            compilerOptions: this.options.noConfigOptions,
            transformers: this.options.customTransformers
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
        const tsConfigPath = ts.findConfigFile(baseDirectory, ts.sys.fileExists, this.options.tsconfigFileName)
        this.directoryToTsConfig.set(baseDirectory, tsConfigPath)
        return tsConfigPath
    }

    private createLanguageServiceHost(
        fileNames: string[],
        compilerOptions: ts.CompilerOptions
    ): ts.LanguageServiceHost {
        return {
            getCompilationSettings: () => compilerOptions,
            getNewLine: () => {
                switch (compilerOptions.newLine) {
                    case ts.NewLineKind.CarriageReturnLineFeed:
                        return '\r\n'
                    case ts.NewLineKind.LineFeed:
                        return '\n'
                    default:
                        return ts.sys.newLine
                }
            },
            getScriptFileNames: () => fileNames,
            getScriptVersion: ts.sys.getModifiedTime ?
                filePath => ts.sys.getModifiedTime!(filePath).getTime().toString() :
                () => `${Date.now()}`,
            getScriptSnapshot: filePath => ts.ScriptSnapshot.fromString(ts.sys.readFile(filePath) || ''),
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getDefaultLibFileName: ts.getDefaultLibFilePath,
            useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
            readDirectory: ts.sys.readDirectory,
            readFile: ts.sys.readFile,
            fileExists: ts.sys.fileExists,
            directoryExists: ts.sys.directoryExists,
            getDirectories: ts.sys.getDirectories,
            realpath: ts.sys.realpath,
            getCustomTransformers: () => this.options.customTransformers
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
