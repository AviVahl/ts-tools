import * as ts from 'typescript'
import { dirname, normalize } from 'path'
import { TranspilationError, TranspilationErrorType } from './errors'

/**
 * Options for Node TypeScript Extension.
 * Can be provided via constructor.
 *
 * @example new NodeTypeScriptExtension({sourceMaps: false})
 */
export interface INodeTypeScriptServiceOptions {
    /**
     * TypeScript configuration file name.
     *
     * @default 'tsconfig.json'
     */
    tsconfigFileName?: string,

    /**
     * Enable source maps during compilation and save them to memory cache.
     * this option overrides existing source maps configuration in tsconfigs
     *
     * @default true
     */
    sourceMap?: boolean

    /**
     * Preloaded configuration absolute file paths.
     *
     * When initializing, the extension will start a language service
     * per each configuration file.
     * This can save time of looking up tsconfig per file,
     * as it will reuse any existing language service already including the file
     *
     * @default []
     */
    preloaded?: string[]

    /**
     * Default compiler options to use when no tsconfig is found.
     */
    defaultCompilerOptions?: ts.CompilerOptions
}

export const defaultOptions: Required<INodeTypeScriptServiceOptions> = {
    tsconfigFileName: 'tsconfig.json',
    sourceMap: true,
    preloaded: [],

    // Node 8+ compatible default compiler options
    // used when no tsconfig is found, or if found config does not include the file being compiled
    defaultCompilerOptions: {
        target: ts.ScriptTarget.ES2017,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React, // opinionated
        moduleResolution: ts.ModuleResolutionKind.NodeJs
    }
}

export interface ITranspilationOutput {
    /** Absolute file path to the input .ts(x) file */
    inputFilePath: string

    /** JavaScript transpilation out */
    outputCode: string

    /** Defined if an Error occured during transpilation */
    error?: TranspilationError
}

export class NodeTypeScriptService {
    // resolved options used by the service
    public options: Required<INodeTypeScriptServiceOptions>

    // a map holding `file path` to its `matching source maps` (stringified JSON)
    public sourceMaps = new Map<string, string>()

    // a map holding `tsconfig path` to a `language service` instance
    public runningServices = new Map<string, ts.LanguageService>()

    // we might create more than a single language service per extension, so we share documents between them
    private sharedDocumentRegistry = ts.createDocumentRegistry(
        ts.sys.useCaseSensitiveFileNames,
        ts.sys.getCurrentDirectory()
    )

    // cache of `directory path` to `tsconfig lookup result`, to save disk operations
    private directoryToTsConfig = new Map<string, string | undefined>()

    // used for formatting diagnostics
    private defaultCompilerHost: ts.CompilerHost

    constructor(options?: INodeTypeScriptServiceOptions) {
        this.options = { ...defaultOptions, ...options }

        for (const preloadedTsConfigPath of this.options.preloaded) {
            this.createLanguageService(preloadedTsConfigPath)
        }
        // used for formatting diagnostics
        this.defaultCompilerHost = ts.createCompilerHost(this.options.defaultCompilerOptions)
    }

    /**
     * Transpile a file
     * @param filePath file path to transpile
     */
    public transpile(filePath: string): ITranspilationOutput {
        const languageService = this.getLanguageService(filePath)
        return languageService ?
            this.transpileUsingLanguageService(filePath, languageService) :
            this.transpileUsingDefaultOptions(filePath)
    }

    private transpileUsingLanguageService(
        filePath: string,
        languageService: ts.LanguageService
    ): ITranspilationOutput {
        const { outputFiles, emitSkipped } = languageService.getEmitOutput(filePath)

        if (emitSkipped) {
            return {
                inputFilePath: filePath,
                error: new TranspilationError(
                    TranspilationErrorType.TRANSPILATION,
                    filePath,
                    `Emit was skipped`
                ),
                outputCode: ''
            }
        }

        const jsOutputFile = outputFiles.filter(outputFile => outputFile.name.endsWith('.js')).shift()
        const sourceMapOutputFile = outputFiles.filter(outputFile => outputFile.name.endsWith('.js.map')).shift()

        if (!jsOutputFile) {
            return {
                inputFilePath: filePath,
                error: new TranspilationError(
                    TranspilationErrorType.TRANSPILATION,
                    filePath,
                    `No js output file was found`
                ),
                outputCode: ''
            }
        }

        const syntacticDiagnostics = languageService.getSyntacticDiagnostics(filePath)
        if (syntacticDiagnostics.length) {
            const formattedDiagnostics = ts.formatDiagnostics(syntacticDiagnostics, this.defaultCompilerHost)
            return {
                error: new TranspilationError(
                    TranspilationErrorType.SYNTACTIC,
                    filePath,
                    formattedDiagnostics,
                    syntacticDiagnostics
                ),
                inputFilePath: filePath,
                outputCode: jsOutputFile.text
            }
        }

        const semanticDiagnostics = languageService.getSemanticDiagnostics(filePath)
        if (semanticDiagnostics.length) {
            const formattedDiagnostics = ts.formatDiagnostics(semanticDiagnostics, this.defaultCompilerHost)
            return {
                error: new TranspilationError(
                    TranspilationErrorType.SEMANTIC,
                    filePath,
                    formattedDiagnostics,
                    semanticDiagnostics
                ),
                inputFilePath: filePath,
                outputCode: jsOutputFile.text
            }
        }

        if (this.options.sourceMap && sourceMapOutputFile) {
            this.sourceMaps.set(filePath, sourceMapOutputFile.text)
        } else {
            this.sourceMaps.delete(filePath)
        }

        return {
            inputFilePath: filePath,
            outputCode: jsOutputFile.text
        }
    }

    private transpileUsingDefaultOptions(
        filePath: string
    ): ITranspilationOutput {
        const tsCode = ts.sys.readFile(filePath)
        if (!tsCode) {
            throw new Error(`Unable to read ${filePath}`)
        }
        const { outputText, diagnostics, sourceMapText } = ts.transpileModule(tsCode, {
            fileName: filePath,
            compilerOptions: { ...this.options.defaultCompilerOptions, sourceMap: this.options.sourceMap }
        })

        if (diagnostics && diagnostics.length) {
            const formattedDiagnostics = ts.formatDiagnostics(diagnostics, this.defaultCompilerHost)
            return {
                inputFilePath: filePath,
                outputCode: outputText,
                error: new TranspilationError(
                    TranspilationErrorType.TRANSPILATION,
                    filePath,
                    formattedDiagnostics
                )
            }
        }

        if (this.options.sourceMap && sourceMapText) {
            this.sourceMaps.set(filePath, sourceMapText)
        } else {
            this.sourceMaps.delete(filePath)
        }

        return {
            inputFilePath: filePath,
            outputCode: outputText
        }
    }

    private getLanguageService(
        filePath: string
    ): ts.LanguageService | null {
        for (const existingLanguageService of this.runningServices.values()) {
            if (existingLanguageService.getProgram().getRootFileNames().includes(filePath)) {
                return existingLanguageService
            }
        }

        const fileDirectoryPath = dirname(filePath)
        const tsConfigPath = this.getTsConfigPath(fileDirectoryPath)

        // couldn't find a tsconfig, or there is one that didn't include our file
        if (!tsConfigPath || this.runningServices.has(tsConfigPath)) {
            return null
        }

        const languageService = this.createLanguageService(tsConfigPath)

        // verify the new service includes our file
        if (languageService.getProgram().getRootFileNames().includes(filePath)) {
            return languageService
        } else {
            return null
        }
    }

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

    private createLanguageService(tsConfigPath: string): ts.LanguageService {
        const jsonSourceFile = ts.readJsonConfigFile(tsConfigPath, ts.sys.readFile)
        const configDirectoryPath = dirname(tsConfigPath)
        const { fileNames, options, errors } =
            ts.parseJsonSourceFileConfigFileContent(jsonSourceFile, ts.sys, configDirectoryPath)

        if (errors.length) {
            const compilerHost = ts.createCompilerHost(options)
            throw new Error(`Errors while parsing ${tsConfigPath}\n${ts.formatDiagnostics(errors, compilerHost)}`)
        }

        // Force CommonJS, as we are in Node
        options.module = ts.ModuleKind.CommonJS

        // Force no declarations as they are not used. We lose declaration-specific validations, but gain better speed.
        options.declaration = false
        options.declarationMap = false

        // override source maps configuration
        options.sourceMap = this.options.sourceMap
        options.inlineSourceMap = options.inlineSources = false

        const languageServiceHost = this.createLanguageServiceHost(fileNames.map(normalize), options)
        const languageService = ts.createLanguageService(languageServiceHost, this.sharedDocumentRegistry)

        this.runningServices.set(tsConfigPath, languageService)
        return languageService
    }

    private createLanguageServiceHost(
        fileNames: string[],
        compilerOptions: ts.CompilerOptions
    ): ts.LanguageServiceHost {

        const getScriptVersion = (filePath: string): string => {
            const modifiedTime = ts.sys.getModifiedTime ? ts.sys.getModifiedTime(filePath) : null
            return modifiedTime ? modifiedTime.getTime().toString() : `${Date.now()}`
        }

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
            getScriptVersion,
            getScriptSnapshot: filePath => ts.ScriptSnapshot.fromString(ts.sys.readFile(filePath) || ''),
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getDefaultLibFileName: ts.getDefaultLibFilePath,
            useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
            readDirectory: ts.sys.readDirectory,
            readFile: ts.sys.readFile,
            fileExists: ts.sys.fileExists,
            directoryExists: ts.sys.directoryExists,
            getDirectories: ts.sys.getDirectories,
            realpath: ts.sys.realpath
        }
    }
}
