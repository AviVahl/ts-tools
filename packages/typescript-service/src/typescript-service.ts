import * as ts from 'typescript'
import { ITypeScriptServiceHost, ITranspilationOutput, ILanguageServiceInstance } from './types'

export interface ITypeScriptServiceOptions {
    /**
     * TypeScript configuration file name.
     *
     * @default 'tsconfig.json'
     */
    tsconfigFileName?: string

    /**
     * Transformers to apply during transpilation.
     *
     * @param userOptions user's own tsconfig options, if found
     */
    getCustomTransformers?(
        userOptions?: ts.CompilerOptions
    ): ts.CustomTransformers | undefined
}

export interface ITranspilationOptions {
    /**
     * Compiler options to override when transpiling files using
     * found `tsconfig.json`.
     */
    tsConfigOverride?: ts.CompilerOptions

    /**
     * Compiler options to use when no tsconfig is found.
     */
    noConfigOptions?: ts.CompilerOptions
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
    public serviceOptions: ITypeScriptServiceOptions

    // a map holding `tsconfig path` to a `language service instance`
    public runningServices = new Map<string, ILanguageServiceInstance>()

    // we might create more than a single language service per service, so we share documents between them
    private documentRegistry: ts.DocumentRegistry

    // cache of `directory path` to `tsconfig lookup result`, to save disk operations
    private directoryToTsConfig = new Map<string, string | undefined>()

    constructor(private host: ITypeScriptServiceHost, options?: ITypeScriptServiceOptions) {
        this.serviceOptions = { tsconfigFileName: 'tsconfig.json', ...options }

        const { useCaseSensitiveFileNames, getCurrentDirectory } = this.host
        this.documentRegistry = ts.createDocumentRegistry(useCaseSensitiveFileNames, getCurrentDirectory())
    }

    /**
     * Transpile a TypeScript file on the native file system
     *
     * @param filePath absolute path of the source file to transpile
     */
    public transpileFile(
        filePath: string,
        { noConfigOptions, tsConfigOverride }: ITranspilationOptions = {}
    ): ITranspilationOutput {
        for (const existingInstance of this.runningServices.values()) {
            if (existingInstance.rootFileNames.has(filePath)) {
                return this.transpileUsingLanguageService(filePath, existingInstance.languageService)
            }
        }

        const fileDirectoryPath = this.host.dirname(filePath)
        const configFilePath = this.getTsConfigPath(fileDirectoryPath)

        if (!configFilePath) {
            return this.transpileIsolated(filePath, noConfigOptions)
        }
        const { errors, fileNames, options: userOptions } = this.loadConfigFile(configFilePath)

        if (errors.length) {
            return {
                diagnostics: errors,
                filePath,
                outputText: ''
            }
        }

        const resolvedOptions: ts.CompilerOptions = { ...userOptions, ...tsConfigOverride }
        const { getCustomTransformers } = this.serviceOptions
        const customTransformers = getCustomTransformers && getCustomTransformers(userOptions)

        const languageServiceHost = this.createLanguageServiceHost(fileNames, resolvedOptions, customTransformers)
        const languageService = ts.createLanguageService(languageServiceHost, this.documentRegistry)

        const rootFileNames = new Set(fileNames.map(this.host.normalize))

        // register it in our running services
        this.runningServices.set(configFilePath, { languageService, rootFileNames })

        if (rootFileNames.has(filePath)) {
            return this.transpileUsingLanguageService(filePath, languageService)
        }

        return this.transpileIsolated(filePath, noConfigOptions)
    }

    /**
     * Load a tsconfig file pointed to by `configFilePath`.
     *
     * @param configFilePath absolute path to the configuration file
     */
    private loadConfigFile(configFilePath: string): ts.ParsedCommandLine {
        const { host } = this
        const jsonSourceFile = ts.readJsonConfigFile(configFilePath, host.readFile)
        const configDirectoryPath = host.dirname(configFilePath)
        return ts.parseJsonSourceFileConfigFileContent(jsonSourceFile, host, configDirectoryPath)
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

    private transpileIsolated(
        filePath: string,
        compilerOptions?: ts.CompilerOptions
    ): ITranspilationOutput {
        const tsCode = this.host.readFile(filePath)
        if (!tsCode) {
            return {
                filePath,
                diagnostics: [
                    this.createErrorDiagnostic(`Unable to read ${filePath}`)
                ],
                outputText: ''
            }
        }
        const { getCustomTransformers } = this.serviceOptions
        const { outputText, diagnostics, sourceMapText } = ts.transpileModule(tsCode, {
            fileName: filePath,
            compilerOptions,
            transformers: getCustomTransformers && getCustomTransformers()
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
        const { tsconfigFileName } = this.serviceOptions
        const tsConfigPath = ts.findConfigFile(baseDirectory, this.host.fileExists, tsconfigFileName)
        this.directoryToTsConfig.set(baseDirectory, tsConfigPath)
        return tsConfigPath
    }

    private createLanguageServiceHost(
        fileNames: string[],
        compilerOptions: ts.CompilerOptions,
        customTransformers?: ts.CustomTransformers
    ): ts.LanguageServiceHost {

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
        } = this.host

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
